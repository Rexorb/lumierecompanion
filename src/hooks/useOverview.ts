import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getOverview } from '@/services/overview.service';
import { useAuth } from '@/contexts/AuthContext';

export function useOverview() {
  const { user, salonId } = useAuth();
  return useQuery({
    queryKey: ['overview', user?.id, salonId],
    queryFn: () => getOverview(salonId!),
    enabled: !!user && !!salonId,
    staleTime: 30_000,
    retry: (count, error) => count < 1 && !(isAxiosError(error) && error.response != null),
  });
}
