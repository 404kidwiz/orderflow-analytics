import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { DashboardPage } from './components/Dashboard/DashboardPage'
import { TradesPage } from './components/Trades/TradesPage'
import { SignalsPage } from './components/Signals/SignalsPage'
import { AlertsPage } from './components/Alerts/AlertsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <div />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'trades',
        element: <TradesPage />,
      },
      {
        path: 'signals',
        element: <SignalsPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
      },
    ],
  },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
