// src/core/users/user-deletion.ts
//
// Rotina ÚNICA de exclusão completa de conta — fonte compartilhada por:
//   • DELETE /users/me           (autoexclusão — users.controller.ts)
//   • DELETE /users/:id          (ferramenta SUPER_ADMIN — users.controller.ts)
//   • scripts/limpar-usuarios.ts (CLI — npm run db:limpar-usuarios)
//
// Ordem obrigatória: todas as FKs de domínio são ON DELETE RESTRICT na
// migração 20260813191221_init (linhas 300–336); excluir fora de ordem
// estoura P2003 no Postgres. Duas FKs são ON DELETE SET NULL e se
// resolvem sozinhas: logs.usuarioId e conversas_chatbot.agendamentoId.
//
// Fluxo dentro de uma ÚNICA transação:
//   1. vínculos do usuário (usuarios_saloes) — libera os salões do RESTRICT
//   2. salão EXCLUSIVO (nenhum outro membro), salvo --manter-saloes:
//      conversas → agendamentos → clientes → serviços → horários
//      → instância WhatsApp → salão
//   3. conta (usuário) — logs sobrevivem com usuarioId = NULL
//
// Conta sem vínculo ("dono fantasma", criada em versões antigas ou via
// POST /users) percorre o caminho direto: nenhum dado de salão é tocado.

import { NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export interface ExclusaoSalaoResultado {
  salaoId: string;
  nome: string;
  conversas: number;
  agendamentos: number;
  clientes: number;
  servicos: number;
  horarios: number;
  instanciaWhatsApp: number;
}

export interface ExclusaoContaResultado {
  usuarioId: string;
  email: string;
  vinculosRemovidos: number;
  saloesExcluidos: ExclusaoSalaoResultado[];
}

export interface OpcoesExclusaoConta {
  /** true = mantém os salões mesmo quando o usuário era o único membro
   *  (nesse caso apenas o vínculo é removido) */
  manterSaloes?: boolean;
}

/**
 * Exclui a conta `usuarioId` por completo, em transação:
 * vínculos → cascata dos salões exclusivos (opcional) → usuário.
 *
 * Lança `NotFoundException` (404) se a conta não existir.
 */
export async function excluirConta(
  prisma: PrismaClient,
  usuarioId: string,
  opcoes: OpcoesExclusaoConta = {},
): Promise<ExclusaoContaResultado> {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, email: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const vinculos = await tx.usuarioSalao.findMany({
      where: { usuarioId },
      select: { salaoId: true },
    });

    // Quais salões ficariam SEM nenhum membro após a exclusão?
    const saloesExclusivos: string[] = [];
    for (const vinculo of vinculos) {
      const outrosMembros = await tx.usuarioSalao.count({
        where: {
          salaoId: vinculo.salaoId,
          usuarioId: { not: usuarioId },
        },
      });
      if (outrosMembros === 0) {
        saloesExclusivos.push(vinculo.salaoId);
      }
    }

    // 1) vínculos — antes de tocar em qualquer salão (FK RESTRICT)
    await tx.usuarioSalao.deleteMany({ where: { usuarioId } });

    // 2) cascata dos salões exclusivos
    const saloesExcluidos: ExclusaoSalaoResultado[] = [];
    if (!opcoes.manterSaloes) {
      for (const salaoId of saloesExclusivos) {
        saloesExcluidos.push(await excluirSalaoExclusivo(tx, salaoId));
      }
    }

    // 3) conta — logs ficam com usuarioId NULL (SET NULL da migração)
    await tx.usuario.delete({ where: { id: usuarioId } });

    return {
      usuarioId: usuario.id,
      email: usuario.email,
      vinculosRemovidos: vinculos.length,
      saloesExcluidos,
    };
  });
}

/** Cascata de um salão sem outros membros — ordem = ordem das FKs
 *  RESTRICT da migração (conversas antes de agendamentos/clientes;
 *  agendamentos antes de clientes e serviços; tudo antes do salão). */
async function excluirSalaoExclusivo(
  tx: Prisma.TransactionClient,
  salaoId: string,
): Promise<ExclusaoSalaoResultado> {
  const salao = await tx.salao.findUnique({
    where: { id: salaoId },
    select: { nome: true },
  });

  const conversas = await tx.conversaChatbot.deleteMany({
    where: { salaoId },
  });
  const agendamentos = await tx.agendamento.deleteMany({
    where: { salaoId },
  });
  const clientes = await tx.cliente.deleteMany({ where: { salaoId } });
  const servicos = await tx.servico.deleteMany({ where: { salaoId } });
  const horarios = await tx.horarioFuncionamento.deleteMany({
    where: { salaoId },
  });
  const instancias = await tx.instanciaWhatsApp.deleteMany({
    where: { salaoId },
  });
  await tx.salao.delete({ where: { id: salaoId } });

  return {
    salaoId,
    nome: salao?.nome ?? '(salão sem nome)',
    conversas: conversas.count,
    agendamentos: agendamentos.count,
    clientes: clientes.count,
    servicos: servicos.count,
    horarios: horarios.count,
    instanciaWhatsApp: instancias.count,
  };
}
