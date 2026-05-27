export interface TradeEvent {
  txHash: string
  blockNumber: number
  logIndex: number
  timestamp: number
  side: 'buy' | 'sell'
  price: string
  size: string
  taker: string
  maker: string
  gasPrice: string
  gasUsed: number
  isMEV: boolean
  mevType: string
  pool: string
  tokenIn: string
  tokenOut: string
  route: string[]
  slippageBps: number
  priceImpactBps: number
  execAggression: string
}

export interface Signal {
  id: string
  direction: 'long' | 'short' | 'neutral'
  confidence: number
  triggers: string[]
  blockNumber: number
  timestamp: number
  tokenPair: string
  price: string
  size: string
  market: string
  source: string
  level: number
}

export interface Alert {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'critical'
  code: string
  message: string
  context: Record<string, unknown>
  txHash?: string
}

export interface Metric {
  totalVolumeUSD: number
  avgQualityScore: number
  mevPercentage: number
  signalCount: number
  totalTrades: number
  avgSlippageBps: number
}
