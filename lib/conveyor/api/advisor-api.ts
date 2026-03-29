import { ConveyorApi } from '@/lib/preload/shared'
import type { IdeologyProfile } from '@/shared/types'

export class AdvisorApi extends ConveyorApi {
  getArchetypes = () => this.invoke('advisor:getArchetypes')
  matchPersonality = (ideology: IdeologyProfile) => this.invoke('advisor:matchPersonality', ideology)
  chat = (message: string) => this.invoke('advisor:chat', message)
  getAlerts = () => this.invoke('advisor:getAlerts')
  clearAlerts = () => this.invoke('advisor:clearAlerts')
  getConversation = () => this.invoke('advisor:getConversation')
  clearConversation = () => this.invoke('advisor:clearConversation')
}
