import { apiFetch } from './client'
import type { Signal } from '../types'

export async function getSignals(): Promise<Signal[]> {
  return apiFetch<Signal[]>('/api/signals')
}
