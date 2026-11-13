import { useInfiniteQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { getClients } from '@/services/clientes.service';

export function useClientes(search: string) {
  const { user, salonId } = useAuth();
  return useInfiniteQuery({
    queryKey: ['clientes', user?.id, salonId, search],
    queryFn: ({ pageParam }) => getClients(salonId!, search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    enabled: !!user && !!salonId,
    staleTime: 30_000,
    retry: (count, error) => count < 1 && !(isAxiosError(error) && error.response != null),
  });
}
