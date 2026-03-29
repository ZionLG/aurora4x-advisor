import { handle } from '@/lib/main/shared'
import { getAllArchetypes } from '@/lib/advisor'
import { matchPersonality } from '@/lib/advisor/ideology/profile-matcher'
import * as advisorAi from '@/lib/services/advisor-ai'
import { queryGameState } from '@/lib/services/game-state-analyzer'
import { gameSession } from '@/lib/services/game-session'
import type { IdeologyProfile, ArchetypeId } from '@/shared/types'

export const registerAdvisorHandlers = () => {
  handle('advisor:getArchetypes', () => getAllArchetypes())

  handle('advisor:matchPersonality', (ideology: IdeologyProfile) => matchPersonality(ideology))

  handle('advisor:chat', async (message: string) => {
    const game = gameSession.currentGame
    const archetypeId = game?.personalityArchetype as ArchetypeId | null
    if (!archetypeId) {
      return 'No advisor personality configured. Set one up in your game session.'
    }

    const gameState = await queryGameState()
    // TODO: pass ideology from game session when stored
    return advisorAi.chat(message, archetypeId, null, gameState)
  })

  handle('advisor:getAlerts', () => advisorAi.getAlerts())

  handle('advisor:clearAlerts', () => advisorAi.clearAlerts())

  handle('advisor:getConversation', () => advisorAi.getConversation())

  handle('advisor:clearConversation', () => advisorAi.clearConversation())
}
