import { apiFetch } from './client'
import type { Alert } from '../types'

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>('/api/alerts')
}
