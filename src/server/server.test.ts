import { describe, it, expect } from 'vitest'
import { QualityScorer } from './execution/quality.js'
import type { TradeEvent } from './types.js'

const ETH = BigInt(10 ** 18)

const fakeTrade = (overrides: Partial<TradeEvent> = {}): TradeEvent => ({
  txHash: '0x' + 'a'.repeat(64),
  blockNumber: 1,
  logIndex: 0,
  timestamp: Date.now(),
  side: 'buy',
  price: BigInt(1000) * ETH,
  size: BigInt(1) * ETH,
  taker: '0x' + 'b'.repeat(40),
  maker: '0x' + 'c'.repeat(40),
  gasPrice: BigInt(20) * BigInt(10 ** 9),
  gasUsed: BigInt(150000),
  isMEV: false,
  pool: '0x' + 'd'.repeat(40),
  tokenIn: '0x' + 'e'.repeat(40),
  tokenOut: '0x' + 'f'.repeat(40),
  route: [],
  slippageBps: 0,
  priceImpactBps: 0,
  execAggression: 'taker',
  ...overrides,
}) as TradeEvent

describe('QualityScorer', () => {
  const scorer = new QualityScorer()
  const expected = BigInt(1000) * ETH

  it('rates excellent when slippage and cost are negligible', () => {
    const result = scorer.score(fakeTrade(), expected, 2000)
    expect(result.verdict).toBe('excellent')
    expect(result.qualityScore).toBeGreaterThanOrEqual(85)
  })

  it('rates poorly when slippage is high', () => {
    // price=1100e18, diff=100/1000=10% → 1000bps → slipScore=0, score=50
    const result = scorer.score(fakeTrade({ price: BigInt(1100) * ETH }), expected, 2000)
    expect(['fair', 'poor', 'bad']).toContain(result.verdict)
    expect(result.slippageBps).toBeGreaterThan(50)
  })

  it('penalizes MEV trades', () => {
    const noMev = scorer.score(fakeTrade(), expected, 2000)
    const mev = scorer.score(fakeTrade({ isMEV: true }), expected, 2000)
    expect(mev.qualityScore).toBeLessThan(noMev.qualityScore)
  })

  it('returns correct slippage bps computed from price delta', () => {
    // expected=1000e18, executed=1001e18 → diff/expected=0.001 = 10bps
    const executed = BigInt(1001) * ETH
    const result = scorer.score(fakeTrade({ price: executed }), expected, 2000)
    expect(result.slippageBps).toBe(10)
  })
})

describe('AlertManager', () => {
  it.todo('fires HIGH_SLIPPAGE when bps exceed threshold')
  it.todo('fires MEV_DETECTED when isMEV flag is true')
  it.todo('fires LARGE_TRADE when size exceeds threshold')
})
