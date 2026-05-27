import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { EmptyState } from '../common/EmptyState'
import { useSignals } from '../../hooks/useSignals'
import { formatAddress, timeAgo } from '../../lib/utils'
import type { Signal } from '../../types'

function SignalCard({ signal }: { signal: Signal }) {
  const directionVariant = signal.direction === 'long' ? 'buy' : signal.direction === 'short' ? 'sell' : 'default'

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-emerald-700/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={directionVariant}>{signal.direction.toUpperCase()}</Badge>
          <span className="text-xs font-mono text-gray-500">
            {formatAddress(signal.market)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-emerald-400">{Math.round(signal.confidence * 100)}%</div>
          <div className="text-xs text-gray-500">confidence</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {signal.triggers.map((trigger, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
            {trigger}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-600">Block #{signal.blockNumber}</span>
        <span className="text-xs text-gray-600">{timeAgo(signal.timestamp)}</span>
      </div>
    </div>
  )
}

export function SignalsList() {
  const { data: signals, isLoading } = useSignals()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!signals || signals.length === 0) {
    return <EmptyState message="No signals generated yet" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  )
}
