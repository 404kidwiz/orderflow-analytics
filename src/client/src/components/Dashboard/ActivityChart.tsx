import { Card } from '../common/Card'
import { Spinner } from '../common/Spinner'
import { useTrades } from '../../hooks/useTrades'

export function ActivityChart() {
  const { data: trades, isLoading } = useTrades()

  // Group by block
  const blockMap = new Map<number, number>()
  if (trades) {
    for (const t of trades) {
      blockMap.set(t.blockNumber, (blockMap.get(t.blockNumber) ?? 0) + 1)
    }
  }

  const sortedBlocks = Array.from(blockMap.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-20)

  const maxCount = sortedBlocks.length > 0 ? Math.max(...sortedBlocks.map(([, c]) => c)) : 1

  return (
    <Card title="Swap Activity (Last 20 Blocks)">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : sortedBlocks.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-500">
          No data available
        </div>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {sortedBlocks.map(([block, count]) => {
            const height = (count / maxCount) * 100
            return (
              <div key={block} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-emerald-600/70 rounded-t transition-all hover:bg-emerald-500"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`Block ${block}: ${count} swaps`}
                />
                <span className="text-xs text-gray-600 font-mono transform -rotate-45 origin-top-left whitespace-nowrap">
                  #{block}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
