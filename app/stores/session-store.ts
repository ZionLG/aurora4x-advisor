import { create } from 'zustand'
import type { GameSession } from '@/shared/types'
import type { ConnectionMode } from '@/shared/push-events'

interface SessionState {
  currentGame: GameSession | null
  savedGames: GameSession[]
  isConnected: boolean
  connectionMode: ConnectionMode
  lockedCampaignId: string | null
  protocolMismatch: boolean

  setCurrentGame: (game: GameSession | null) => void
  setSavedGames: (games: GameSession[]) => void
  setConnected: (connected: boolean) => void
  setLockedCampaignId: (id: string | null) => void
  syncFromMain: (state: {
    currentGame: GameSession | null
    isConnected: boolean
    connectionMode: ConnectionMode
    lockedCampaignId: string | null
    protocolMismatch: boolean
  }) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentGame: null,
  savedGames: [],
  isConnected: false,
  connectionMode: 'disconnected',
  lockedCampaignId: null,
  protocolMismatch: false,

  setCurrentGame: (game) => set({ currentGame: game }),
  setSavedGames: (games) => set({ savedGames: games }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLockedCampaignId: (id) => set({ lockedCampaignId: id }),
  syncFromMain: (state) =>
    set({
      currentGame: state.currentGame as GameSession | null,
      isConnected: state.isConnected,
      connectionMode: state.connectionMode,
      lockedCampaignId: state.lockedCampaignId,
      protocolMismatch: state.protocolMismatch,
    }),
}))
