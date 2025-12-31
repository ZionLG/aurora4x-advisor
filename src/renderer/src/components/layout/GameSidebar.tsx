import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '@renderer/hooks/use-game'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@components/ui/sheet'

interface GameSidebarProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function GameSidebar({ isOpen, onOpenChange }: GameSidebarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { currentGame, savedGames, switchGame, removeGame } = useGame()
  const [localOpen, setLocalOpen] = useState(false)

  const open = isOpen !== undefined ? isOpen : localOpen
  const setOpen = onOpenChange || setLocalOpen

  const handleNewGame = (): void => {
    navigate('/')
    setOpen(false)
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="fixed top-4 left-4 z-50">
          <span className="mr-2">📂</span>
          Games
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Your Games</SheetTitle>
          <SheetDescription>Manage your Aurora 4X game sessions</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* New Game Button */}
          <Button onClick={handleNewGame} className="w-full" variant="default">
            <span className="mr-2">➕</span>
            New Game
          </Button>

          {/* Saved Games List */}
          {savedGames.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                No saved games yet. Create a new game to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Saved Games ({savedGames.length})</h3>
              {savedGames
                .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
                .map((game) => (
                  <Card
                    key={game.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      currentGame?.id === game.id ? 'border-primary bg-accent' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => {
                            switchGame(game.id)
                            navigate('/dashboard')
                            setOpen(false)
                          }}
                        >
                          <CardTitle className="text-sm truncate">
                            {game.gameInfo.gameName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {game.gameInfo.techLevel}
                            </Badge>
                            {currentGame?.id === game.id && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete "${game.gameInfo.gameName}"?`)) {
                              removeGame(game.id)
                            }
                          }}
                        >
                          🗑️
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent
                      className="pt-0"
                      onClick={() => {
                        switchGame(game.id)
                        navigate('/dashboard')
                        setOpen(false)
                      }}
                    >
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Empire: {game.gameInfo.empireName}</div>
                        <div>Year: {game.gameInfo.startingYear}</div>
                        {game.personalityName && (
                          <div className="text-primary font-medium">
                            Advisor: {game.personalityName}
                          </div>
                        )}
                        <div className="pt-1 text-[10px]">
                          Last played: {formatDate(game.lastAccessedAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
