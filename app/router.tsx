import { Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { MODULES } from './modules/registry'
import { Loader2 } from 'lucide-react'

function ModuleLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-(--cic-void)">
      <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
    </div>
  )
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ModuleLoader />}>{children}</Suspense>
}

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: MODULES.filter((m) => m.status !== 'hidden').map((mod) => ({
      path: mod.route === '/' ? undefined : mod.route.slice(1), // remove leading /
      index: mod.route === '/' ? true : undefined,
      element: (
        <SuspenseWrapper>
          <mod.component />
        </SuspenseWrapper>
      ),
    })),
  },
])
