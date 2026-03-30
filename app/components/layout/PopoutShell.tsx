import { Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/app/components/ui/sonner'
import { queryClient } from '@/app/lib/query-client'
import { useEmpireTick, useSessionSync, useGovernmentSync } from '@/app/hooks/data'
import { MODULES } from '@/app/modules/registry'
import { Loader2 } from 'lucide-react'
import '@/app/styles/app.css'

function SyncHooks() {
  useEmpireTick()
  useSessionSync()
  useGovernmentSync()
  return null
}

function ModuleLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-(--cic-void)">
      <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
    </div>
  )
}

export function PopoutShell({ moduleId }: { moduleId: string }) {
  const mod = MODULES.find((m) => m.id === moduleId)

  if (!mod) {
    return (
      <div
        className="
          flex h-screen items-center justify-center bg-(--cic-void) text-sm
          text-muted-foreground
        "
      >
        Module not found: {moduleId}
      </div>
    )
  }

  const Component = mod.component

  return (
    <QueryClientProvider client={queryClient}>
      <SyncHooks />
      <div className="h-screen bg-(--cic-void)">
        <Suspense fallback={<ModuleLoader />}>
          <Component />
        </Suspense>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}
