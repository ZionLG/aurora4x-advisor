import { createContext } from 'react'
import type { GameSession } from '../../../shared/types'

export interface GameContextState {
  currentGame: GameSession | null
  savedGames: GameSession[]
  setCurrentGame: (game: GameSession | null) => void
  addGame: (game: GameSession) => void
  removeGame: (gameId: string) => void
  switchGame: (gameId: string) => void
  updateGamePersonality: (archetype: string, personalityName: string) => void
  clearAll: () => void
}

const initialState: GameContextState = {
  currentGame: null,
  savedGames: [],
  setCurrentGame: () => {},
  addGame: () => {},
  removeGame: () => {},
  switchGame: () => {},
  updateGamePersonality: () => {},
  clearAll: () => {}
}

export const GameContext = createContext<GameContextState>(initialState)
