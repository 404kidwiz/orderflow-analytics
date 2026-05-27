interface BadgeProps {
  variant: 'default' | 'buy' | 'sell' | 'mev' | 'info' | 'warn' | 'critical'
  children: React.ReactNode
  className?: string
}

const variants = {
  default: 'bg-gray-700 text-gray-200',
  buy: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700',
  sell: 'bg-red-900/50 text-red-400 border border-red-700',
  mev: 'bg-amber-900/50 text-amber-400 border border-amber-700',
  info: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  warn: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
  critical: 'bg-red-900/50 text-red-400 border border-red-700',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
