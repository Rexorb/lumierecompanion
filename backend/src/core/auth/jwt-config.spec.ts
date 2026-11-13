import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { requireJwtSecret, validateJwtConfig } from './jwt-config';

describe('JWT_SECRET obrigatório no bootstrap', () => {
  const previous = process.env.JWT_SECRET;
  afterAll(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });

  it.each([undefined, '', '  ', 'curto', 'a'.repeat(48)])(
    'recusa segredo ausente, vazio ou inadequado',
    (value) => {
      expect(() => requireJwtSecret(value)).toThrow('JWT_SECRET');
    },
  );

  it('recusa inicialização de ConfigModule sem segredo', async () => {
    delete process.env.JWT_SECRET;
    await expect(
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        validate: validateJwtConfig,
      }),
    ).rejects.toThrow('JWT_SECRET');
  });

  it('aceita inicialização com segredo adequado sem retornar o valor em logs', async () => {
    process.env.JWT_SECRET =
      'segredo-de-teste-isolado-com-mais-de-32-caracteres';
    const configuration = await ConfigModule.forRoot({
      ignoreEnvFile: true,
      validate: validateJwtConfig,
    });
    const module = await Test.createTestingModule({
      imports: [configuration],
    }).compile();
    expect(module).toBeDefined();
    await module.close();
  });
});
