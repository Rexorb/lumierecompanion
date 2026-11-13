import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

type WebhookClaims = {
  app?: unknown;
  action?: unknown;
  iat?: unknown;
  exp?: unknown;
};

@Injectable()
export class EvolutionWebhookGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config
      .get<string>('EVOLUTION_WEBHOOK_JWT_SECRET')
      ?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('Webhook WhatsApp não configurado');
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || authorization.length > 4_103) {
      throw new UnauthorizedException('Credencial do webhook inválida');
    }

    try {
      const claims = this.jwt.verify<WebhookClaims>(authorization.slice(7), {
        secret,
        algorithms: ['HS256'],
      });
      const now = Math.floor(Date.now() / 1000);
      if (
        claims.app !== 'evolution' ||
        claims.action !== 'webhook' ||
        typeof claims.iat !== 'number' ||
        typeof claims.exp !== 'number' ||
        claims.iat > now + 30 ||
        now - claims.iat > 600 ||
        claims.exp - claims.iat > 600
      ) {
        throw new UnauthorizedException('Credencial do webhook inválida');
      }
      return true;
    } catch {
      // Nunca registrar token recebido nem detalhes internos de verificação.
      throw new UnauthorizedException('Credencial do webhook inválida');
    }
  }
}
