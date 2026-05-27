import pino from 'pino'
import type { Env } from './types.js'

export function buildLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
  })
}

export type Logger = ReturnType<typeof buildLogger>
