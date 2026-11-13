import { api } from './api';
import { clientsPageSchema } from '@/types/consultas';

export async function getClients(salonId: string, search: string, page: number) {
  const response = await api.get<unknown>('/clientes', { params: { salaoId: salonId, search: search || undefined, page, pageSize: 20 } });
  const parsed = clientsPageSchema.safeParse(response.data);
  if (!parsed.success || parsed.data.salon.id !== salonId || parsed.data.page !== page) throw new Error('Resposta de clientes inesperada para o salão selecionado.');
  return parsed.data;
}
