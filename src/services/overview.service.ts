import { api } from './api';
import { dashboardSchema } from '@/types/dashboard';

export async function getOverview(salonId: string) {
  const { data } = await api.get<unknown>('/dashboard/overview', { params: { salaoId: salonId } });
  const parsed = dashboardSchema.safeParse(data);
  if (!parsed.success || parsed.data.salon.id !== salonId) throw new Error('O painel retornou dados inesperados para o salão selecionado.');
  return parsed.data;
}
