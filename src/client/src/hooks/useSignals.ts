import { useQuery } from '@tanstack/react-query'
import { getSignals } from '../api/signals'

export function useSignals() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: getSignals,
    refetchInterval: 10_000,
  })
}
