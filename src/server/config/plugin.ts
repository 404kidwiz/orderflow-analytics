import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { EnvSchema } from '../types.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: z.infer<typeof EnvSchema>
  }
}

async function configPlugin(fastify: FastifyInstance) {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    fastify.log.error({ errors: parsed.error.flatten() }, 'Invalid environment')
    throw new Error('Invalid environment variables')
  }
  fastify.decorate('config', parsed.data)
}

export default fp(configPlugin, {
  name: 'config',
  fastify: '5.x',
})