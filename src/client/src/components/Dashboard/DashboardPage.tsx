import { MetricsGrid } from './MetricsGrid'
import { RecentTrades } from './RecentTrades'
import { ActivityChart } from './ActivityChart'
import { useMetrics } from '../../hooks/useMetrics'

export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useMetrics()

  return (
    <div className="space-y-6">
      <MetricsGrid data={metrics} loading={metricsLoading} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentTrades />
        <ActivityChart />
      </div>
    </div>
  )
}
