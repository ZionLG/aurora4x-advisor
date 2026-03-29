import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function RootLayout() {
  return (
    <div className="flex h-full bg-[var(--cic-void)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
