import { ForbiddenException } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { PrismaService } from '../../core/prisma/prisma.service';

describe('ConsultasService: acesso tenant-scoped', () => {
  const prisma = {
    usuarioSalao: { findFirst: jest.fn() },
    cliente: { count: jest.fn(), findMany: jest.fn() },
    agendamento: { count: jest.fn(), findMany: jest.fn() },
  };
  const service = new ConsultasService(prisma as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());

  it('nega salão sem vínculo ativo antes de acessar clientes ou agendamentos', async () => {
    prisma.usuarioSalao.findFirst.mockResolvedValue(null);
    await expect(
      service.clientes('user-a', { salaoId: 'salon-b' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.agendamentos('user-a', { salaoId: 'salon-b' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.cliente.findMany).not.toHaveBeenCalled();
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
    expect(prisma.usuarioSalao.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          usuarioId: 'user-a',
          salaoId: 'salon-b',
          salao: { ativo: true, deletedAt: null },
        },
      }),
    );
  });

  it('filtra clientes pelo salão e soft delete, projetando apenas campos permitidos', async () => {
    prisma.usuarioSalao.findFirst.mockResolvedValue({
      salao: { id: 'salon-a', nome: 'Salão' },
    });
    prisma.cliente.count.mockResolvedValue(1);
    prisma.cliente.findMany.mockResolvedValue([
      { id: 'c-1', nome: 'Pessoa', totalVisitas: 0, ultimaVisita: null },
    ]);
    const response = await service.clientes('user-a', {
      salaoId: 'salon-a',
      search: ' Pes ',
      page: 1,
      pageSize: 10,
    });
    expect(response.items).toEqual([
      { id: 'c-1', nome: 'Pessoa', totalVisitas: 0, ultimaVisita: null },
    ]);
    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          salaoId: 'salon-a',
          deletedAt: null,
          nome: { contains: 'Pes', mode: 'insensitive' },
        },
        select: {
          id: true,
          nome: true,
          totalVisitas: true,
          ultimaVisita: true,
        },
      }),
    );
  });

  it('usa limites locais do dia, não o fuso do celular, e pagina reservas', async () => {
    prisma.usuarioSalao.findFirst.mockResolvedValue({
      salao: { id: 'salon-a', nome: 'Salão' },
    });
    prisma.agendamento.count.mockResolvedValue(21);
    prisma.agendamento.findMany.mockResolvedValue([]);
    const response = await service.agendamentos('user-a', {
      salaoId: 'salon-a',
      date: '2026-11-12',
      page: 2,
      pageSize: 10,
      status: 'PENDENTE',
    });
    expect(response.hasMore).toBe(true);
    expect(response.timezone).toBe('America/Sao_Paulo');
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          salaoId: 'salon-a',
          dataHora: {
            gte: new Date('2026-11-12T00:00:00-03:00'),
            lt: new Date('2026-11-13T00:00:00-03:00'),
          },
          status: 'PENDENTE',
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('rejeita dia inexistente sem consultar agendamentos', async () => {
    prisma.usuarioSalao.findFirst.mockResolvedValue({
      salao: { id: 'salon-a', nome: 'Salão' },
    });
    await expect(
      service.agendamentos('user-a', {
        salaoId: 'salon-a',
        date: '2026-02-30',
      }),
    ).rejects.toThrow('Data inválida');
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
  });
});
