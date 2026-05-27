# impeccable

Real-time orderflow analytics for onchain trading — Level 2 orderbook, MEV detection, and execution quality scoring.

## Stack

- **Runtime**: Node.js, TypeScript (strict), ESM
- **Server**: Fastify 5 + `@fastify/cors`
- **Blockchain**: `viem` for chain access
- **DB**: `better-sqlite3` (WAL mode)
- **Logging**: `pino` + `pino-pretty`
- **Validation**: `zod`
- **Tests**: `vitest`

## Architecture

```
src/
  server/
    config/plugin.ts     — Fastify env plugin (zod-validated)
    types.ts             — shared types + EnvSchema
    logger.ts            — pino logger builder
    db/index.ts          — OrderFlowDB (SQLite WAL)
    adapters/viem-client.ts — public + wallet clients
    alerts/manager.ts    — AlertManager (slippage, MEV, quality)
    signals/engine.ts    — SignalEngine (orderbook + flow)
    execution/quality.ts — QualityScorer
    api/routes.ts        — REST endpoints
  server.ts              — entry point
  server.test.ts         — unit tests
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/api/summary` | Top-level stats |
| GET | `/api/trades` | Recent trades (limit=N) |
| GET | `/api/trades/mev` | Recent MEV trades |
| GET | `/api/signals` | Recent signals |
| GET | `/api/alerts` | Recent alerts |
| GET | `/api/quality` | Exec quality stats |

## Setup

```bash
cp .env.example .env
# Fill in RPC_HTTP_URL, RPC_WS_URL, WALLET_ADDRESS
pnpm install
pnpm dev
```

## Signals

**Orderbook signals** — bid/ask depth imbalance, wide spread detection  
**Flow signals** — heavy buy/sell volume ratio, MEV activity  
**Composite** — picks the strongest signal above confidence threshold

## Quality Scoring

Slippage (50%) + gas cost (50%) = raw score  
MEV penalty: −30 points  
0–29: bad | 30–49: poor | 50–69: fair | 70–84: good | 85–100: excellent

## Alert Codes

`HIGH_SLIPPAGE` · `MEV_DETECTED` · `LOW_LIQUIDITY` · `SIGNAL_TRIGGERED` · `EXEC_QUALITY_BAD` · `WALLET_FLUCTUATION`