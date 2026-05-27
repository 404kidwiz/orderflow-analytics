import type { PublicClient, Hash } from 'viem'

// ─── Uniswap V2 ───────────────────────────────────────────────────────────────
const UNISWAP_V2_SWAP_TOPIC0 =
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822' as const

// ─── Uniswap V3 ───────────────────────────────────────────────────────────────
const UNISWAP_V3_SWAP_TOPIC0 =
  '0xc42079f94a6350d7e6235f29174924f368cc15031699e3a24368793381424c0a' as const

export interface PoolConfig {
  address: Hash
  version: 2 | 3
  token0: Hash
  token1: Hash
}

// Default WETH/USDC 5bps Uniswap V3 pool on mainnet
export const DEFAULT_POOLS: PoolConfig[] = [
  {
    address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', // WETH/USDC 5bps
    version: 3,
    token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  },
  {
    address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', // WETH/USDC 30bps
    version: 3,
    token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  },
  {
    address: '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36', // WETH/USDT 30bps
    version: 3,
    token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    token1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  },
  {
    address: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852', // WETH/USDT V2
    version: 2,
    token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    token1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  },
  {
    address: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc', // USDC/WETH V2
    version: 2,
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  },
]

export interface ParsedSwap {
  pool: Hash
  version: 2 | 3
  token0: Hash
  token1: Hash
  tokenIn: Hash
  tokenOut: Hash
  amountIn: bigint
  amountOut: bigint
  taker: Hash
  txHash: Hash
  blockNumber: number
  logIndex: number
  timestamp: number
  gasPrice: bigint
  gasUsed: bigint
}

interface RawLog {
  address: string
  topics: string[]
  data: string
  transactionHash: string
  blockNumber: string
  logIndex: string
}

export async function fetchSwapEvents(
  client: PublicClient,
  blockNumber: bigint,
  pools: PoolConfig[],
): Promise<ParsedSwap[]> {
  // Fetch logs per pool
  const settled = await Promise.allSettled(
    pools.map((pool) =>
      (client.transport.request as (req: { method: string; params: unknown[] }) => Promise<RawLog[]>)({
        method: 'eth_getLogs',
        params: [
          {
            address: pool.address,
            topics: [UNISWAP_V2_SWAP_TOPIC0],
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
          },
        ],
      }),
    ),
  )

  const allRaw: RawLog[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allRaw.push(...result.value)
    }
  }

  if (allRaw.length === 0) return []

  // Batch-fetch receipts
  const txHashes = [...new Set(allRaw.map((l) => l.transactionHash))]
  const receiptSettled = await Promise.allSettled(
    txHashes.map((h) => client.getTransactionReceipt({ hash: h as Hash })),
  )

  const receiptMap = new Map<string, { gasPrice: bigint; gasUsed: bigint }>()
  for (const r of receiptSettled) {
    if (r.status === 'fulfilled') {
      // viem v2 TransactionReceipt uses effectiveGasPrice; gasUsed always present
      receiptMap.set(r.value.transactionHash, {
        gasPrice: r.value.effectiveGasPrice ?? 0n,
        gasUsed: r.value.gasUsed ?? 0n,
      })
    }
  }

  const block = await client.getBlock({ blockNumber })

  const parsed: ParsedSwap[] = allRaw.map((log) => {
    const data = log.data.slice(2)
    const pool = pools.find(
      (p) => p.address.toLowerCase() === (log.address ?? '').toLowerCase(),
    )!

    // Uniswap V2 Swap ABI decode:
    // topics[0]=sig, topics[1]=sender, topics[2]=to
    // data: amount0In(256), amount1In(256), amount0Out(256), amount1Out(256)
    const takerRaw = (log.topics[2] ?? '0x' + '0'.repeat(40)).slice(-40)
    const dataWords = data.match(/.{1,64}/g) ?? []
    const amount0In = BigInt('0x' + (dataWords[0] ?? '0'))
    const amount1In = BigInt('0x' + (dataWords[1] ?? '0'))
    const amount0Out = BigInt('0x' + (dataWords[2] ?? '0'))
    const amount1Out = BigInt('0x' + (dataWords[3] ?? '0'))

    const amountIn = amount0In > 0n ? amount0In : amount1In
    const amountOut = amount0Out > 0n ? amount0Out : amount1Out
    const tokenIn: Hash = amount0In > 0n ? pool.token0 : pool.token1
    const tokenOut: Hash = amount0Out > 0n ? pool.token0 : pool.token1

    const receipt = receiptMap.get(log.transactionHash)
    const gasPrice = receipt?.gasPrice ?? 0n
    const gasUsed = receipt?.gasUsed ?? 0n

    return {
      pool: pool.address,
      version: pool.version,
      token0: pool.token0,
      token1: pool.token1,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      taker: `0x${takerRaw}` as Hash,
      txHash: log.transactionHash as Hash,
      blockNumber: parseInt(log.blockNumber, 16),
      logIndex: parseInt(log.logIndex, 16),
      timestamp: Number(block.timestamp) * 1000,
      gasPrice,
      gasUsed,
    }
  })

  return parsed
}
