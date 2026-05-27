interface EmptyStateProps {
  message?: string
  children?: React.ReactNode
}

export function EmptyState({ message = 'No data available', children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-6m-9 0h6" />
      </svg>
      <p className="text-sm">{message}</p>
      {children}
    </div>
  )
}
