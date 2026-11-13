import { api } from './api';
import { appointmentsPageSchema } from '@/types/consultas';
import type { AppointmentStatus } from '@/types/consultas';

export async function getAppointments(salonId: string, date: string, status: AppointmentStatus | null, page: number) {
  const response = await api.get<unknown>('/agendamentos', { params: { salaoId: salonId, date, status: status ?? undefined, page, pageSize: 20 } });
  const parsed = appointmentsPageSchema.safeParse(response.data);
  if (!parsed.success || parsed.data.salon.id !== salonId || parsed.data.date !== date || parsed.data.page !== page) throw new Error('Resposta de agenda inesperada para o salão selecionado.');
  return parsed.data;
}
