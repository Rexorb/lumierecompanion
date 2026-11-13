// src/modules/chatbot/identity/whatsapp-sender-identity.resolver.ts
// Borda provider-specific: interpreta o formato de sender do WhatsApp.
// Este é o ÚNICO lugar do chatbot que conhece sufixos JID
// (@s.whatsapp.net, @lid, @g.us, @broadcast, @newsletter).
// Transformação pura: sem Prisma, sem Cliente, sem FSM, sem canal.

import { Injectable } from '@nestjs/common';
import { isCanonicalPhone, type SenderIdentity } from './sender-identity';

/** Sufixo único aceito: identidade diretamente telefônica do WhatsApp. */
const WHATSAPP_PHONE_SUFFIX = '@s.whatsapp.net';

const UNSUPPORTED: SenderIdentity = { kind: 'unsupported' };

@Injectable()
export class WhatsAppSenderIdentityResolver {
  /**
   * Converte um sender externo em identidade canônica.
   * Semântica: nunca lança erro — identidade não suportada resulta em
   * `{ kind: 'unsupported' }` (o chamador decide ignorar).
   */
  resolve(sender: string): SenderIdentity {
    if (typeof sender !== 'string') return UNSUPPORTED;

    const trimmed = sender.trim();
    if (trimmed.length === 0) return UNSUPPORTED;

    const atIndex = trimmed.lastIndexOf('@');
    if (atIndex <= 0) return UNSUPPORTED; // sem sufixo JID reconhecido

    const local = trimmed.slice(0, atIndex);
    const suffix = trimmed.slice(atIndex);

    // @lid, @g.us, @broadcast, @newsletter e qualquer outro sufixo
    // não representam telefone diretamente → não suportado.
    if (suffix !== WHATSAPP_PHONE_SUFFIX) return UNSUPPORTED;

    if (!isCanonicalPhone(local)) return UNSUPPORTED;

    return { kind: 'phone', phone: local };
  }
}
