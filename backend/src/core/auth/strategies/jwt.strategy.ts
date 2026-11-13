import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { requireJwtSecret } from '../jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      return await this.usersService.findOne(payload.sub);
    } catch (error) {
      // Conta já excluída (findOne lança 404 quando o id não existe):
      // responde 401 em vez de 404, para o interceptor do front-end
      // encerrar a sessão automaticamente. Erros de infraestrutura
      // (banco fora do ar etc.) são repassados inalterados.
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Token de usuário inexistente');
      }
      throw error;
    }
  }
}
