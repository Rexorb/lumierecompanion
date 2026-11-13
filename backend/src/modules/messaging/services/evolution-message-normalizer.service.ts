// src/modules/messaging/services/evolution-message-normalizer.service.ts
// Normalizador de mensagens recebidas da Evolution API v2.3.7 (Baileys).
// Transforma o payload de messages.upsert em IncomingMessage,
// um contrato de domínio independente da infraestrutura.
// Não acessa Prisma, não conhece InstanciaWhatsApp, não faz idempotência.
// É uma transformação pura ou praticamente pura, facilmente testável.

import { Injectable } from '@nestjs/common';
import type { NormalizeResult } from '../contracts/incoming-message.contract';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseTimestampSeconds(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) return null;
  const ms = num * 1000; // Baileys/Evolution envia timestamp em segundos
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

@Injectable()
export class EvolutionMessageNormalizer {
  normalize(salaoId: string, payload: unknown): NormalizeResult {
    const event = asRecord(payload);
    if (!event || event.event !== 'messages.upsert') {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    const data = asRecord(event.data);
    if (!data) {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    const key = asRecord(data.key);
    if (!key) {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    const externalMessageId = asNonEmptyString(key.id);
    const sender = asNonEmptyString(key.remoteJid);

    if (!externalMessageId || !sender) {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    // Extrai texto da mensagem
    const message = asRecord(data.message);
    let text: string | null = null;
    let hasTextField = false;
    let hasKnownNonTextType = false;

    if (message) {
      if (typeof message.conversation === 'string') {
        hasTextField = true;
        if (message.conversation.length > 0) {
          text = message.conversation;
        }
      } else {
        const extended = asRecord(message.extendedTextMessage);
        if (extended && typeof extended.text === 'string') {
          hasTextField = true;
          if (extended.text.length > 0) {
            text = extended.text;
          }
        }
      }

      // Detecta tipos não textuais conhecidos
      if (
        message.imageMessage ||
        message.audioMessage ||
        message.videoMessage ||
        message.documentMessage ||
        message.locationMessage ||
        message.contacts ||
        message.stickerMessage
      ) {
        hasKnownNonTextType = true;
      }
    }

    // Se há tipo não textual conhecido e nenhum texto válido, ignora
    if (!text && hasKnownNonTextType) {
      return { kind: 'ignored', reason: 'unsupported_message_type' };
    }

    // Se o campo de texto existe mas está vazio, é payload inválido
    if (!text && hasTextField) {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    if (!text) {
      // Nenhum tipo reconhecido e nenhum texto → tipo não suportado
      return { kind: 'ignored', reason: 'unsupported_message_type' };
    }

    // Timestamp
    const timestamp = parseTimestampSeconds(data.messageTimestamp);
    if (!timestamp) {
      return { kind: 'invalid', reason: 'invalid_payload' };
    }

    return {
      kind: 'message',
      message: {
        salaoId,
        externalMessageId,
        sender,
        text,
        timestamp,
      },
    };
  }
}
