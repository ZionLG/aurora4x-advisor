import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { SystemMapCanvas } from '../../system-map/SystemMapCanvas'
import { SystemSelector } from '../../system-map/SystemSelector'
import { useMemoryBodies, type MemorySystemBody } from '../../../contexts/aurora-data-context'
import { Button } from '@components/ui/button'
import type { GameSession, SystemBody } from '@shared/types'

interface SystemMapTabProps {
  game: GameSession
}

// Map BodyClass string to numeric BodyTypeID used by the canvas renderer
function bodyClassToTypeId(bodyClass: string): number {
  switch (bodyClass) {
    case 'Terrestrial': return 2
    case 'GasGiant': return 3
    case 'GasDwarf': return 4
    case 'IceGiant': return 5
    case 'Asteroid': return 7
    case 'Comet': return 14
    case 'Moon': return 9
    case 'DwarfPlanet': return 6
    default: return 2
  }
}

// Convert MemorySystemBody to SystemBody for the canvas
function toCanvasBody(mb: MemorySystemBody): SystemBody {
  return {
    SystemBodyID: mb.SystemBodyID,
    SystemID: mb.SystemID,
    Name: mb.Name,
    OrbitalDistance: mb.OrbitalDistance,
    Bearing: mb.Bearing,
    BodyClass: bodyClassToTypeId(mb.BodyClass),
    BodyTypeID: bodyClassToTypeId(mb.BodyClass),
    PlanetNumber: mb.PlanetNumber,
    OrbitNumber: mb.OrbitNumber,
    ParentBodyID: mb.ParentBodyID,
    Radius: mb.Radius,
    Xcor: mb.Xcor,
    Ycor: mb.Ycor,
    DistanceToParent: mb.DistanceToParent,
    Eccentricity: mb.Eccentricity,
    EccentricityDirection: mb.EccentricityDirection
  }
}

export function SystemMapTab({ game }: SystemMapTabProps): React.JSX.Element {
  const gameId = game.gameInfo.auroraGameId
  const raceId = game.gameInfo.auroraRaceId

  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)
  const { data: memoryBodies, isLoading, refetch } = useMemoryBodies(selectedSystemId)
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

  // Convert memory bodies to canvas format
  const bodies = useMemo(() => {
    if (!memoryBodies) return undefined
    return memoryBodies.map(toCanvasBody)
  }, [memoryBodies])

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
        {bodies && (
          <span className="text-xs text-muted-foreground">
            {bodies.length} bodies (live)
          </span>
        )}
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
