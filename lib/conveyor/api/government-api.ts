import { ConveyorApi } from '@/lib/preload/shared'
import type { IdeologyProfile, Government, Ministry } from '@/shared/types'

export class GovernmentApi extends ConveyorApi {
  // Archetype matching
  getArchetypes = () => this.invoke('government:getArchetypes')
  matchPersonality = (ideology: IdeologyProfile) => this.invoke('government:matchPersonality', ideology)

  // Government CRUD
  getGovernment = () => this.invoke('government:getGovernment')
  setGovernment = (gov: Government) => this.invoke('government:setGovernment', gov)

  // Ministry CRUD
  addMinistry = (ministry: Ministry) => this.invoke('government:addMinistry', ministry)
  updateMinistry = (id: string, patch: Partial<Ministry>) => this.invoke('government:updateMinistry', id, patch)
  removeMinistry = (id: string) => this.invoke('government:removeMinistry', id)

  // Briefings
  getBriefings = () => this.invoke('government:getBriefings')
  getBriefingsForMinistry = (id: string) => this.invoke('government:getBriefingsForMinistry', id)
  clearBriefings = () => this.invoke('government:clearBriefings')

  // Chat
  chat = (ministryId: string, message: string) => this.invoke('government:chat', ministryId, message)
  getConversation = (ministryId: string) => this.invoke('government:getConversation', ministryId)
  clearConversation = (ministryId: string) => this.invoke('government:clearConversation', ministryId)

  // Tags
  getTags = () => this.invoke('government:getTags')

  // Custom profile persistence
  getCustomProfiles = () => this.invoke('government:getCustomProfiles')
  saveCustomProfile = (preset: unknown) => this.invoke('government:saveCustomProfile', preset)
  removeCustomProfile = (id: string) => this.invoke('government:removeCustomProfile', id)
}
