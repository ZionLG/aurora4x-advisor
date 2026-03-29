import { handle } from '@/lib/main/shared'
import { gameSession } from '@/lib/services/game-session'
import { listGames } from '@/lib/services/game-detection'
import {
  loadGames,
  addOrUpdateGame,
  removeGame,
  updateGamePersonality,
} from '@/lib/services/game-persistence'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { loadSettings } from '@/lib/services/settings-persistence'
import type { GameInfo, GameSnapshot } from '@/shared/types'

export const registerSessionHandlers = () => {
  handle('session:listGames', () => loadGames())

  handle('session:detectGame', async () => {
    const settings = await loadSettings()
    if (!settings.auroraDbPath) return []
    return listGames(settings.auroraDbPath)
  })

  handle('session:selectGame', async (id: string) => {
    await gameSession.setCurrentGame(id)
    if (!auroraBridge.isConnected) {
      const settings = await loadSettings()
      auroraBridge.connect(settings.bridgePort || 47842)
    }
  })

  handle('session:addGame', async (info: GameInfo) => {
    const session = {
      id: crypto.randomUUID(),
      gameInfo: info,
      personalityArchetype: null,
      personalityName: null,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    }
    await addOrUpdateGame(session)
    return session
  })

  handle('session:removeGame', async (id: string) => {
    await removeGame(id)
  })

  handle('session:updatePersonality', async (
    id: string,
    archetype: string | null,
    name: string | null,
  ) => {
    await updateGamePersonality(id, archetype ?? '', name ?? '')
  })

  handle('session:updateSnapshot', async (_id: string, _snapshot: GameSnapshot) => {
    // Will store snapshot in game session
  })

  handle('session:getState', () => {
    const state = gameSession.getState()
    return {
      currentGame: state.currentGame,
      isConnected: auroraBridge.isConnected,
      lockedCampaignId: state.lockedCampaignId,
      bridgeUrl: auroraBridge.isConnected ? null : null,
    }
  })

  handle('session:reconnect', () => {
    auroraBridge.reconnectNow()
  })
}
