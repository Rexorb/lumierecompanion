// src/modules/messaging/services/message-idempotency.service.ts
// Serviço de idempotência para mensagens recebidas via WhatsApp/Evolution.
// Garante, por constraint de banco, que uma mesma mensagem externa
// (instanciaWhatsAppId + externalMessageId) seja processada apenas uma vez.
// Não acessa o webhook real. Não faz efeitos de negócio.
// É uma camada isolada, reversível e testável.

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

export type IdempotencyResult = { kind: 'created'; id: string };

type IdempotencyClient = Pick<Prisma.TransactionClient, 'mensagemProcessada'>;

@Injectable()
export class MessageIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    data: {
      salaoId: string;
      instanciaWhatsAppId: string;
      externalMessageId: string;
      eventType: string;
    },
    prismaClient: IdempotencyClient = this.prisma,
  ): Promise<IdempotencyResult> {
    const registro = await prismaClient.mensagemProcessada.create({
      data: {
        salaoId: data.salaoId,
        instanciaWhatsAppId: data.instanciaWhatsAppId,
        externalMessageId: data.externalMessageId,
        eventType: data.eventType,
      },
      select: { id: true },
    });
    return { kind: 'created', id: registro.id };
  }
}
