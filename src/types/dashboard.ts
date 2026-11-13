import { z } from 'zod';

const appointment = z.object({
  id: z.string(), startsAt: z.iso.datetime({ offset: true }), clientName: z.string(), serviceName: z.string(),
  status: z.enum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO', 'FALTOU']),
});

export const dashboardSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }), timezone: z.string().min(1),
  salon: z.object({ id: z.string(), name: z.string() }),
  metrics: z.object({
    today: z.object({ value: z.number(), change: z.number() }),
    week: z.object({ value: z.number(), percentageChange: z.number().nullable() }),
    clients: z.object({ value: z.number(), newThisMonth: z.number() }),
    pending: z.object({ value: z.number() }),
  }),
  upcoming: z.array(appointment),
});

export type DashboardOverview = z.infer<typeof dashboardSchema>;
