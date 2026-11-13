import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusAgendamento } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const TIME_ZONE = 'America/Sao_Paulo';
const ACTIVE_APPOINTMENT_STATUSES = [
  StatusAgendamento.PENDENTE,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.CONCLUIDO,
];

type DateRange = { start: Date; end: Date };

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value('year'), month: value('month'), day: value('day') };
}

function saoPauloMidnight(year: number, month: number, day: number) {
  return new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-03:00`,
  );
}

function addCalendarDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateRangeForToday(now: Date): DateRange {
  const { year, month, day } = localDateParts(now);
  const start = saoPauloMidnight(year, month, day);
  return { start, end: addCalendarDays(start, 1) };
}

function dateRangeForWeek(now: Date): DateRange {
  const today = dateRangeForToday(now).start;
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const start = addCalendarDays(today, -mondayOffset);
  return { start, end: addCalendarDays(start, 7) };
}

function dateRangeForMonth(now: Date): DateRange {
  const { year, month } = localDateParts(now);
  const start = saoPauloMidnight(year, month, 1);
  const end =
    month === 12
      ? saoPauloMidnight(year + 1, 1, 1)
      : saoPauloMidnight(year, month + 1, 1);
  return { start, end };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, requestedSalaoId?: string) {
    const membership = await this.prisma.usuarioSalao.findFirst({
      where: {
        usuarioId: userId,
        ...(requestedSalaoId ? { salaoId: requestedSalaoId } : {}),
        salao: { ativo: true, deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      include: { salao: { include: { instanciaWhatsApp: true } } },
    });

    if (!membership) {
      if (requestedSalaoId) {
        throw new ForbiddenException('Você não tem acesso a este salão');
      }
      throw new NotFoundException(
        'Nenhum salão ativo foi encontrado para este usuário',
      );
    }

    const now = new Date();
    const today = dateRangeForToday(now);
    const yesterday: DateRange = {
      start: addCalendarDays(today.start, -1),
      end: today.start,
    };
    const week = dateRangeForWeek(now);
    const previousWeek: DateRange = {
      start: addCalendarDays(week.start, -7),
      end: week.start,
    };
    const month = dateRangeForMonth(now);
    const salaoId = membership.salaoId;

    const appointmentCount = (range: DateRange) =>
      this.prisma.agendamento.count({
        where: {
          salaoId,
          dataHora: { gte: range.start, lt: range.end },
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
        },
      });

    const [
      todayCount,
      yesterdayCount,
      weekCount,
      previousWeekCount,
      clientCount,
      newClients,
      pendingCount,
      upcoming,
    ] = await Promise.all([
      appointmentCount(today),
      appointmentCount(yesterday),
      appointmentCount(week),
      appointmentCount(previousWeek),
      this.prisma.cliente.count({ where: { salaoId, deletedAt: null } }),
      this.prisma.cliente.count({
        where: {
          salaoId,
          deletedAt: null,
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
      this.prisma.agendamento.count({
        where: { salaoId, status: StatusAgendamento.PENDENTE },
      }),
      this.prisma.agendamento.findMany({
        where: {
          salaoId,
          dataHora: { gte: now },
          status: {
            in: [StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO],
          },
        },
        include: {
          cliente: { select: { nome: true } },
          servico: { select: { nome: true } },
        },
        orderBy: { dataHora: 'asc' },
        take: 4,
      }),
    ]);

    const percentageChange = previousWeekCount
      ? Math.round(((weekCount - previousWeekCount) / previousWeekCount) * 100)
      : null;

    return {
      generatedAt: now.toISOString(),
      timezone: TIME_ZONE,
      salon: { id: membership.salao.id, name: membership.salao.nome },
      whatsapp: membership.salao.instanciaWhatsApp
        ? {
            number: membership.salao.instanciaWhatsApp.numero,
            status: membership.salao.instanciaWhatsApp.status,
          }
        : null,
      metrics: {
        today: { value: todayCount, change: todayCount - yesterdayCount },
        week: { value: weekCount, percentageChange },
        clients: { value: clientCount, newThisMonth: newClients },
        pending: { value: pendingCount },
      },
      upcoming: upcoming.map((appointment) => ({
        id: appointment.id,
        startsAt: appointment.dataHora.toISOString(),
        clientName: appointment.cliente.nome,
        serviceName: appointment.servico.nome,
        status: appointment.status,
      })),
    };
  }
}
