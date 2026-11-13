// src/modules/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { EvolutionModule } from '../../integrations/evolution/evolution.module';
import { EvolutionMessagingAdapter } from './adapters/evolution-messaging.adapter';
import { MESSAGING_CHANNEL } from './contracts/messaging-channel.contract';
import { EvolutionMessageNormalizer } from './services/evolution-message-normalizer.service';
import { MessageIdempotencyService } from './services/message-idempotency.service';
import { WhatsAppIngestionService } from './services/whatsapp-ingestion.service';

@Module({
  imports: [EvolutionModule],
  providers: [
    EvolutionMessageNormalizer,
    MessageIdempotencyService,
    WhatsAppIngestionService,
    EvolutionMessagingAdapter,
    // Mesma instância sob dois tokens: o domínio futuro injeta
    // MESSAGING_CHANNEL e nunca conhece EvolutionMessagingAdapter.
    { provide: MESSAGING_CHANNEL, useExisting: EvolutionMessagingAdapter },
  ],
  exports: [
    // Público: contrato de domínio + fronteira de ingestão usada pelo
    // módulo de webhooks. Detalhes de infraestrutura (normalizador,
    // idempotência, adapter Evolution) permanecem privados ao módulo.
    WhatsAppIngestionService,
    MESSAGING_CHANNEL,
  ],
})
export class MessagingModule {}
