import { useQuery } from '@tanstack/react-query'
import { getTrades } from '../api/trades'

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: getTrades,
    refetchInterval: 10_000,
  })
}
