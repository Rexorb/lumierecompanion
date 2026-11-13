import { z } from 'zod';

export const statusSchema = z.enum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO', 'FALTOU']);
export type AppointmentStatus = z.infer<typeof statusSchema>;

const basePage = z.object({
  salon: z.object({ id: z.string(), name: z.string() }),
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(), hasMore: z.boolean(),
});

export const clientsPageSchema = basePage.extend({
  items: z.array(z.object({ id: z.string(), nome: z.string(), totalVisitas: z.number(), ultimaVisita: z.iso.datetime({ offset: true }).nullable() })),
});
export const appointmentsPageSchema = basePage.extend({
  date: z.string(), timezone: z.string(),
  items: z.array(z.object({ id: z.string(), startsAt: z.iso.datetime({ offset: true }), durationMinutes: z.number(), status: statusSchema, clientName: z.string(), serviceName: z.string() })),
});
export type Client = z.infer<typeof clientsPageSchema>['items'][number];
export type Appointment = z.infer<typeof appointmentsPageSchema>['items'][number];
