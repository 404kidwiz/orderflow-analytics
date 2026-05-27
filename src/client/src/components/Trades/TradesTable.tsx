import { useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { EmptyState } from '../common/EmptyState'
import { useTrades } from '../../hooks/useTrades'
import { formatAddress, formatNumber, formatTimestamp } from '../../lib/utils'
import type { TradeEvent } from '../../types'

const columnHelper = createColumnHelper<TradeEvent>()

const columns = [
  columnHelper.accessor('timestamp', {
    header: 'Time',
    cell: (info) => formatTimestamp(info.getValue()),
  }),
  columnHelper.accessor('blockNumber', {
    header: 'Block',
    cell: (info) => `#${info.getValue()}`,
  }),
  columnHelper.display({
    id: 'tokenPair',
    header: 'Token Pair',
    cell: ({ row }) => {
      const t = row.original
      if (!t.tokenIn || !t.tokenOut) return '—'
      return `${formatAddress(t.tokenIn)} → ${formatAddress(t.tokenOut)}`
    },
  }),
  columnHelper.accessor('side', {
    header: 'Side',
    cell: (info) => (
      <Badge variant={info.getValue() === 'buy' ? 'buy' : 'sell'}>
        {info.getValue().toUpperCase()}
      </Badge>
    ),
  }),
  columnHelper.accessor('size', {
    header: 'Size',
    cell: (info) => formatNumber(Number(info.getValue())),
  }),
  columnHelper.accessor('price', {
    header: 'Price',
    cell: (info) => `$${formatNumber(Number(info.getValue()))}`,
  }),
  columnHelper.accessor('isMEV', {
    header: 'MEV',
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="mev">{info.row.original.mevType || 'MEV'}</Badge>
      ) : (
        <span className="text-gray-600">—</span>
      ),
  }),
]

export function TradesTable() {
  const { data: trades, isLoading } = useTrades()
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: trades ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!trades || trades.length === 0) {
    return <EmptyState message="No trades recorded yet" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-800">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.isPlaceholder ? null : (
                    <button
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ),
                        desc: (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ),
                      }[header.column.getIsSorted() as string] ?? (
                        <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 font-mono text-gray-300">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
