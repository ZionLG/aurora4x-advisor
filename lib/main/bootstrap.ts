/**
 * App startup orchestration.
 * Runs after the window is created. Initializes services, connects bridge,
 * and wires up push-triggered analysis.
 */

import { loadSettings } from '@/lib/services/settings-persistence'
import { dbWatcher } from '@/lib/services/db-watcher'
import { gameSession } from '@/lib/services/game-session'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { queryGameState, detectEvents } from '@/lib/services/game-state-analyzer'
import * as advisorAi from '@/lib/services/advisor-ai'
import { broadcast } from '@/lib/main/broadcast'
import type { ArchetypeId } from '@/shared/types'

export async function bootstrap(): Promise<void> {
  const settings = await loadSettings()

  // 1. Initialize database watcher
  if (settings.auroraDbPath && settings.watchEnabled) {
    dbWatcher.setAuroraDbPath(settings.auroraDbPath)
  }

  gameSession.on('gameChanged', (game: { id: string } | null) => {
    dbWatcher.setCurrentGame(game?.id ?? null)
  })

  // 2. Auto-select most recent game
  await gameSession.autoSelectGame()

  // 3. Connect bridge
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
    }, 2000)
  }

  auroraBridge.onPush(() => {
    if (!auroraBridge.isConnected) return

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

  // Clear lock on disconnect
  auroraBridge.onPush(() => {
    if (!auroraBridge.isConnected && lastEmpireName) {
      lastEmpireName = null
      gameSession.clearRunningGame()
    }
  })

  // 5. Push-triggered LLM analysis (throttled to 5s)
  let lastAnalysis = 0

  auroraBridge.onPush(async () => {
    const now = Date.now()
    if (now - lastAnalysis < 5000) return
    lastAnalysis = now

    // Broadcast empire tick for renderer query invalidation
    broadcast('empire:tick', { gameDate: null })

    // Generate LLM advisor alert if personality is set
    const game = gameSession.currentGame
    const archetypeId = game?.personalityArchetype as ArchetypeId | null
    if (!archetypeId) return

    try {
      const [gameState, events] = await Promise.all([queryGameState(), detectEvents()])
      if (!gameState || events.length === 0) return

      const alert = await advisorAi.generateAlert(events, archetypeId, null, gameState)
      if (alert) {
        broadcast('advisor:alert', alert)
      }
    } catch (err) {
      console.warn('[Bootstrap] Push-triggered analysis failed:', err)
    }
  })
}
