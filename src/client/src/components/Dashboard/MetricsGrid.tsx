import { Card } from '../common/Card'
import { Spinner } from '../common/Spinner'
import { formatUSD, formatNumber, formatCompact } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  loading?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function StatCard({ label, value, subtext, loading, variant = 'default' }: StatCardProps) {
  const valueColors: Record<string, string> = {
    default: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400',
  }

  return (
    <Card>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="mt-2"><Spinner /></div>
      ) : (
        <>
          <p className={`text-2xl font-bold font-mono mt-1 ${valueColors[variant]}`}>{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </>
      )}
    </Card>
  )
}

interface MetricsGridProps {
  data?: {
    totalVolumeUSD: number
    avgQualityScore: number
    mevPercentage: number
    signalCount: number
    totalTrades: number
    avgSlippageBps: number
  }
  loading?: boolean
}

export function MetricsGrid({ data, loading }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Volume"
        value={data ? formatUSD(data.totalVolumeUSD) : '—'}
        subtext={data ? `${formatCompact(data.totalTrades)} trades` : undefined}
        loading={loading}
      />
      <StatCard
        label="Avg Quality Score"
        value={data ? `${formatNumber(data.avgQualityScore)}` : '—'}
        subtext={data ? 'out of 100' : undefined}
        loading={loading}
        variant={data && data.avgQualityScore >= 80 ? 'success' : data && data.avgQualityScore >= 50 ? 'warning' : 'danger'}
      />
      <StatCard
        label="MEV Activity"
        value={data ? `${formatNumber(data.mevPercentage, 1)}%` : '—'}
        subtext="of all trades"
        loading={loading}
        variant={data && data.mevPercentage > 30 ? 'warning' : 'default'}
      />
      <StatCard
        label="Active Signals"
        value={data ? String(data.signalCount) : '—'}
        loading={loading}
        variant="info"
      />
    </div>
  )
}
