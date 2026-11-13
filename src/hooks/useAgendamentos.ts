import { useInfiniteQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { getAppointments } from '@/services/agendamentos.service';
import type { AppointmentStatus } from '@/types/consultas';

export function useAgendamentos(date: string, status: AppointmentStatus | null) {
  const { user, salonId } = useAuth();
  return useInfiniteQuery({
    queryKey: ['agendamentos', user?.id, salonId, date, status],
    queryFn: ({ pageParam }) => getAppointments(salonId!, date, status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    enabled: !!user && !!salonId,
    staleTime: 15_000,
    retry: (count, error) => count < 1 && !(isAxiosError(error) && error.response != null),
  });
}
