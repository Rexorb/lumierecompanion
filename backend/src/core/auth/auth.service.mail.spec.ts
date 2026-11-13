import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { MailService } from './services/mail.service';

describe('AuthService: recuperação sem enumerar conta', () => {
  const user = {
    id: 'usuario-teste',
    email: 'conta@exemplo.invalid',
    tokenReset: 'token-de-teste',
    tokenResetExpira: new Date(Date.now() + 60_000),
  };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const mail = { isAvailable: jest.fn(), sendPasswordResetLink: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as JwtService,
    mail as unknown as MailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usuario.findUnique.mockResolvedValue(user);
    prisma.usuario.update.mockResolvedValue(user);
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    mail.isAvailable.mockReturnValue(true);
    mail.sendPasswordResetLink.mockResolvedValue({});
  });

  it('sem serviço e com conta existente não cria nem tenta enviar token', async () => {
    mail.isAvailable.mockReturnValue(false);
    const response = await service.forgotPassword({ email: user.email });
    expect(response.message).toEqual(expect.any(String));
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetLink).not.toHaveBeenCalled();
  });

  it('com serviço envia link e mantém resposta idêntica para e-mail inexistente', async () => {
    const known = await service.forgotPassword({ email: user.email });
    const updateCall: unknown = prisma.usuario.update.mock.calls[0];
    const [update] = updateCall as [
      {
        where: { id: string };
        data: { tokenReset: string; tokenResetExpira: Date };
      },
    ];
    expect(update.where.id).toBe(user.id);
    expect(update.data.tokenReset).toEqual(expect.any(String));
    expect(update.data.tokenResetExpira).toBeInstanceOf(Date);
    expect(mail.sendPasswordResetLink).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
    prisma.usuario.findUnique.mockResolvedValue(null);
    const unknown = await service.forgotPassword({
      email: 'desconhecido@exemplo.invalid',
    });
    expect(unknown).toEqual(known);
  });

  it('falha do provedor limpa somente token ainda vigente e não registra detalhes', async () => {
    const warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    mail.sendPasswordResetLink.mockRejectedValue(
      new Error('detalhes-sensiveis-simulados'),
    );
    await service.forgotPassword({ email: user.email });
    const updateCall: unknown = prisma.usuario.update.mock.calls[0];
    const [update] = updateCall as [{ data: { tokenReset: string } }];
    const token = update.data.tokenReset;
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: user.id, tokenReset: token },
      data: { tokenReset: null, tokenResetExpira: null },
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain(token);
    expect(JSON.stringify(warning.mock.calls)).not.toContain(
      'detalhes-sensiveis-simulados',
    );
    warning.mockRestore();
  });

  it('reset com token válido preserva hash; token inválido ou expirado é rejeitado', async () => {
    await service.resetPassword({
      email: user.email,
      token: user.tokenReset,
      senha: 'senha-atualizada-para-teste',
    });
    const updateCall: unknown = prisma.usuario.update.mock.calls[0];
    const [update] = updateCall as [{ data: { senha: string } }];
    const hash = update.data.senha;
    expect(await bcrypt.compare('senha-atualizada-para-teste', hash)).toBe(
      true,
    );
    await expect(
      service.resetPassword({
        email: user.email,
        token: 'incorreto',
        senha: 'outra-senha-de-teste',
      }),
    ).rejects.toThrow(UnauthorizedException);
    prisma.usuario.findUnique.mockResolvedValue({
      ...user,
      tokenResetExpira: new Date(0),
    });
    await expect(
      service.resetPassword({
        email: user.email,
        token: user.tokenReset,
        senha: 'outra-senha-de-teste',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
