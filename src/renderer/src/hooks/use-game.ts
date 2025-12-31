import { useContext } from 'react'
import { GameContext, type GameContextState } from '../contexts/game-context'

export function useGame(): GameContextState {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}
