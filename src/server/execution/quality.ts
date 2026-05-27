import type { ExecutionQuality, TradeEvent } from '../types.js'
import { randomUUID } from 'crypto'

export class QualityScorer {
  score(e: TradeEvent, expectedPrice: bigint, takerRateUSD: number): ExecutionQuality {
    const slippageBps = expectedPrice > 0n
      ? Number((BigInt(Math.abs(Number(e.price - expectedPrice))) * 10000n) / expectedPrice)
      : 0

    const netGasCost = Number(e.gasUsed) * Number(e.gasPrice) / 1e18 * takerRateUSD
    const tradeValue = Number(e.size) * Number(e.price) / 1e18
    const netCostBps = tradeValue > 0 ? (netGasCost / tradeValue) * 10_000 : 0

    const qualityScore = this.calcScore(slippageBps, netCostBps, e.isMEV)
    const verdict = this.verdict(qualityScore)

    return {
      tradeId: e.txHash,
      expectedPrice,
      executedPrice: e.price,
      slippageBps,
      priceImpactBps: e.priceImpactBps,
      gasCostUSD: netGasCost,
      netCostBps,
      qualityScore,
      verdict,
      takerRateUSD,
    }
  }

  private calcScore(slippageBps: number, netCostBps: number, isMEV: boolean): number {
    const slipScore = Math.max(0, 100 - slippageBps * 4)
    const costScore = Math.max(0, 100 - netCostBps * 20)
    const mevPenalty = isMEV ? -30 : 0
    return Math.round(Math.max(0, Math.min(100, (slipScore * 0.5 + costScore * 0.5 + mevPenalty))))
  }

  private verdict(score: number): ExecutionQuality['verdict'] {
    if (score >= 85) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 50) return 'fair'
    if (score >= 30) return 'poor'
    return 'bad'
  }
}