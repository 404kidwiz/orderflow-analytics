import type { Logger } from '../logger.js'
import type { Alert } from '../types.js'
import { randomUUID } from 'crypto'

const ALERT_CODES = {
  HIGH_SLIPPAGE: 'HIGH_SLIPPAGE',
  MEV_DETECTED: 'MEV_DETECTED',
  LOW_LIQUIDITY: 'LOW_LIQUIDITY',
  SIGNAL_TRIGGERED: 'SIGNAL_TRIGGERED',
  EXEC_QUALITY_BAD: 'EXEC_QUALITY_BAD',
  WALLET_FLUCTUATION: 'WALLET_FLUCTUATION',
} as const

export class AlertManager {
  private log: Logger

  constructor(log: Logger) {
    this.log = log
  }

  emit(code: keyof typeof ALERT_CODES, level: Alert['level'], message: string, context: Record<string, unknown> = {}, txHash?: string): Alert {
    const alert: Alert = {
      id: randomUUID(),
      timestamp: Date.now(),
      level,
      code: ALERT_CODES[code],
      message,
      context,
      txHash,
    }
    if (level === 'critical') this.log.error({ alertId: alert.id, code: alert.code, txHash }, alert.message)
    else if (level === 'warn') this.log.warn({ alertId: alert.id, code: alert.code, txHash }, alert.message)
    else this.log.info({ alertId: alert.id, code: alert.code, txHash }, alert.message)
    return alert
  }

  checkSlippage(slippageBps: number, thresholdBps: number, txHash: string) {
    if (slippageBps > thresholdBps) {
      return this.emit('HIGH_SLIPPAGE', slippageBps > thresholdBps * 2 ? 'critical' : 'warn',
        `Slippage ${slippageBps}bps exceeds threshold ${thresholdBps}bps`, { slippageBps, thresholdBps }, txHash)
    }
  }

  checkMEV(isMEV: boolean, mevType: string, txHash: string) {
    if (isMEV) {
      return this.emit('MEV_DETECTED', 'warn', `MEV ${mevType} detected on tx`, { mevType }, txHash)
    }
  }

  checkExecQuality(qualityScore: number, txHash: string) {
    if (qualityScore < 30) {
      return this.emit('EXEC_QUALITY_BAD', 'critical', `Execution quality score ${qualityScore} — bad`, { qualityScore }, txHash)
    } else if (qualityScore < 60) {
      return this.emit('EXEC_QUALITY_BAD', 'warn', `Execution quality score ${qualityScore} — poor`, { qualityScore }, txHash)
    }
  }
}