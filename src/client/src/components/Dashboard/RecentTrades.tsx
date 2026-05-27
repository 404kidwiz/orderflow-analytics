import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { EmptyState } from '../common/EmptyState'
import { useTrades } from '../../hooks/useTrades'
import { formatAddress, formatNumber, formatTimestamp } from '../../lib/utils'
import type { TradeEvent } from '../../types'

function TradeRow({ trade }: { trade: TradeEvent }) {
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="px-3 py-2 text-xs font-mono text-gray-400">
        {formatTimestamp(trade.timestamp)}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-300">
        #{trade.blockNumber}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-300 max-w-[120px] truncate">
        {trade.tokenIn && trade.tokenOut
          ? `${formatAddress(trade.tokenIn)} → ${formatAddress(trade.tokenOut)}`
          : '—'}
      </td>
      <td className="px-3 py-2">
        <Badge variant={trade.side === 'buy' ? 'buy' : 'sell'}>
          {trade.side.toUpperCase()}
        </Badge>
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-300 text-right">
        {formatNumber(Number(trade.size))}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-300 text-right">
        ${formatNumber(Number(trade.price))}
      </td>
      <td className="px-3 py-2 text-center">
        {trade.isMEV ? (
          <Badge variant="mev">{trade.mevType || 'MEV'}</Badge>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
    </tr>
  )
}

export function RecentTrades() {
  const { data: trades, isLoading } = useTrades()

  return (
    <Card title="Recent Swaps">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !trades || trades.length === 0 ? (
        <EmptyState message="No recent swaps" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Block</th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-left font-medium">Side</th>
                <th className="px-3 py-2 text-right font-medium">Size</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-center font-medium">MEV</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 20).map((trade, i) => (
                <TradeRow key={`${trade.txHash}-${i}`} trade={trade} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
