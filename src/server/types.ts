import { z } from 'zod'

// ─── Core orderflow types ────────────────────────────────────────────────────

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | ' TWAP' | 'arrival' | 'IOC' | 'FOK'
export type ExecAggression = 'maker' | 'taker' | 'internal'
export type SignalDirection = 'long' | 'short' | 'neutral'

export interface PriceLevel {
  price: bigint       // raw tick price
  size: bigint         // quantity at this level
  orderCount: number   // number of orders
}

export interface OrderBookSnapshot {
  bids: PriceLevel[]   // sorted descending
  asks: PriceLevel[]   // sorted ascending
  spread: bigint       // ask[0] - bid[0]
  spreadBps: number    // spread in basis points
  depth: bigint        // total size across top 10 levels
  timestamp: number    // ms since epoch
}

export interface TradeEvent {
  txHash: string
  blockNumber: number
  logIndex: number
  timestamp: number
  side: OrderSide
  price: bigint
  size: bigint
  taker: `0x${string}`
  maker: `0x${string}`
  gasPrice: bigint
  gasUsed: bigint
  isMEV: boolean
  mevType?: 'arbitrage' | 'frontrun' | 'backrun' | 'sandwich' | 'latency'
  pool: `0x${string}`
  tokenIn: `0x${string}`
  tokenOut: `0x${string}`
  route: `0x${string}`[]
  slippageBps: number
  priceImpactBps: number
  execAggression: ExecAggression
  nonce?: number
}

export interface ExecutionQuality {
  tradeId: string
  expectedPrice: bigint   // mid at decision time
  executedPrice: bigint   // actual fill price
  slippageBps: number
  priceImpactBps: number
  gasCostUSD: number
  netCostBps: number      // total cost including gas
  qualityScore: number     // 0–100
  verdict: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'
  takerRateUSD: number
}

export interface LiquiditySlice {
  token: `0x${string}`
  pool: `0x${string}`
  side: OrderSide
  size: bigint
  depth0: bigint          // depth at current price
  depth1: bigint          // depth 1% away
  depth5: bigint          // depth 5% away
  volatility24h: number   // realized vol
  skew: number            // bid-ask imbalance [-1, 1]
  timestamp: number
}

export interface Signal {
  id: string
  timestamp: number
  direction: SignalDirection
  confidence: number       // 0–1
  source: 'orderbook' | 'flow' | 'microstructure' | 'composite'
  triggers: string[]       // named reasons
  level: number            // signal strength 1–5
  market: `0x${string}`
}

export interface Alert {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'critical'
  code: string            // e.g. HIGH_SLIPPAGE, MEV_DETECTED
  message: string
  context: Record<string, unknown>
  txHash?: string
}

export interface WalletPosition {
  address: `0x${string}`
  token: `0x${string}`
  balance: bigint
  avgCost: bigint
  realizedPnL: bigint
  unrealizedPnL: bigint
  timestamp: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3100),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  CHAIN_ID: z.coerce.number().int().default(1),
  RPC_HTTP_URL: z.string().url(),
  RPC_WS_URL: z.string().url(),
  DB_PATH: z.string().default('./data/impeccable.db'),
  WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  SLIPPAGE_THRESHOLD_BPS: z.coerce.number().default(50),
  MEV_ALERT_THRESHOLD_GWEI: z.coerce.number().default(30),
  SIGNAL_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
})

export type Env = z.infer<typeof EnvSchema>