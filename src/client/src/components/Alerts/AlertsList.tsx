import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { EmptyState } from '../common/EmptyState'
import { useAlerts } from '../../hooks/useAlerts'
import { formatTimestamp } from '../../lib/utils'
import type { Alert } from '../../types'

function AlertCard({ alert }: { alert: Alert }) {
  const levelVariant = alert.level === 'critical' ? 'critical' : alert.level === 'warn' ? 'warn' : 'info'

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      alert.level === 'critical'
        ? 'border-red-700/50 bg-red-900/10'
        : alert.level === 'warn'
        ? 'border-yellow-700/50 bg-yellow-900/10'
        : 'border-blue-700/50 bg-blue-900/10'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <Badge variant={levelVariant}>{alert.code}</Badge>
        <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{alert.message}</p>
      {alert.txHash && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-600 font-mono break-all">{alert.txHash}</span>
        </div>
      )}
    </div>
  )
}

export function AlertsList() {
  const { data: alerts, isLoading } = useAlerts()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!alerts || alerts.length === 0) {
    return <EmptyState message="No alerts triggered" />
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
