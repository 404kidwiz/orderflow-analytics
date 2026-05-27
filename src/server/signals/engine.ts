import type { Logger } from '../logger.js'
import type { Signal, SignalDirection, OrderBookSnapshot, TradeEvent } from '../types.js'
import { randomUUID } from 'crypto'

export class SignalEngine {
  private log: Logger

  constructor(log: Logger) {
    this.log = log
  }

  evaluateOrderBook(book: OrderBookSnapshot): Signal | null {
    const bidDepth = book.bids.slice(0, 5).reduce((s, l) => s + l.size, 0n)
    const askDepth = book.asks.slice(0, 5).reduce((s, l) => s + l.size, 0n)
    const imbalance = Number(bidDepth - askDepth) / (Number(bidDepth + askDepth) || 1)

    const triggers: string[] = []
    let direction: SignalDirection = 'neutral'
    let confidence = 0

    if (imbalance > 0.3) {
      triggers.push('buy_side_depth_surge')
      direction = 'long'
      confidence = Math.min(imbalance, 0.9)
    } else if (imbalance < -0.3) {
      triggers.push('sell_side_depth_surge')
      direction = 'short'
      confidence = Math.min(Math.abs(imbalance), 0.9)
    }

    const spreadBps = book.spreadBps
    if (spreadBps > 50) triggers.push('wide_spread')
    if (book.spread < 0n) triggers.push('negative_spread')

    if (direction !== 'neutral' && confidence >= 0.3) {
      const signal: Signal = {
        id: randomUUID(),
        timestamp: Date.now(),
        direction,
        confidence,
        source: 'orderbook',
        triggers,
        level: Math.ceil(confidence * 5),
        market: '0x0000000000000000000000000000000000000000',
      }
      this.log.debug({ signalId: signal.id, direction, confidence, triggers }, 'Orderbook signal generated')
      return signal
    }

    return null
  }

  evaluateFlow(events: TradeEvent[]): Signal | null {
    if (events.length < 5) return null

    let buyVol = 0n
    let sellVol = 0n
    let buyCount = 0
    let sellCount = 0
    let mevCount = 0

    for (const e of events) {
      if (e.side === 'buy') { buyVol += e.size; buyCount++ }
      else { sellVol += e.size; sellCount++ }
      if (e.isMEV) mevCount++
    }

    const totalVol = buyVol + sellVol || 1n
    const flowRatio = Number(buyVol - sellVol) / Number(totalVol)
    const mevRatio = mevCount / events.length

    const triggers: string[] = []
    let direction: SignalDirection = 'neutral'
    let confidence = 0

    if (flowRatio > 0.4) {
      triggers.push('heavy_buy_flow')
      direction = 'long'
      confidence = Math.min(Math.abs(flowRatio), 0.9)
    } else if (flowRatio < -0.4) {
      triggers.push('heavy_sell_flow')
      direction = 'short'
      confidence = Math.min(Math.abs(flowRatio), 0.9)
    }

    if (mevRatio > 0.3) triggers.push(`high_mev_activity:${mevRatio.toFixed(2)}`)

    if (direction !== 'neutral' && confidence >= 0.3) {
      const signal: Signal = {
        id: randomUUID(),
        timestamp: Date.now(),
        direction,
        confidence,
        source: 'flow',
        triggers,
        level: Math.ceil(confidence * 5),
        market: events[0]?.pool ?? '0x0000000000000000000000000000000000000000',
      }
      this.log.debug({ signalId: signal.id, direction, confidence, triggers, flowRatio }, 'Flow signal generated')
      return signal
    }

    return null
  }

  compositeEvaluate(book: OrderBookSnapshot | null, recentTrades: TradeEvent[]): Signal | null {
    // Try orderbook signal first, then flow, return first strong enough
    const bookSignal = book ? this.evaluateOrderBook(book) : null
    if (bookSignal && bookSignal.confidence >= 0.5) return bookSignal

    const flowSignal = this.evaluateFlow(recentTrades)
    if (flowSignal && flowSignal.confidence >= 0.4) return flowSignal

    return bookSignal ?? flowSignal ?? null
  }
}