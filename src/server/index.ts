import Fastify from 'fastify'
import cors from '@fastify/cors'
import configPlugin from './config/plugin.js'
import { buildLogger } from './logger.js'
import { OrderFlowDB } from './db/index.js'
import { SignalEngine } from './signals/engine.js'
import { QualityScorer } from './execution/quality.js'
import { AlertManager } from './alerts/manager.js'
import { buildClients } from './adapters/viem-client.js'
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

  log.info({ env: env.NODE_ENV, port: env.PORT, chainId: env.CHAIN_ID, wallet: env.WALLET_ADDRESS }, 'Starting impeccable')

  const fastify = Fastify({ logger: false })

  await fastify.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] })
  await fastify.register(configPlugin)
  // @ts-ignore FastifyDecorations
  fastify.decorate('db', db)

  await fastify.register(apiRoutes, { log, db })

  fastify.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // TODO(wire): block stream — publicClient.watchBlockNumber → TradeEvent → db + alerts + signals
  // TODO(wire): DEX pool Transfer events via viem eth_getLogs / subscribe
  // TODO(wire): for each trade:
  //   db.insertTrade(event)
  //   const quality = qualityScorer.score(event, expectedPrice, takerRateUSD)
  //   db.insertExecQuality(quality)
  //   alertManager.checkSlippage(event.slippageBps, env.SLIPPAGE_THRESHOLD_BPS, event.txHash)
  //   alertManager.checkMEV(event.isMEV, event.mevType ?? 'unknown', event.txHash)
  //   const sig = signalEngine.compositeEvaluate(orderBook, recentTrades)
  //   if (sig) db.insertSignal(sig)

  await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
  log.info(`Listening on http://0.0.0.0:${env.PORT}`)

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down')
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