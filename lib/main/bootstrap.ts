/**
 * App startup orchestration.
 * Runs after the window is created. Initializes services, connects bridge,
 * and wires up push-triggered analysis.
 */

import { loadSettings } from '@/lib/services/settings-persistence'
import { dbWatcher } from '@/lib/services/db-watcher'
import { gameSession } from '@/lib/services/game-session'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { addOrUpdateGame } from '@/lib/services/game-persistence'
import { queryGameState, detectEvents } from '@/lib/services/game-state-analyzer'
import * as governmentAi from '@/lib/services/government-ai'
import { broadcast } from '@/lib/main/broadcast'

/**
 * Broadcast the combined session + bridge state to all renderers.
 * This is the single source of truth for the renderer's session store.
 */
function broadcastSessionState(): void {
  const state = gameSession.getState()
  broadcast('session:stateChanged', {
    currentGame: state.currentGame,
    isConnected: auroraBridge.isConnected,
    lockedCampaignId: state.lockedCampaignId,
    bridgeUrl: null,
    protocolMismatch: auroraBridge.protocolMismatch,
  })
}

export async function bootstrap(): Promise<void> {
  const settings = await loadSettings()

  // 1. Initialize database watcher
  if (settings.auroraDbPath && settings.watchEnabled) {
    dbWatcher.setAuroraDbPath(settings.auroraDbPath)
  }

  gameSession.on('gameChanged', (game: { id: string } | null) => {
    dbWatcher.setCurrentGame(game?.id ?? null)
    broadcastSessionState()
  })

  // 2. Connect bridge — game selection happens via bridge detection only
  auroraBridge.connect(settings.bridgePort || 47842)

  // 4. Empire detection + auto-lock
  let lastEmpireName: string | null = null
  let validationPending = false

  const runValidation = (): void => {
    if (validationPending || !auroraBridge.isConnected) return
    validationPending = true

    setTimeout(async () => {
      validationPending = false

      if (!lastEmpireName) {
        gameSession.validateDbPath(auroraBridge.auroraDbPath, settings.auroraDbPath)
      }

      await gameSession.detectAndLockRunningGame((sql) => auroraBridge.query(sql))
      // Always broadcast after detection — even if game didn't change,
      // the lock and connection status may have
      broadcastSessionState()
    }, 2000)
  }

  // Bridge connect — broadcast state + start validation
  auroraBridge.onPush(() => {
    if (!auroraBridge.isConnected) return

    // Always broadcast on push so renderer knows we're connected
    broadcastSessionState()

    const currentEmpire = auroraBridge.activeEmpireName
    if (!currentEmpire) return

    if (lastEmpireName && currentEmpire !== lastEmpireName) {
      lastEmpireName = currentEmpire
      gameSession.clearRunningGame()
      runValidation()
    } else if (!lastEmpireName) {
      lastEmpireName = currentEmpire
      runValidation()
    }
  })

  // Bridge disconnect — clear game + broadcast
  auroraBridge.onPush(() => {
    if (!auroraBridge.isConnected && lastEmpireName) {
      lastEmpireName = null
      gameSession.clearRunningGame()
      broadcastSessionState()
    }
  })

  // 5. Push-triggered LLM analysis (throttled to 5s)
  let lastAnalysis = 0

  auroraBridge.onPush(async () => {
    const now = Date.now()
    if (now - lastAnalysis < 5000) return
    lastAnalysis = now

    // Parse game date from title bar and persist it
    const titleBar = auroraBridge.lastTitleBarText
    const dateMatch = titleBar?.match(
      /\s{2,}(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/,
    )
    let gameDateStr: string | null = null
    if (dateMatch) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ]
      const day = parseInt(dateMatch[1])
      const month = monthNames.indexOf(dateMatch[2]) + 1
      const year = parseInt(dateMatch[3])
      const m = month < 10 ? `0${month}` : `${month}`
      const d = day < 10 ? `0${day}` : `${day}`
      gameDateStr = `${year}-${m}-${d}`
    }

    broadcast('empire:tick', { gameDate: gameDateStr })

    // Persist the date to the game session
    const game = gameSession.currentGame
    if (game && gameDateStr && game.lastGameDate !== gameDateStr) {
      game.lastGameDate = gameDateStr
      addOrUpdateGame(game).catch(() => {})
    }

    // Government briefing generation — will be expanded with ministry routing
    const gov = game?.government
    if (!gov) return

    try {
      const [gameState, events] = await Promise.all([queryGameState(), detectEvents()])
      if (!gameState || events.length === 0) return

      const briefing = await governmentAi.generateBriefing(events, gov, null, gameState)
      if (briefing) {
        broadcast('government:briefing', briefing)
      }
    } catch (err) {
      console.warn('[Bootstrap] Push-triggered briefing failed:', err)
    }
  })

  // Poll bridge status to catch connection changes.
  // Also tracks protocolMismatch so reconnect attempts that hit mismatch
  // again are correctly broadcast (even if isConnected never went false).
  let lastBroadcastedConnected: boolean | null = null
  let lastBroadcastedMismatch: boolean | null = null
  setInterval(() => {
    const connected = auroraBridge.isConnected
    const mismatch = auroraBridge.protocolMismatch
    if (connected !== lastBroadcastedConnected || mismatch !== lastBroadcastedMismatch) {
      lastBroadcastedConnected = connected
      lastBroadcastedMismatch = mismatch
      broadcastSessionState()
    }
  }, 500)
}
