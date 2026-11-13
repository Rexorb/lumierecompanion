import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null;
  private from: string;
  private appUrl: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend)
      this.logger.warn(
        'Recuperação de senha por e-mail indisponível neste ambiente',
      );
    this.from = config.get<string>('MAIL_FROM') || 'noreply@lumiere.app';
    this.appUrl = config.get<string>('APP_URL') || 'http://localhost:3000';
  }

  isAvailable(): boolean {
    return this.resend !== null;
  }

  async sendPasswordResetLink(email: string, token: string) {
    if (!this.resend)
      throw new ServiceUnavailableException(
        'Recuperação por e-mail indisponível',
      );
    const resetUrl = `${this.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const result = await this.resend.emails.send({
      from: this.from,
      to: [email],
      subject: 'Recuperação de senha — Lumière',
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h1 style="font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 28px; letter-spacing: -0.03em; color: #0f0f14; margin-bottom: 8px;">
            Redefinir senha
          </h1>
          <p style="font-size: 15px; line-height: 1.6; color: #4a4a52; margin-bottom: 24px;">
            Você solicitou a recuperação de senha para <strong>${email}</strong>. Clique no link abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #2b1a3a; color: #fff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-size: 15px; font-weight: 500; letter-spacing: 0.02em;">
            Redefinir senha
          </a>
          <p style="font-size: 13px; color: #6a6a72; margin-top: 24px; line-height: 1.5;">
            Se você não solicitou esta recuperação, ignore este e-mail. Nenhuma alteração será feita na sua conta.
          </p>
        </div>
      `,
      text: `Recuperação de senha — Lumière. Acesse: ${resetUrl} (expira em 1 hora). E-mail: ${email}`,
    });

    if (result.error)
      throw new ServiceUnavailableException('Falha no serviço de e-mail');
    return result;
  }
}
