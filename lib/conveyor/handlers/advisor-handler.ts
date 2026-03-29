import { handle } from '@/lib/main/shared'
import { getAllArchetypes } from '@/lib/advisor'
import { matchPersonality } from '@/lib/advisor/ideology/profile-matcher'
import type { IdeologyProfile } from '@/shared/types'

export const registerAdvisorHandlers = () => {
  handle('advisor:getArchetypes', () => {
    return getAllArchetypes()
  })

  handle('advisor:matchPersonality', (ideology: IdeologyProfile) => {
    return matchPersonality(ideology)
  })

  handle('advisor:chat', (_message: string) => {
    // Will wire to LLM service in Phase 3
    return 'Advisor not configured. Set up an AI provider in Settings.'
  })

  handle('advisor:getAlerts', () => {
    return []
  })

  handle('advisor:clearAlerts', () => {
    // Will wire to advisor store in Phase 3
  })

  handle('advisor:getConversation', () => {
    return []
  })

  handle('advisor:clearConversation', () => {
    // Will wire to advisor store in Phase 3
  })
}
