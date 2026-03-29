import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import { queryClient } from './lib/query-client'
import { router } from './router'
import { useEmpireTick, useSessionSync, useGovernmentSync } from './hooks/data'
import './styles/app.css'

function AppSyncHooks() {
  useEmpireTick()
  useSessionSync()
  useGovernmentSync()
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSyncHooks />
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
