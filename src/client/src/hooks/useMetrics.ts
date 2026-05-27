import { useQuery } from '@tanstack/react-query'
import { getMetrics } from '../api/metrics'

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  })
}
