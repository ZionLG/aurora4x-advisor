/**
 * Push event type definitions.
 * Pure types — no runtime code, safe to import from any process.
 */

import type { GameSession } from './types'

export interface PushEvents {
  'session:stateChanged': SessionState
  'empire:tick': EmpireTick
  'advisor:alert': AdvisorAlert
}

export interface SessionState {
  currentGame: GameSession | null
  isConnected: boolean
  lockedCampaignId: string | null
  bridgeUrl: string | null
  protocolMismatch: boolean
}

export interface EmpireTick {
  gameDate: string | null
  bodies?: unknown[]
  fleets?: unknown[]
}

export interface AdvisorAlert {
  id: string
  severity: 'briefing' | 'warning' | 'alert'
  title: string
  content: string
  timestamp: number
}

export type Unsubscribe = () => void
