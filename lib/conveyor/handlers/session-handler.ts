import { handle } from '@/lib/main/shared'

export const registerSessionHandlers = () => {
  handle('session:listGames', () => {
    return []
  })

  handle('session:detectGame', () => {
    return []
  })

  handle('session:selectGame', (_id: string) => {
    // Will wire to GameSessionService + AuroraBridge in Phase 3
  })

  handle('session:addGame', (info) => {
    return {
      id: crypto.randomUUID(),
      gameInfo: info,
      personalityArchetype: null,
      personalityName: null,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    }
  })

  handle('session:removeGame', (_id: string) => {
    // Will wire to GamePersistence in Phase 3
  })

  handle('session:updatePersonality', (
    _id: string,
    _archetype: string | null,
    _name: string | null,
  ) => {
    // Will wire to GamePersistence in Phase 3
  })

  handle('session:updateSnapshot', (_id: string, _snapshot) => {
    // Will wire to GamePersistence in Phase 3
  })

  handle('session:getState', () => {
    return {
      currentGame: null,
      isConnected: false,
      lockedCampaignId: null,
      bridgeUrl: null,
    }
  })
}
