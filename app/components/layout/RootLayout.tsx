import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'

export function RootLayout() {
  return (
    <div className="flex h-full bg-[var(--cic-void)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
