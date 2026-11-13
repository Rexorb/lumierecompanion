import { ConfigService } from '@nestjs/config';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';
import { MailService } from './mail.service';

jest.mock('resend', () => ({ Resend: jest.fn() }));

const send = jest.fn();
const config = (vars: Record<string, string>) =>
  ({ get: (key: string) => vars[key] }) as unknown as ConfigService;

describe('MailService com Resend opcional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Resend)
      .mockImplementation(() => ({ emails: { send } }) as unknown as Resend);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sem chave não instancia cliente; indisponibilidade é registrada sem segredo', async () => {
    const warning = jest.spyOn(Logger.prototype, 'warn');
    const service = new MailService(config({}));
    expect(service.isAvailable()).toBe(false);
    expect(Resend).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      'Recuperação de senha por e-mail indisponível neste ambiente',
    );
    await expect(
      service.sendPasswordResetLink(
        'conta@exemplo.invalid',
        'token-apenas-de-teste',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('com chave envia link do Web quando o provedor confirma a entrega', async () => {
    send.mockResolvedValue({ data: { id: 'id-teste' }, error: null });
    const service = new MailService(
      config({
        RESEND_API_KEY: 'chave-apenas-de-teste',
        APP_URL: 'https://exemplo.invalid',
        MAIL_FROM: 'noreply@exemplo.invalid',
      }),
    );
    expect(service.isAvailable()).toBe(true);
    await service.sendPasswordResetLink(
      'conta@exemplo.invalid',
      'token-apenas-de-teste',
    );
    const call: unknown = send.mock.calls[0];
    const [message] = call as [{ to: string[]; from: string; text: string }];
    expect(message.to).toEqual(['conta@exemplo.invalid']);
    expect(message.from).toBe('noreply@exemplo.invalid');
    expect(message.text).toContain(
      'https://exemplo.invalid/reset-password?token=token-apenas-de-teste',
    );
  });

  it('rejeita resposta de erro do provedor sem repassar detalhes sensíveis', async () => {
    send.mockResolvedValue({
      data: null,
      error: { message: 'dados sensíveis simulados' },
    });
    const service = new MailService(
      config({ RESEND_API_KEY: 'chave-apenas-de-teste' }),
    );
    await expect(
      service.sendPasswordResetLink(
        'conta@exemplo.invalid',
        'token-apenas-de-teste',
      ),
    ).rejects.toThrow('Falha no serviço de e-mail');
  });
});
