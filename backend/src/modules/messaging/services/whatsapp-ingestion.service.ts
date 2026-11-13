// src/modules/messaging/services/whatsapp-ingestion.service.ts
// Serviço de ingestão de mensagens recebidas via webhook Evolution.
// Conecta o webhook real ao normalizador (Fase 7.1) e à idempotência (Fase 7.2).
// Não implementa FSM, chatbot, resposta automática ou efeitos de negócio.
// Apenas normaliza, deduplica e incrementa o contador da instância.

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EvolutionMessageNormalizer } from './evolution-message-normalizer.service';
import { MessageIdempotencyService } from './message-idempotency.service';

export type IngestionResult =
  | { kind: 'processed' }
  | { kind: 'duplicate' }
  | { kind: 'ignored'; reason: 'from_me' | 'unsupported_message_type' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const IDEMPOTENCY_CONSTRAINT =
  'mensagens_processadas_instanciaWhatsAppId_externalMessageId_key';

function collectMetadataStrings(value: unknown, output: string[]): void {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMetadataStrings(entry, output));
    return;
  }
  const object = asRecord(value);
  if (object) {
    Object.values(object).forEach((entry) =>
      collectMetadataStrings(entry, output),
    );
  }
}

export function isMessageIdempotencyUniqueViolation(error: unknown): boolean {
  const object = asRecord(error);
  if (object?.code !== 'P2002') return false;

  const metadata: string[] = [];
  collectMetadataStrings(object.meta, metadata);
  const normalizedMetadata = metadata.map((value) => value.replaceAll('"', ''));
  return (
    normalizedMetadata.some((value) =>
      value.includes(IDEMPOTENCY_CONSTRAINT),
    ) ||
    (normalizedMetadata.includes('instanciaWhatsAppId') &&
      normalizedMetadata.includes('externalMessageId'))
  );
}

@Injectable()
export class WhatsAppIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: EvolutionMessageNormalizer,
    private readonly idempotency: MessageIdempotencyService,
  ) {}

  async ingest(payload: unknown): Promise<IngestionResult> {
    const client = this.prisma;

    const event = asRecord(payload);
    if (!event || event.event !== 'messages.upsert') {
      throw new BadRequestException('Evento WhatsApp inválido');
    }

    const data = asRecord(event.data);
    if (!data) {
      throw new BadRequestException('Mensagem WhatsApp inválida');
    }

    const key = asRecord(data.key);
    if (!key) {
      throw new BadRequestException('Mensagem WhatsApp inválida');
    }

    const instanceName =
      typeof event.instance === 'string' ? event.instance : null;
    if (!instanceName) {
      throw new BadRequestException('Evento WhatsApp inválido');
    }

    const externalMessageId =
      typeof key.id === 'string' && key.id.length > 0 ? key.id : null;
    const sender =
      typeof key.remoteJid === 'string' && key.remoteJid.length > 0
        ? key.remoteJid
        : null;
    const fromMe = typeof key.fromMe === 'boolean' ? key.fromMe : null;

    if (!externalMessageId || !sender || fromMe === null) {
      throw new BadRequestException('Mensagem WhatsApp inválida');
    }

    // Mensagens enviadas pelo próprio salão não contam como recebimento.
    if (fromMe) {
      return { kind: 'ignored', reason: 'from_me' };
    }

    // Resolve tenant exclusivamente pelo vínculo persistido no Lumière.
    const instance = await client.instanciaWhatsApp.findUnique({
      where: { instanceId: instanceName },
      select: {
        id: true,
        salaoId: true,
        salao: { select: { ativo: true, deletedAt: true } },
      },
    });

    if (!instance?.salao.ativo || instance.salao.deletedAt) {
      throw new NotFoundException('Instância WhatsApp não cadastrada');
    }

    const salaoId = instance.salaoId;
    const instanciaWhatsAppId = instance.id;

    // Normaliza o payload para o contrato de domínio.
    const normalized = this.normalizer.normalize(salaoId, payload);

    if (normalized.kind === 'invalid') {
      throw new BadRequestException('Payload inválido');
    }

    if (normalized.kind === 'ignored') {
      return { kind: 'ignored', reason: normalized.reason };
    }

    try {
      return await client.$transaction(async (tx) => {
        await this.idempotency.register(
          {
            salaoId,
            instanciaWhatsAppId,
            externalMessageId,
            eventType: 'messages.upsert',
          },
          tx,
        );

        await tx.instanciaWhatsApp.update({
          where: { id: instanciaWhatsAppId },
          data: { totalMensagensRecebidas: { increment: 1 } },
        });

        return { kind: 'processed' };
      });
    } catch (error: unknown) {
      if (isMessageIdempotencyUniqueViolation(error)) {
        return { kind: 'duplicate' };
      }
      throw error;
    }
  }
}
