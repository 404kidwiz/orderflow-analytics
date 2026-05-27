import Database from 'better-sqlite3'
import type { Logger } from '../logger.js'
import type { TradeEvent, ExecutionQuality, Signal, Alert, LiquiditySlice } from '../types.js'

export class OrderFlowDB {
  private db: Database.Database

  constructor(dbPath: string, log: Logger) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.init(log)
  }

  private init(log: Logger) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash      TEXT    NOT NULL UNIQUE,
        block_number INTEGER NOT NULL,
        log_index    INTEGER NOT NULL,
        timestamp    INTEGER NOT NULL,
        side         TEXT    NOT NULL,
        price        TEXT    NOT NULL,
        size         TEXT    NOT NULL,
        taker        TEXT    NOT NULL,
        maker        TEXT    NOT NULL,
        gas_price    TEXT    NOT NULL,
        gas_used     TEXT    NOT NULL,
        is_mev       INTEGER NOT NULL DEFAULT 0,
        mev_type     TEXT,
        pool         TEXT    NOT NULL,
        token_in     TEXT    NOT NULL,
        token_out    TEXT    NOT NULL,
        slippage_bps INTEGER,
        price_impact_bps INTEGER,
        exec_aggression TEXT,
        created_at   INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS exec_quality (
        id            TEXT PRIMARY KEY,
        trade_id      TEXT,
        expected_price TEXT,
        executed_price TEXT,
        slippage_bps  INTEGER,
        price_impact_bps INTEGER,
        gas_cost_usd  REAL,
        net_cost_bps  REAL,
        quality_score INTEGER,
        verdict       TEXT,
        taker_rate_usd REAL,
        created_at    INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (trade_id) REFERENCES trades(tx_hash)
      );

      CREATE TABLE IF NOT EXISTS signals (
        id          TEXT PRIMARY KEY,
        timestamp   INTEGER NOT NULL,
        direction   TEXT    NOT NULL,
        confidence  REAL    NOT NULL,
        source      TEXT    NOT NULL,
        triggers    TEXT    NOT NULL,
        level       INTEGER NOT NULL,
        market      TEXT    NOT NULL,
        created_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id          TEXT PRIMARY KEY,
        timestamp   INTEGER NOT NULL,
        level       TEXT    NOT NULL,
        code        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        context     TEXT,
        tx_hash     TEXT,
        created_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS liquidity_slices (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        token       TEXT    NOT NULL,
        pool        TEXT    NOT NULL,
        side        TEXT    NOT NULL,
        size        TEXT    NOT NULL,
        depth0      TEXT    NOT NULL,
        depth1      TEXT    NOT NULL,
        depth5      TEXT    NOT NULL,
        volatility  REAL,
        skew        REAL,
        timestamp   INTEGER NOT NULL,
        created_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_trades_pool      ON trades(pool);
      CREATE INDEX IF NOT EXISTS idx_trades_mev       ON trades(is_mev);
      CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_signals_market   ON signals(market);
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp  ON alerts(timestamp DESC);
    `)
    log.info('Database initialized')
  }

  insertTrade(t: TradeEvent): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO trades (
        tx_hash, block_number, log_index, timestamp, side, price, size,
        taker, maker, gas_price, gas_used, is_mev, mev_type, pool,
        token_in, token_out, slippage_bps, price_impact_bps, exec_aggression
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      t.txHash, t.blockNumber, t.logIndex, t.timestamp, t.side,
      t.price.toString(), t.size.toString(), t.taker, t.maker,
      t.gasPrice.toString(), t.gasUsed.toString(), t.isMEV ? 1 : 0,
      t.mevType ?? null, t.pool, t.tokenIn, t.tokenOut,
      t.slippageBps, t.priceImpactBps, t.execAggression
    )
  }

  insertExecQuality(e: ExecutionQuality): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO exec_quality (
        id, trade_id, expected_price, executed_price, slippage_bps,
        price_impact_bps, gas_cost_usd, net_cost_bps, quality_score, verdict, taker_rate_usd
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      e.tradeId, e.tradeId, e.expectedPrice.toString(), e.executedPrice.toString(),
      e.slippageBps, e.priceImpactBps, e.gasCostUSD, e.netCostBps,
      e.qualityScore, e.verdict, e.takerRateUSD
    )
  }

  insertSignal(s: Signal): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO signals (id, timestamp, direction, confidence, source, triggers, level, market)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(s.id, s.timestamp, s.direction, s.confidence, s.source, JSON.stringify(s.triggers), s.level, s.market)
  }

  insertAlert(a: Alert): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO alerts (id, timestamp, level, code, message, context, tx_hash)
      VALUES (?,?,?,?,?,?,?)
    `).run(a.id, a.timestamp, a.level, a.code, a.message, JSON.stringify(a.context), a.txHash ?? null)
  }

  recentTrades(limit = 100): TradeEvent[] {
    return this.db.prepare(`
      SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as TradeEvent[]
  }

  mevTrades(limit = 50): TradeEvent[] {
    return this.db.prepare(`
      SELECT * FROM trades WHERE is_mev = 1 ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as TradeEvent[]
  }

  recentSignals(limit = 50): Signal[] {
    return this.db.prepare(`
      SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Signal[]
  }

  recentAlerts(limit = 50): Alert[] {
    return this.db.prepare(`
      SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Alert[]
  }

  execQualityStats(): { avgScore: number; badCount: number; totalCount: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total_count,
        AVG(quality_score) as avg_score,
        SUM(CASE WHEN verdict = 'bad' THEN 1 ELSE 0 END) as bad_count
      FROM exec_quality
    `).get() as { total_count: number; avg_score: number; bad_count: number }
    return { avgScore: row.avg_score ?? 0, badCount: row.bad_count ?? 0, totalCount: row.total_count ?? 0 }
  }

  close() {
    this.db.close()
  }
}
