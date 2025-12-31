import React from 'react'
import { Outlet } from 'react-router-dom'
import { GameSidebar } from './GameSidebar'
import { ModeToggle } from '@components/mode-toggle'

export function RootLayout(): React.JSX.Element {
  return (
    <>
      <GameSidebar />
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <Outlet />
    </>
  )
}
