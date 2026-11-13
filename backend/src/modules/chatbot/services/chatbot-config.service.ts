// src/modules/chatbot/services/chatbot-config.service.ts
// Fase 8.1: configuração persistente 1:1 entre Salão e Chatbot.
// Responsabilidades: obter config, criar, getOrCreate idempotente e atualizar.
// Nada de atendimento, FSM, inbound/outbound ou dependência de Evolution.

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConfiguracaoChatbot } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface UpdateChatbotConfigInput {
  ativo?: boolean;
  nomeAssistente?: string;
  mensagemBoasVindas?: string | null;
  mensagemFinalizacao?: string | null;
  timeoutMinutos?: number;
}

@Injectable()
export class ChatbotConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Leitura pura: retorna a configuração ou null. Nunca cria. */
  async getBySalaoId(salaoId: string): Promise<ConfiguracaoChatbot | null> {
    return this.prisma.configuracaoChatbot.findUnique({ where: { salaoId } });
  }

  /**
   * Idempotente: primeira chamada cria, demais retornam a mesma config.
   * A garantia final é a constraint UNIQUE(salaoId) — a lógica de aplicação
   * é apenas atalho, não proteção.
   */
  async getOrCreate(salaoId: string): Promise<ConfiguracaoChatbot> {
    // Salão inexistente/soft-deleted nunca retorna nem cria config.
    await this.assertSalaoOperavel(salaoId);

    const existente = await this.prisma.configuracaoChatbot.findUnique({
      where: { salaoId },
    });
    if (existente) return existente;

    try {
      // Defaults vêm do schema (ativo=false, "Assistente", 15, mensagens null).
      return await this.prisma.configuracaoChatbot.create({
        data: { salaoId },
      });
    } catch (error: unknown) {
      // Corrida entre findUnique e create: a UNIQUE(salaoId) é a autoridade.
      if (this.isUniqueViolation(error)) {
        const perdida = await this.prisma.configuracaoChatbot.findUnique({
          where: { salaoId },
        });
        if (perdida) return perdida;
      }
      throw error;
    }
  }

  /**
   * Atualiza somente os campos de configuração permitidos.
   * Nunca altera id, salaoId, createdAt ou updatedAt.
   */
  async update(
    salaoId: string,
    input: UpdateChatbotConfigInput,
  ): Promise<ConfiguracaoChatbot> {
    await this.assertSalaoOperavel(salaoId);

    const data: UpdateChatbotConfigInput = {};

    if (input.ativo !== undefined) {
      if (typeof input.ativo !== 'boolean') {
        throw new BadRequestException('ativo deve ser booleano');
      }
      data.ativo = input.ativo;
    }

    if (input.nomeAssistente !== undefined) {
      data.nomeAssistente = this.normalizeNome(input.nomeAssistente);
    }

    if (input.mensagemBoasVindas !== undefined) {
      data.mensagemBoasVindas = this.normalizeMensagem(
        input.mensagemBoasVindas,
      );
    }

    if (input.mensagemFinalizacao !== undefined) {
      data.mensagemFinalizacao = this.normalizeMensagem(
        input.mensagemFinalizacao,
      );
    }

    if (input.timeoutMinutos !== undefined) {
      data.timeoutMinutos = this.validateTimeout(input.timeoutMinutos);
    }

    try {
      return await this.prisma.configuracaoChatbot.update({
        where: { salaoId },
        data,
      });
    } catch (error: unknown) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException(
          'Configuração do chatbot não encontrada para este salão',
        );
      }
      throw error;
    }
  }

  /**
   * Salão precisa existir e não estar soft-deleted para criar/atualizar.
   * Soft-deleted é tratado como indisponível (não reativa, não limpa config).
   */
  private async assertSalaoOperavel(salaoId: string): Promise<void> {
    const salao = await this.prisma.salao.findUnique({
      where: { id: salaoId },
      select: { deletedAt: true },
    });
    if (!salao || salao.deletedAt) {
      throw new NotFoundException('Salão não encontrado');
    }
  }

  /** integer > 0. Rejeita 0, negativos, floats e NaN. Sem CHECK SQL (8.1). */
  private validateTimeout(value: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(
        'timeoutMinutos deve ser um inteiro maior que zero',
      );
    }
    return value;
  }

  /** trim(); string só de espaços é inválida. */
  private normalizeNome(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('nomeAssistente deve ser texto');
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('nomeAssistente não pode ser vazio');
    }
    return trimmed;
  }

  /**
   * null → null; string → trim; "" → null.
   * Política: vazio e ausência são a mesma coisa (sem diferença semântica).
   */
  private normalizeMensagem(value: string | null): string | null {
    if (value === null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException('mensagem deve ser texto ou null');
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'P2002'
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
