// src/modules/messaging/contracts/incoming-message.contract.ts
// Contrato de domínio para mensagens recebidas via WhatsApp/Evolution.
// Este contrato é independente da infraestrutura Evolution/Baileys.
// Não contém instanceId, remoteJid, fromMe, apikey, JWT ou payload bruto.

export interface IncomingMessage {
  salaoId: string;
  externalMessageId: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export type NormalizeResult =
  | { kind: 'message'; message: IncomingMessage }
  | { kind: 'ignored'; reason: 'unsupported_message_type' }
  | { kind: 'invalid'; reason: 'invalid_payload' };
