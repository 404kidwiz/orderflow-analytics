
import type { FastifyInstance } from 'fastify'
import type { Logger } from '../logger.js'
import type { OrderFlowDB } from '../db/index.js'

function getLimit(q: unknown, fallback: number): number {
  const v = (q as Record<string, string | undefined>)['limit']
  return v ? Number(v) : fallback
}

export async function apiRoutes(fastify: FastifyInstance, { log, db }: { log: Logger; db: OrderFlowDB }) {
  fastify.get('/api/trades', async (req, reply) => {
    const limit = getLimit(req.query, 100)
    const trades = db.recentTrades(limit)
    return reply.send({ trades, count: trades.length })
  })

  fastify.get('/api/trades/mev', async (req, reply) => {
    const limit = getLimit(req.query, 50)
    return reply.send({ trades: db.mevTrades(limit), count: db.mevTrades(limit).length })
  })

  fastify.get('/api/signals', async (req, reply) => {
    const limit = getLimit(req.query, 50)
    return reply.send({ signals: db.recentSignals(limit), count: db.recentSignals(limit).length })
  })

  fastify.get('/api/alerts', async (req, reply) => {
    const limit = getLimit(req.query, 50)
    return reply.send({ alerts: db.recentAlerts(limit), count: db.recentAlerts(limit).length })
  })

  fastify.get('/api/quality', async (_req, reply) => {
    return reply.send({ stats: db.execQualityStats() })
  })

  fastify.get('/api/summary', async (_req, reply) => {
    const [trades, signals, alerts, quality] = [
      db.recentTrades(10),
      db.recentSignals(10),
      db.recentAlerts(10),
      db.execQualityStats(),
    ]
    return reply.send({
      now: Date.now(),
      recentTrades: trades.length,
      recentSignals: signals.length,
      recentAlerts: alerts.length,
      quality,
    })
  })

  log.info('API routes registered')
}
