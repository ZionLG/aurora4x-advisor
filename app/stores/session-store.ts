import { create } from 'zustand'
import type { GameSession } from '@/shared/types'

interface SessionState {
  currentGame: GameSession | null
  savedGames: GameSession[]
  isConnected: boolean
  lockedCampaignId: string | null

  setCurrentGame: (game: GameSession | null) => void
  setSavedGames: (games: GameSession[]) => void
  setConnected: (connected: boolean) => void
  setLockedCampaignId: (id: string | null) => void
  syncFromMain: (state: {
    currentGame: GameSession | null
    isConnected: boolean
    lockedCampaignId: string | null
  }) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentGame: null,
  savedGames: [],
  isConnected: false,
  lockedCampaignId: null,

  setCurrentGame: (game) => set({ currentGame: game }),
  setSavedGames: (games) => set({ savedGames: games }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLockedCampaignId: (id) => set({ lockedCampaignId: id }),
  syncFromMain: (state) =>
    set({
      currentGame: state.currentGame as GameSession | null,
      isConnected: state.isConnected,
      lockedCampaignId: state.lockedCampaignId,
    }),
}))
