import { handle } from '@/lib/main/shared'
import { getAllArchetypes } from '@/lib/advisor'
import { matchPersonality } from '@/lib/advisor/ideology/profile-matcher'
import * as governmentAi from '@/lib/services/government-ai'
import * as profilePersistence from '@/lib/services/profile-persistence'
import { queryGameState } from '@/lib/services/game-state-analyzer'
import { gameSession } from '@/lib/services/game-session'
import { addOrUpdateGame } from '@/lib/services/game-persistence'
import type { IdeologyProfile, Government, Ministry } from '@/shared/types'

export const registerGovernmentHandlers = () => {
  handle('government:getArchetypes', () => getAllArchetypes())

  handle('government:matchPersonality', (ideology: IdeologyProfile) => matchPersonality(ideology))

  handle('government:getGovernment', () => {
    return gameSession.currentGame?.government ?? null
  })

  handle('government:setGovernment', async (gov: Government) => {
    const game = gameSession.currentGame
    if (!game) return
    game.government = gov
    await addOrUpdateGame(game)
  })

  handle('government:addMinistry', async (ministry: Ministry) => {
    const game = gameSession.currentGame
    if (!game?.government) return
    game.government.ministries.push(ministry)
    await addOrUpdateGame(game)
  })

  handle('government:updateMinistry', async (id: string, patch: Partial<Ministry>) => {
    const game = gameSession.currentGame
    if (!game?.government) return
    const ministry = game.government.ministries.find((m) => m.id === id)
    if (ministry) {
      Object.assign(ministry, patch)
      await addOrUpdateGame(game)
    }
  })

  handle('government:removeMinistry', async (id: string) => {
    const game = gameSession.currentGame
    if (!game?.government) return
    game.government.ministries = game.government.ministries.filter((m) => m.id !== id)
    await addOrUpdateGame(game)
  })

  handle('government:getBriefings', () => governmentAi.getBriefings())

  handle('government:getBriefingsForMinistry', (id: string) =>
    governmentAi.getBriefingsForMinistry(id),
  )

  handle('government:clearBriefings', () => governmentAi.clearBriefings())

  handle('government:chat', async (ministryId: string, message: string) => {
    const game = gameSession.currentGame
    if (!game?.government) return 'No government configured.'
    const gameState = await queryGameState()
    return governmentAi.chat(ministryId, message, game.government, gameState)
  })

  handle('government:getConversation', (ministryId: string) =>
    governmentAi.getConversation(ministryId),
  )

  handle('government:clearConversation', (ministryId: string) =>
    governmentAi.clearConversation(ministryId),
  )

  handle('government:getTags', () => governmentAi.EVENT_TAGS)

  // Custom profile persistence
  handle('government:getCustomProfiles', () => profilePersistence.loadCustomProfiles())

  handle('government:saveCustomProfile', (preset: profilePersistence.ProfilePreset) =>
    profilePersistence.saveCustomProfile(preset),
  )

  handle('government:removeCustomProfile', (id: string) =>
    profilePersistence.removeCustomProfile(id),
  )
}
