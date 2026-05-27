import Fastify from 'fastify'
import cors from '@fastify/cors'
import configPlugin from './config/plugin.js'
import { buildLogger } from './logger.js'
import { OrderFlowDB } from './db/index.js'
import { SignalEngine } from './signals/engine.js'
import { QualityScorer } from './execution/quality.js'
import { AlertManager } from './alerts/manager.js'
import { buildClients } from './adapters/viem-client.js'
import { watchBlockNumber } from 'viem/actions'
import { apiRoutes } from './api/routes.js'

async function main() {
  const env = {
    NODE_ENV: (process.env['NODE_ENV'] ?? 'development') as 'development' | 'production' | 'test',
    PORT: Number(process.env['PORT'] ?? 3100),
    LOG_LEVEL: (process.env['LOG_LEVEL'] ?? 'info') as 'trace' | 'debug' | 'info' | 'warn' | 'error',
    CHAIN_ID: Number(process.env['CHAIN_ID'] ?? 1),
    RPC_HTTP_URL: process.env['RPC_HTTP_URL'] ?? 'http://127.0.0.1:8545',
    RPC_WS_URL: process.env['RPC_WS_URL'] ?? '',
    DB_PATH: process.env['DB_PATH'] ?? './data/impeccable.db',
    WALLET_ADDRESS: process.env['WALLET_ADDRESS'] ?? '0xe1D6b51521Bd4365769199f392F9818661BD907',
    SLIPPAGE_THRESHOLD_BPS: Number(process.env['SLIPPAGE_THRESHOLD_BPS'] ?? 50),
    MEV_ALERT_THRESHOLD_GWEI: Number(process.env['MEV_ALERT_THRESHOLD_GWEI'] ?? 30),
    SIGNAL_CONFIDENCE_THRESHOLD: Number(process.env['SIGNAL_CONFIDENCE_THRESHOLD'] ?? 0.65),
  }

  const log = buildLogger(env)

  const { mkdirSync } = await import('fs')
  mkdirSync('./data', { recursive: true })
  const db = new OrderFlowDB(env.DB_PATH, log)

  const signalEngine = new SignalEngine(log)
  const qualityScorer = new QualityScorer()
  const alertManager = new AlertManager(log)
  const { publicClient } = buildClients(env)

  // viem v2 requires explicit account: undefined for public clients
  const client = publicClient.extend(() => ({ account: undefined }))

  log.info({ env: env.NODE_ENV, port: env.PORT, chainId: env.CHAIN_ID, wallet: env.WALLET_ADDRESS }, 'Starting impeccable')

  const fastify = Fastify({ logger: false })

  await fastify.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] })
  await fastify.register(configPlugin)
  // @ts-ignore FastifyDecorations
  fastify.decorate('db', db)

  await fastify.register(apiRoutes, { log, db })

  fastify.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // ── Block stream ───────────────────────────────────────────────────────────
  const RECENT_TRADES: import('./types.js').TradeEvent[] = []
  const MAX_RECENT_TRADES = 200
  const BLOCK_WINDOW = 10n // look back N blocks for events

  log.info('Starting block stream watcher')

  const unwatch = watchBlockNumber(publicClient, {
    onBlockNumber: async (blockNumber: bigint) => {
      try {
        const { fetchSwapEvents, DEFAULT_POOLS } = await import('./adapters/dex-pool.js')
        const swaps = await fetchSwapEvents(publicClient, blockNumber, DEFAULT_POOLS)

        if (swaps.length === 0) return

        log.info({ blockNumber: Number(blockNumber), swapCount: swaps.length }, 'New block with swaps')

        for (const swap of swaps) {
          // Determine side from tokenIn vs token0
          const isBuy =
            swap.tokenIn.toLowerCase() === swap.token0.toLowerCase()

          // Price in token units (amountOut / amountIn), kept as number for USD calc
          const priceNum = swap.amountIn > 0n && swap.amountOut > 0n
            ? Number(swap.amountOut) / Number(swap.amountIn)
            : 0

          // USDC stablecoin decimals = 6; tokens above = 18
          const tokenInDecimals = swap.tokenIn === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' ||
                                   swap.tokenIn === '0xdAC17F958D2ee523a2206206994597C13D831ec7' ? 6 : 18
          const tokenOutDecimals = swap.tokenOut === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' ||
                                    swap.tokenOut === '0xdAC17F958D2ee523a2206206994597C13D831ec7' ? 6 : 18
          const amountInUSD = Number(swap.amountIn) / 10 ** tokenInDecimals * priceNum
          const takerRateUSD = amountInUSD

          // Simple slippage estimate: assume execution at current block baseFee
          const baseFeePerGas = 30_000_000n // ~30 gwei placeholder
          const slippageBps = swap.gasPrice > 0n
            ? Number((swap.gasPrice - baseFeePerGas) * 10000n / swap.gasPrice)
            : 0

          // MEV detection: gas price > 2x base fee suggests priority ordering
          const isMEV = swap.gasPrice > baseFeePerGas * 2n

          const mevType: 'sandwich' | 'arbitrage' | 'liquidation' | 'unknown' = isMEV ? 'arbitrage' : 'unknown'

          // Build token route array (addresses must be 0x-prefixed hex)
          const route: `0x${string}`[] = [swap.tokenIn, swap.tokenOut]

          // price: expressed in price units (out per in) as a raw bigint scaled to 1e18
          const price = swap.amountIn > 0n && swap.amountOut > 0n
            ? (swap.amountOut * 10n ** 18n) / swap.amountIn
            : 0n

          const tradeEvent: import('./types.js').TradeEvent = {
            txHash: swap.txHash,
            blockNumber: swap.blockNumber,
            logIndex: swap.logIndex,
            timestamp: swap.timestamp,
            side: isBuy ? 'buy' : 'sell',
            price,
            size: swap.amountIn,
            taker: swap.taker,
            maker: swap.pool,
            gasPrice: swap.gasPrice,
            gasUsed: swap.gasUsed,
            isMEV,
            mevType,
            pool: swap.pool,
            tokenIn: swap.tokenIn,
            tokenOut: swap.tokenOut,
            route,
            slippageBps,
            priceImpactBps: 0, // requires pre-trade oracle — simplified here
            execAggression: isMEV ? 'taker' : 'maker',
          }

          // ── DB insert ──────────────────────────────────────────────────
          await db.insertTrade(tradeEvent)

          // ── Quality scoring ─────────────────────────────────────────────
          const expectedPrice = price > 0n ? price : 0n
          const quality = qualityScorer.score(tradeEvent, expectedPrice, takerRateUSD)
          await db.insertExecQuality(quality)

          // ── Alerts ──────────────────────────────────────────────────────
          alertManager.checkSlippage(slippageBps, env.SLIPPAGE_THRESHOLD_BPS, tradeEvent.txHash)
          alertManager.checkMEV(isMEV, mevType, tradeEvent.txHash)
          alertManager.checkExecQuality(quality.qualityScore, tradeEvent.txHash)

          // ── Signal engine ───────────────────────────────────────────────
          const sig = signalEngine.compositeEvaluate(null, RECENT_TRADES)
          if (sig) {
            await db.insertSignal(sig)
            log.info({ signalId: sig.id, direction: sig.direction, confidence: sig.confidence, triggers: sig.triggers }, 'Signal generated')
          }

          // Maintain rolling window of recent trades for flow signal
          RECENT_TRADES.push(tradeEvent)
          if (RECENT_TRADES.length > MAX_RECENT_TRADES) RECENT_TRADES.shift()
        }
      } catch (err) {
        log.error({ err, blockNumber: Number(blockNumber) }, 'Block stream error')
      }
    },
    poll: true,
    pollingInterval: 12_000,
  })

  await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
  log.info(`Listening on http://0.0.0.0:${env.PORT}`)

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down')
    unwatch()
    await fastify.close()
    db.close()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
