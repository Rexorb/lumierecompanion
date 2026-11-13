// src/modules/chatbot/services/chatbot-conversation.service.ts
// Fase 8.3: lifecycle persistente de ConversaChatbot.
// UMA conversa por Cliente + Salão (constraint @@unique é a autoridade).
// Puramente persistente: sem FSM, sem MessagingChannel/Evolution, sem
// ConfiguracaoChatbot, sem conteúdo textual de mensagem.
// NÃO abre transação própria: o orquestrador futuro (8.5) é o dono da
// transação — todos os métodos aceitam um transaction client opcional.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ConversaChatbot } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  CHATBOT_INITIAL_STATE,
  isChatbotConversationEvent,
  type ChatbotContext,
  type ChatbotConversationEvent,
  type ConversationResetReason,
} from '../chatbot-states';

// Mantido local para não modificar a configuração persistente da Fase 8.1.
function validateTimeoutMinutos(value: number): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(
      'timeoutMinutos deve ser um inteiro maior que zero',
    );
  }
}

type ConversationClient = Pick<
  Prisma.TransactionClient,
  'conversaChatbot' | 'cliente' | 'salao'
>;

export interface ConversationKey {
  salaoId: string;
  clienteId: string;
}

export interface ConversationClock extends ConversationKey {
  now: Date;
  timeoutMinutos: number;
}

export type ConversationResolution =
  /** Primeiro contato: row criada. */
  | { kind: 'created'; conversa: ConversaChatbot }
  /** Existe e ainda está ativa (now < timeoutExpira) — nenhum efeito. */
  | { kind: 'active'; conversa: ConversaChatbot }
  /** Expirada: MESMA row resetada para o estado inicial. */
  | { kind: 'expired_reset'; conversa: ConversaChatbot }
  /** Cliente soft-deleted: indisponível (não reativado). */
  | { kind: 'customer_unavailable' };

@Injectable()
export class ChatbotConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Leitura pura, tenant-scoped. Sem efeito sobre timestamps. */
  async findByClienteAndSalao(
    key: ConversationKey,
    prismaClient: ConversationClient = this.prisma,
  ): Promise<ConversaChatbot | null> {
    return prismaClient.conversaChatbot.findUnique({
      where: {
        clienteId_salaoId: {
          salaoId: key.salaoId,
          clienteId: key.clienteId,
        },
      },
    });
  }

  /**
   * Resolve a conversa do cliente: cria no primeiro contato, retorna a
   * ativa sem efeitos ou reseta na MESMA row se expirada.
   * `now` explícito: testes determinísticos (default apenas na borda).
   */
  async getOrCreate(
    input: ConversationClock,
    prismaClient: ConversationClient = this.prisma,
  ): Promise<ConversationResolution> {
    validateTimeoutMinutos(input.timeoutMinutos);

    const tenant = await this.resolverTenant(input, prismaClient);
    if (!tenant.ok) return { kind: 'customer_unavailable' };

    const existente = await this.findByClienteAndSalao(input, prismaClient);
    if (existente) return this.classificar(existente, input, prismaClient);

    try {
      const conversa = await prismaClient.conversaChatbot.create({
        data: {
          estadoAtual: CHATBOT_INITIAL_STATE,
          dadosContexto: {},
          ultimaMensagem: input.now,
          timeoutExpira: this.calcularTimeout(input),
          ultimoEvento: 'criada',
          clienteId: input.clienteId,
          salaoId: input.salaoId,
          // mensagens: ausente → null (nunca conteúdo textual)
          // agendamentoId: ausente → null (vinculação real futura)
        },
      });
      return { kind: 'created', conversa };
    } catch (error: unknown) {
      // Corrida: @@unique([clienteId, salaoId]) é a autoridade final.
      if (this.isUniqueViolation(error)) {
        const vencedora = await this.findByClienteAndSalao(input, prismaClient);
        if (vencedora) {
          return this.classificar(vencedora, input, prismaClient);
        }
      }
      throw error;
    }
  }

  /**
   * Reset explícito na MESMA row: estado inicial, contexto vazio,
   * agendamentoId null, timestamps recalculados. Exige conversa existente.
   */
  async reset(
    input: ConversationClock & { motivo: ConversationResetReason },
    prismaClient: ConversationClient = this.prisma,
  ): Promise<ConversaChatbot> {
    validateTimeoutMinutos(input.timeoutMinutos);
    await this.exigirTenantOperacional(input, prismaClient);

    const existente = await this.findByClienteAndSalao(input, prismaClient);
    if (!existente) {
      throw new NotFoundException('Conversa não encontrada para este cliente');
    }
    return this.resetRow(existente.id, input.motivo, input, prismaClient);
  }

  /**
   * Atualiza estado/contexto da conversa existente e renova timestamps.
   * Os campos de identidade (id/salaoId/clienteId) e `mensagens` não são
   * aceitos: o `where` é fixo na chave do tenant.
   */
  async updateState(
    input: ConversationClock & {
      estadoAtual: string;
      dadosContexto: ChatbotContext;
      ultimoEvento?: ChatbotConversationEvent;
    },
    prismaClient: ConversationClient = this.prisma,
  ): Promise<ConversaChatbot> {
    validateTimeoutMinutos(input.timeoutMinutos);
    await this.exigirTenantOperacional(input, prismaClient);

    if (typeof input.estadoAtual !== 'string' || !input.estadoAtual.trim()) {
      throw new BadRequestException('estadoAtual não pode ser vazio');
    }
    this.assertContext(input.dadosContexto);
    if (
      input.ultimoEvento !== undefined &&
      !isChatbotConversationEvent(input.ultimoEvento)
    ) {
      throw new BadRequestException('ultimoEvento não é um marcador válido');
    }

    try {
      return await prismaClient.conversaChatbot.update({
        where: {
          clienteId_salaoId: {
            salaoId: input.salaoId,
            clienteId: input.clienteId,
          },
        },
        data: {
          estadoAtual: input.estadoAtual.trim(),
          dadosContexto: input.dadosContexto,
          ultimoEvento: input.ultimoEvento ?? 'estado_atualizado',
          ultimaMensagem: input.now,
          timeoutExpira: this.calcularTimeout(input),
        },
      });
    } catch (error: unknown) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException(
          'Conversa não encontrada para este cliente',
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------

  /**
   * Salão operacional (mesmo critério da ingestão da Fase 7:
   * `ativo = true` E `deletedAt = null`) + Cliente pertencente ao salão
   * e não soft-deleted. O banco NÃO valida esse vínculo (FKs independentes).
   */
  private async resolverTenant(
    input: ConversationKey,
    prismaClient: ConversationClient,
  ): Promise<{ ok: true } | { ok: false }> {
    const salao = await prismaClient.salao.findUnique({
      where: { id: input.salaoId },
      select: { ativo: true, deletedAt: true },
    });
    if (!salao || !salao.ativo || salao.deletedAt) {
      throw new NotFoundException('Salão não encontrado');
    }

    const cliente = await prismaClient.cliente.findUnique({
      where: { id: input.clienteId },
      select: { salaoId: true, deletedAt: true },
    });
    // Cross-tenant mascarado como "não encontrado" (não vaza existência).
    if (!cliente || cliente.salaoId !== input.salaoId) {
      throw new NotFoundException('Cliente não encontrado para este salão');
    }
    if (cliente.deletedAt) return { ok: false };

    return { ok: true };
  }

  /** Para escritas pontuais (reset/update): cliente indisponível → erro. */
  private async exigirTenantOperacional(
    input: ConversationKey,
    prismaClient: ConversationClient,
  ): Promise<void> {
    const resultado = await this.resolverTenant(input, prismaClient);
    if (!resultado.ok) {
      throw new ForbiddenException('Cliente indisponível');
    }
  }

  /** now >= timeoutExpira ⇒ expirada (limite inclusivo documentado). */
  private async classificar(
    conversa: ConversaChatbot,
    input: ConversationClock,
    prismaClient: ConversationClient,
  ): Promise<ConversationResolution> {
    if (input.now.getTime() >= conversa.timeoutExpira.getTime()) {
      const resetada = await this.resetRow(
        conversa.id,
        'timeout',
        input,
        prismaClient,
      );
      return { kind: 'expired_reset', conversa: resetada };
    }
    return { kind: 'active', conversa };
  }

  private async resetRow(
    conversaId: string,
    motivo: ConversationResetReason,
    input: ConversationClock,
    prismaClient: ConversationClient,
  ): Promise<ConversaChatbot> {
    return prismaClient.conversaChatbot.update({
      where: { id: conversaId },
      data: {
        estadoAtual: CHATBOT_INITIAL_STATE,
        dadosContexto: {},
        ultimoEvento: motivo,
        ultimaMensagem: input.now,
        timeoutExpira: this.calcularTimeout(input),
        agendamentoId: null,
        // mensagens: intocado (permanece null, sem conteúdo)
      },
    });
  }

  private calcularTimeout(input: ConversationClock): Date {
    return new Date(input.now.getTime() + input.timeoutMinutos * 60_000);
  }

  private assertContext(value: ChatbotContext): void {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(
        'dadosContexto deve ser um objeto JSON de domínio',
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const prismaError = error as {
      code?: unknown;
      meta?: { target?: unknown };
    };
    if (prismaError.code !== 'P2002') return false;
    const target = prismaError.meta?.target;
    // Prisma pode omitir meta em mocks/versões distintas; quando informa
    // a constraint, jamais tratar colisão de outra chave como corrida.
    if (target === undefined) return true;
    return (
      Array.isArray(target) &&
      target.length === 2 &&
      target.includes('clienteId') &&
      target.includes('salaoId')
    );
  }

  private isRecordNotFound(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'P2025'
    );
  }
}
