// src/modules/messaging/adapters/evolution-messaging.adapter.ts
// Implementação de MessagingChannel via Evolution API.
// Fronteira de SAÍDA independente do provider para o domínio futuro.
// Não implementa chatbot, FSM, resposta automática ou regras de Cliente.
//
// Decisões de arquitetura (Fase 7.4):
// - Sem getConnectionState prévio: tentar sendText e tratar o erro real do
//   provider (evita chamada extra + race condition entre check e envio).
// - recipient é encaminhado sem parsing; a autoridade de formato é o
//   EvolutionClient.sendText (valida dígitos e texto não vazio).
// - HTTP do provider e PostgreSQL não são transacionais: o contador é
//   métrica e pode ficar atrasado se o update falhar após envio aceito.
//   Nunca reenviar nesse cenário (duplicaria mensagem para o cliente).

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EvolutionClient } from '../../../integrations/evolution/evolution-client';
import { EvolutionClientError } from '../../../integrations/evolution/evolution-client.error';
import { logHash } from '../log-sanitization';
import {
  MessagingChannel,
  MessagingChannelError,
  type MessagingChannelInput,
} from '../contracts/messaging-channel.contract';

@Injectable()
export class EvolutionMessagingAdapter implements MessagingChannel {
  private readonly logger = new Logger(EvolutionMessagingAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionClient,
  ) {}

  async sendMessage(input: MessagingChannelInput): Promise<void> {
    const { salaoId, recipient, message } = input;

    if (typeof message !== 'string' || !message.trim()) {
      throw new MessagingChannelError('MESSAGE_INVALID');
    }
    if (typeof recipient !== 'string' || !recipient.trim()) {
      throw new MessagingChannelError('RECIPIENT_INVALID');
    }

    // Correlação sanitizada: hash do tenant, sem salaoId cru.
    const tenantHash = logHash(salaoId);

    // Resolução outbound: salaoId -> InstanciaWhatsApp -> instanceId.
    // O caller nunca fornece instanceId.
    const instancia = await this.prisma.instanciaWhatsApp.findUnique({
      where: { salaoId },
      select: { id: true, instanceId: true },
    });

    if (!instancia?.instanceId) {
      throw new MessagingChannelError('WHATSAPP_NOT_LINKED');
    }

    try {
      await this.evolution.sendText(instancia.instanceId, recipient, message);
    } catch (error: unknown) {
      // EvolutionClientError já é a camada de normalização de infra:
      // códigos fixos, sem apikey, instanceId ou payload do provider.
      const code =
        error instanceof EvolutionClientError ? error.code : 'UNEXPECTED';
      this.logger.error(
        `outbound_send_failure: tenant=${tenantHash}, code=${code}`,
      );
      throw error;
    }

    this.logger.log(`outbound_send_success: tenant=${tenantHash}`);

    // Métrica pós-aceite: se falhar, apenas loga. Nenhum reenvio automático.
    try {
      await this.prisma.instanciaWhatsApp.update({
        where: { id: instancia.id },
        data: { totalMensagensEnviadas: { increment: 1 } },
      });
    } catch {
      this.logger.error(`outbound_counter_failure: tenant=${tenantHash}`);
    }
  }
}
