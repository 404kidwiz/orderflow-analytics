import { apiFetch } from './client'
import type { TradeEvent } from '../types'

export async function getTrades(): Promise<TradeEvent[]> {
  return apiFetch<TradeEvent[]>('/api/trades')
}

export async function getTradesByBlock(blockNumber: number): Promise<TradeEvent[]> {
  return apiFetch<TradeEvent[]>(`/api/trades?block=${blockNumber}`)
}
