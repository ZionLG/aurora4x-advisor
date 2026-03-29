/**
 * Game State Analyzer
 *
 * Analyzes live game state from the Aurora bridge and detects events.
 * Events are fed to the LLM advisor for generating alerts/briefings.
 */

import { auroraBridge } from './aurora-bridge'

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

export interface GameEvent {
  id: string
  type: 'idle-fleets' | 'scattered-ships' | 'no-fleets' | 'custom'
  description: string
  data: Record<string, unknown>
}

/**
 * Query game state from live bridge data
 */
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
    totalShipCount: fleets.reduce(
      (sum: number, f: Record<string, unknown>) => sum + (Number(f.ShipCount) || 0),
      0,
    ),
  }
}

/**
 * Detect notable events from live bridge data
 */
export async function detectEvents(): Promise<GameEvent[]> {
  if (!auroraBridge.isConnected) return []

  const events: GameEvent[] = []

  try {
    const fleets = await auroraBridge.getFleets().catch(() => [])

    const idleFleets = fleets.filter(
      (f: Record<string, unknown>) => Number(f.Speed) === 0 && !f.IsCivilian,
    )
    if (idleFleets.length > 0) {
      events.push({
        id: 'idle-fleets',
        type: 'idle-fleets',
        description: `${idleFleets.length} military fleet(s) are stationary`,
        data: {
          count: idleFleets.length,
          fleetNames: idleFleets.slice(0, 5).map((f: Record<string, unknown>) => f.FleetName),
        },
      })
    }

    const singleShipFleets = fleets.filter(
      (f: Record<string, unknown>) => Number(f.ShipCount) === 1 && !f.IsCivilian,
    )
    if (singleShipFleets.length >= 3) {
      events.push({
        id: 'scattered-ships',
        type: 'scattered-ships',
        description: `${singleShipFleets.length} single-ship military fleets detected`,
        data: {
          count: singleShipFleets.length,
          fleetNames: singleShipFleets.slice(0, 5).map((f: Record<string, unknown>) => f.FleetName),
        },
      })
    }

    if (fleets.length === 0) {
      events.push({
        id: 'no-fleets',
        type: 'no-fleets',
        description: 'No fleets exist yet',
        data: {},
      })
    }
  } catch (err) {
    console.warn('[Analyzer] Failed to detect events:', err)
  }

  return events
}
