import { createPublicClient, http, webSocket } from 'viem'
import type { Env } from '../types.js'

export function buildClients(env: Env) {
  const publicClient = createPublicClient({
    transport: env.RPC_WS_URL ? webSocket(env.RPC_WS_URL) : http(env.RPC_HTTP_URL),
    chain: env.CHAIN_ID === 1
      ? { id: 1, name: 'Ethereum', network: 'homestead', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_HTTP_URL] } } }
      : ({ id: env.CHAIN_ID, name: `Chain ${env.CHAIN_ID}`, network: `chain-${env.CHAIN_ID}`, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_HTTP_URL] } } } as const),
  })

  return { publicClient }
}