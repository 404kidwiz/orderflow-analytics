import { apiFetch } from './client'
import type { Metric } from '../types'

export async function getMetrics(): Promise<Metric> {
  return apiFetch<Metric>('/api/metrics')
}
