import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  AgendamentosListQueryDto,
  ClientesListQueryDto,
} from './consultas.dto';

const TIMEZONE = 'America/Sao_Paulo';

function todayInSalon() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateRange(value: string) {
  const midnight = new Date(`${value}T00:00:00-03:00`);
  if (
    !Number.isFinite(midnight.getTime()) ||
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(midnight) !== value
  )
    throw new BadRequestException('Data inválida');
  return { gte: midnight, lt: new Date(midnight.getTime() + 86_400_000) };
}

@Injectable()
export class ConsultasService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(userId: string, salaoId: string) {
    const membership = await this.prisma.usuarioSalao.findFirst({
      where: {
        usuarioId: userId,
        salaoId,
        salao: { ativo: true, deletedAt: null },
      },
      select: { salao: { select: { id: true, nome: true } } },
    });
    if (!membership)
      throw new ForbiddenException('Você não tem acesso a este salão');
    return { id: membership.salao.id, name: membership.salao.nome };
  }

  async clientes(userId: string, query: ClientesListQueryDto) {
    const salon = await this.assertAccess(userId, query.salaoId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where = {
      salaoId: salon.id,
      deletedAt: null,
      ...(search
        ? { nome: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nome: true,
          totalVisitas: true,
          ultimaVisita: true,
        },
      }),
    ]);
    return {
      salon,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      items: rows.map((row) => ({
        ...row,
        ultimaVisita: row.ultimaVisita?.toISOString() ?? null,
      })),
    };
  }

  async agendamentos(userId: string, query: AgendamentosListQueryDto) {
    const salon = await this.assertAccess(userId, query.salaoId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const date = query.date ?? todayInSalon();
    const where = {
      salaoId: salon.id,
      dataHora: dateRange(date),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.agendamento.count({ where }),
      this.prisma.agendamento.findMany({
        where,
        orderBy: [{ dataHora: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          dataHora: true,
          duracao: true,
          status: true,
          cliente: { select: { nome: true } },
          servico: { select: { nome: true } },
        },
      }),
    ]);
    return {
      salon,
      timezone: TIMEZONE,
      date,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      items: rows.map((row) => ({
        id: row.id,
        startsAt: row.dataHora.toISOString(),
        durationMinutes: row.duracao,
        status: row.status,
        clientName: row.cliente.nome,
        serviceName: row.servico.nome,
      })),
    };
  }
}
