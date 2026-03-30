/**
 * Game State Analyzer
 *
 * Analyzes live game state from the Aurora bridge and detects events.
 * Events are tagged for routing to the appropriate government ministry.
 */

import { auroraBridge } from './aurora-bridge'
import type { GameEvent } from '@/shared/types'

export interface GameStateSnapshot {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  atWar: boolean
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
  systemCount: number
  bodyCount: number
  fleetCount: number
  militaryFleetCount: number
  civilianFleetCount: number
  totalShipCount: number
}

export async function queryGameState(): Promise<GameStateSnapshot | null> {
  if (!auroraBridge.isConnected) return null

  const [systems, fleets, bodies] = await Promise.all([
    auroraBridge.getKnownSystems().catch(() => []),
    auroraBridge.getFleets().catch(() => []),
    auroraBridge.getBodies().catch(() => []),
  ])

  const playerFleets = fleets.filter((f: Record<string, unknown>) => !f.IsCivilian)

  return {
    gameYear: 0,
    hasTNTech: false,
    alienContact: false,
    atWar: false,
    hasBuiltFirstShip: fleets.length > 0,
    hasSurveyedHomeSystem: false,
    systemCount: systems.length,
    bodyCount: bodies.length,
    fleetCount: fleets.length,
    militaryFleetCount: playerFleets.length,
    civilianFleetCount: fleets.filter((f: Record<string, unknown>) => f.IsCivilian).length,
    totalShipCount: fleets.reduce((sum: number, f: Record<string, unknown>) => sum + (Number(f.ShipCount) || 0), 0),
  }
}

export async function detectEvents(): Promise<GameEvent[]> {
  if (!auroraBridge.isConnected) return []

  const events: GameEvent[] = []

  try {
    const fleets = await auroraBridge.getFleets().catch(() => [])

    const idleFleets = fleets.filter((f: Record<string, unknown>) => Number(f.Speed) === 0 && !f.IsCivilian)
    if (idleFleets.length > 0) {
      events.push({
        id: 'idle-fleets',
        tags: ['military', 'fleet'],
        description: `${idleFleets.length} military fleet(s) are stationary`,
        data: {
          count: idleFleets.length,
          fleetNames: idleFleets.slice(0, 5).map((f: Record<string, unknown>) => f.FleetName),
        },
        severity: 'warning',
      })
    }

    const singleShipFleets = fleets.filter((f: Record<string, unknown>) => Number(f.ShipCount) === 1 && !f.IsCivilian)
    if (singleShipFleets.length >= 3) {
      events.push({
        id: 'scattered-ships',
        tags: ['military', 'fleet'],
        description: `${singleShipFleets.length} single-ship military fleets detected`,
        data: {
          count: singleShipFleets.length,
          fleetNames: singleShipFleets.slice(0, 5).map((f: Record<string, unknown>) => f.FleetName),
        },
        severity: 'briefing',
      })
    }

    if (fleets.length === 0) {
      events.push({
        id: 'no-fleets',
        tags: ['military'],
        description: 'No fleets exist yet',
        data: {},
        severity: 'briefing',
      })
    }
  } catch (err) {
    console.warn('[Analyzer] Failed to detect events:', err)
  }

  return events
}
