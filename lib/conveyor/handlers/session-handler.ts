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
import { openOfflineDb, closeOfflineDb, isOfflineReady } from '@/lib/services/offline-query'
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
    // Only auto-connect bridge if not in offline mode
    if (!auroraBridge.isConnected && !isOfflineReady()) {
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

  handle('session:goOffline', async () => {
    const settings = await loadSettings()
    const dbPath = settings.auroraDbPath ?? auroraBridge.auroraDbPath
    if (!dbPath) throw new Error('No Aurora database path configured')

    // Stop the bridge completely — no reconnection attempts while offline
    auroraBridge.disconnect()

    // Clear bridge lock — we're going offline, bridge state is irrelevant
    gameSession.clearRunningGame()

    openOfflineDb(dbPath)

    // Auto-detect game from the DB and select the most recent matching campaign
    const games = await listGames(dbPath)
    const savedGames = await loadGames()
    if (games.length > 0) {
      const match = savedGames
        .filter((sg) => games.some((g) => g.gameName === sg.gameInfo.gameName))
        .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0]
      if (match) {
        await gameSession.setCurrentGame(match.id, { bypassLock: true })
      }
    }
  })

  handle('session:goOnline', async () => {
    closeOfflineDb()
    // Clear the offline game — bridge will re-detect and re-lock
    gameSession.clearRunningGame()
    // Reconnect bridge with auto-retry enabled
    const settings = await loadSettings()
    auroraBridge.connect(settings.bridgePort || 47842)
  })
}
