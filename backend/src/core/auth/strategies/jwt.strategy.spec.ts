// src/core/auth/strategies/jwt.strategy.spec.ts
// Cobre a correção 404→401: token válido de conta já EXCLUÍDA deve
// produzir UnauthorizedException (401) — e não o NotFoundException (404)
// do findOne — para o interceptor do front-end encerrar a sessão.
// Erros de infraestrutura não podem ser mascarados como 401.

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

function criarStrategy(findOne: jest.Mock): JwtStrategy {
  return new JwtStrategy(
    { findOne } as unknown as UsersService,
    {
      get: () => 'teste-jwt-segredo-com-mais-de-trinta-e-dois-caracteres',
    } as unknown as ConfigService,
  );
}

const payload: JwtPayload = {
  sub: 'u1',
  email: 'usuario@test.com',
  nome: 'Usuário',
  tipo: 'DONO_SALAO',
};

describe('JwtStrategy.validate', () => {
  it('devolve o usuário autenticado quando a conta existe', async () => {
    const usuario = { id: 'u1', email: 'usuario@test.com' };
    const strategy = criarStrategy(jest.fn().mockResolvedValue(usuario));

    await expect(strategy.validate(payload)).resolves.toEqual(usuario);
  });

  it('conta excluída (findOne lança 404) responde 401', async () => {
    const strategy = criarStrategy(
      jest
        .fn()
        .mockRejectedValue(new NotFoundException('Usuário não encontrado')),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('erro de infraestrutura não é mascarado como 401', async () => {
    const strategy = criarStrategy(
      jest.fn().mockRejectedValue(new Error('banco fora do ar')),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      'banco fora do ar',
    );
  });
});
