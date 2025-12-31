import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { GameSidebar } from './GameSidebar'
import { ModeToggle } from '@components/mode-toggle'
import { Button } from '@components/ui/button'

export function RootLayout(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <>
      <GameSidebar />
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          ⚙️ Settings
        </Button>
        <ModeToggle />
      </div>
      <Outlet />
    </>
  )
}
