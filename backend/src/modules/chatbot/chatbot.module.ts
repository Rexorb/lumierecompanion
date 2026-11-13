// src/modules/chatbot/chatbot.module.ts
// Fase 8.1: configuração persistente do chatbot (1:1 com Salao).
// Fase 8.3: lifecycle persistente de ConversaChatbot (1:1 por Cliente+Salao).
// Sem FSM, sem controller, sem inbound/outbound, sem dependência de Evolution.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ChatbotConfigService } from './services/chatbot-config.service';
import { ChatbotConversationService } from './services/chatbot-conversation.service';

@Module({
  imports: [PrismaModule],
  providers: [ChatbotConfigService, ChatbotConversationService],
  exports: [ChatbotConfigService, ChatbotConversationService],
})
export class ChatbotModule {}
