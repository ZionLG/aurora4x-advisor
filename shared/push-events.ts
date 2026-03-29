/**
 * Push event type definitions.
 * Pure types — no runtime code, safe to import from any process.
 */

import type { GameSession, Briefing } from './types'

export interface PushEvents {
  'session:stateChanged': SessionState
  'empire:tick': EmpireTick
  'government:briefing': Briefing
}

export type ConnectionMode = 'bridge' | 'offline' | 'disconnected'

export interface SessionState {
  currentGame: GameSession | null
  isConnected: boolean
  connectionMode: ConnectionMode
  lockedCampaignId: string | null
  bridgeUrl: string | null
  protocolMismatch: boolean
}

export interface EmpireTick {
  gameDate: string | null
  bodies?: unknown[]
  fleets?: unknown[]
}

export type Unsubscribe = () => void
