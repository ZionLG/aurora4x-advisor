import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SystemMapCanvas } from '../../system-map/SystemMapCanvas'
import { SystemSelector } from '../../system-map/SystemSelector'
import { useSystemBodies } from '../../../hooks/use-system-map-data'
import { Button } from '@components/ui/button'
import type { GameSession } from '@shared/types'

interface SystemMapTabProps {
  game: GameSession
}

export function SystemMapTab({ game }: SystemMapTabProps): React.JSX.Element {
  const gameId = game.gameInfo.auroraGameId
  const raceId = game.gameInfo.auroraRaceId

  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)
  const { data: bodies, isLoading, refetch } = useSystemBodies(selectedSystemId, gameId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }
  }, [])

  useEffect(() => {
    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [updateDimensions])

  if (!gameId || !raceId) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Game data missing. Please re-detect your game.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SystemSelector
          value={selectedSystemId}
          onChange={setSelectedSystemId}
          gameId={gameId}
          raceId={raceId}
        />
        {selectedSystemId && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        )}
        {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border bg-black"
        style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}
      >
        {bodies && bodies.length > 0 ? (
          <SystemMapCanvas bodies={bodies} width={dimensions.width} height={dimensions.height} />
        ) : selectedSystemId && !isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No bodies found in this system
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a star system to view the map
          </div>
        )}
      </div>
    </div>
  )
}
