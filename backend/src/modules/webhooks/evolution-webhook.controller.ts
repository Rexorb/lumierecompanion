// src/modules/webhooks/evolution-webhook.controller.ts
// Endpoint de webhook da Evolution (entrada de mensagens recebidas).
// Controller fino: autenticação, recebimento HTTP e mapeamento para HTTP.
// A lógica de ingestão (tenant, normalização, idempotência, contador)
// fica no WhatsAppIngestionService.

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WhatsAppIngestionService } from '../../modules/messaging/services/whatsapp-ingestion.service';
import { logHash } from '../../modules/messaging/log-sanitization';
import { EvolutionWebhookGuard } from './evolution-webhook.guard';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

@Controller('webhooks/evolution')
@UseGuards(EvolutionWebhookGuard)
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(private readonly ingestion: WhatsAppIngestionService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(@Body() body: unknown): Promise<{ accepted: boolean }> {
    const event = asRecord(body);
    const tenantField =
      event && typeof event.instance === 'string' && event.instance
        ? `tenant=${logHash(event.instance)}`
        : 'tenant=desconhecido';

    if (!event || event.event !== 'messages.upsert') {
      this.logger.warn(`inbound_invalid: ${tenantField}, motivo=event`);
      throw new BadRequestException('Evento WhatsApp inválido');
    }

    const data = asRecord(event.data);
    if (!data) {
      this.logger.warn(`inbound_invalid: ${tenantField}, motivo=payload`);
      throw new BadRequestException('Mensagem WhatsApp inválida');
    }

    const key = asRecord(data.key);
    if (
      !key ||
      typeof key.id !== 'string' ||
      !key.id ||
      typeof key.remoteJid !== 'string' ||
      !key.remoteJid ||
      typeof key.fromMe !== 'boolean'
    ) {
      this.logger.warn(`inbound_invalid: ${tenantField}, motivo=key`);
      throw new BadRequestException('Mensagem WhatsApp inválida');
    }

    const messageHash = logHash(key.id, 12);
    this.logger.log(
      `webhook_received: ${tenantField}, mensagem=${messageHash}`,
    );

    try {
      const result = await this.ingestion.ingest(body);

      if (result.kind === 'processed') {
        this.logger.log(
          `inbound_processed: ${tenantField}, mensagem=${messageHash}`,
        );
      } else if (result.kind === 'duplicate') {
        this.logger.log(
          `inbound_duplicate: ${tenantField}, mensagem=${messageHash}`,
        );
      } else if (result.reason === 'from_me') {
        this.logger.log(
          `inbound_ignored_from_me: ${tenantField}, mensagem=${messageHash}`,
        );
      } else {
        this.logger.log(
          `inbound_ignored_unsupported: ${tenantField}, mensagem=${messageHash}`,
        );
      }

      return { accepted: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(`inbound_invalid: ${tenantField}, motivo=payload`);
        throw error;
      }
      if (error instanceof NotFoundException) {
        this.logger.warn(`inbound_failure: ${tenantField}, status=404`);
        throw error;
      }
      // Erro inesperado: log sanitizado sem detalhes internos e 5xx.
      this.logger.error(`inbound_failure: ${tenantField}, status=internal`);
      throw error;
    }
  }
}
