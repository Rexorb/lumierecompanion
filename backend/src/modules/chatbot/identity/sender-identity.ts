// src/modules/chatbot/identity/sender-identity.ts
// Contrato de identidade provider-neutral do remetente.
// O domínio do chatbot consome APENAS este contrato: nunca sufixos JID,
// remoteJid, Baileys ou detalhes de transporte do WhatsApp.

export type SenderIdentity =
  /** O remetente representa um telefone utilizável em formato canônico. */
  | { kind: 'phone'; phone: string }
  /** Identidade externa não suportada (grupo, canal, status, malformada…). */
  | { kind: 'unsupported' };

/** Telefone canônico: somente dígitos, com DDI, sem +, espaços ou pontuação. */
export function isCanonicalPhone(phone: string): boolean {
  return /^[1-9]\d{9,14}$/.test(phone);
}
