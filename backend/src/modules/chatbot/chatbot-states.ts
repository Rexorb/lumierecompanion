// src/modules/chatbot/chatbot-states.ts
// Constantes e tipos estruturais de domínio da conversa (Fase 8.3).
// Sem tabela de transições — a FSM real chega na 8.4.

import type { Prisma } from '@prisma/client';

/** Estado persistido inicial de toda conversa nova (decisão aprovada). */
export const CHATBOT_INITIAL_STATE = 'MENU_PRINCIPAL';

/**
 * Contexto estrutural da conversa (JSON de domínio).
 * Record simples menos prematuro: campos específicos serão tipados na 8.4.
 * Nunca deve receber texto de mensagem, JID, telefone ou payload provider.
 */
export type ChatbotContext = Record<string, Prisma.JsonValue>;

/**
 * Marcadores estruturais permitidos em `ultimoEvento`.
 * Allowlist fechada: impede mecanicamente que texto de mensagem,
 * telefone, JID ou externalMessageId partem no campo.
 * (Estendível em fases futuras — ex.: evento de falha de envio.)
 */
export const CHATBOT_CONVERSATION_EVENTS = [
  'criada',
  'timeout',
  'reset',
  'finalizado',
  'estado_atualizado',
] as const;

export type ChatbotConversationEvent =
  (typeof CHATBOT_CONVERSATION_EVENTS)[number];

/** Motivos tipados de reset (8.3): gravados em `ultimoEvento`. */
export type ConversationResetReason = Extract<
  ChatbotConversationEvent,
  'reset' | 'timeout' | 'finalizado'
>;

export function isChatbotConversationEvent(
  value: unknown,
): value is ChatbotConversationEvent {
  return (
    typeof value === 'string' &&
    (CHATBOT_CONVERSATION_EVENTS as readonly string[]).includes(value)
  );
}
