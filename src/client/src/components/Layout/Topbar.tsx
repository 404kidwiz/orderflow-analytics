import { useLocation } from 'react-router-dom'

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/trades': 'Trade History',
  '/signals': 'Trading Signals',
  '/alerts': 'MEV Alerts',
}

export function Topbar() {
  const location = useLocation()
  const pageName = pageNames[location.pathname] ?? 'Orderflow Analytics'

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <h2 className="text-sm font-semibold text-gray-200">{pageName}</h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
        <span className="text-xs text-gray-600 font-mono">{new Date().toLocaleTimeString()}</span>
      </div>
    </header>
  )
}
