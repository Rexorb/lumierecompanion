// src/modules/messaging/contracts/messaging-channel.contract.ts
// Contrato de SAÍDA para envio de mensagens WhatsApp.
// Independente da infraestrutura: o domínio não conhece EvolutionClient,
// instanceId, Baileys, endpoint HTTP, API key nem JWT do provider.
// O instanceId é detalhe de infraestrutura resolvido internamente pelo adapter.

export interface MessagingChannelInput {
  /** Tenant dono da mensagem. Nunca instanceId. */
  salaoId: string;
  /** Número em dígitos internacionais (formato aceito pelo provider). */
  recipient: string;
  /** Texto da mensagem. */
  message: string;
}

export interface MessagingChannel {
  sendMessage(input: MessagingChannelInput): Promise<void>;
}

// Token de DI: interface não existe em runtime, o token permite que o
// futuro ChatbotService dependa da abstração e não da classe Evolution.
export const MESSAGING_CHANNEL = Symbol('MESSAGING_CHANNEL');

export type MessagingChannelErrorCode =
  'WHATSAPP_NOT_LINKED' | 'MESSAGE_INVALID' | 'RECIPIENT_INVALID';

const MESSAGES: Record<MessagingChannelErrorCode, string> = {
  WHATSAPP_NOT_LINKED: 'Nenhum WhatsApp configurado para este salão',
  MESSAGE_INVALID: 'A mensagem a ser enviada está vazia',
  RECIPIENT_INVALID: 'O destinatário não foi informado',
};

// Erros de contrato do canal (vínculo/validação de entrada).
// Erros de infraestrutura continuam sendo EvolutionClientError.
export class MessagingChannelError extends Error {
  constructor(readonly code: MessagingChannelErrorCode) {
    super(MESSAGES[code]);
    this.name = 'MessagingChannelError';
  }
}
