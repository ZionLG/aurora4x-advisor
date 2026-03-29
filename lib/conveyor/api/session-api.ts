import { ConveyorApi } from '@/lib/preload/shared'
import type { GameInfo, GameSnapshot } from '@/shared/types'

export class SessionApi extends ConveyorApi {
  listGames = () => this.invoke('session:listGames')
  detectGame = () => this.invoke('session:detectGame')
  selectGame = (id: string) => this.invoke('session:selectGame', id)
  addGame = (info: GameInfo) => this.invoke('session:addGame', info)
  removeGame = (id: string) => this.invoke('session:removeGame', id)
  updatePersonality = (id: string, archetype: string | null, name: string | null) =>
    this.invoke('session:updatePersonality', id, archetype, name)
  updateSnapshot = (id: string, snapshot: GameSnapshot) =>
    this.invoke('session:updateSnapshot', id, snapshot)
  getState = () => this.invoke('session:getState')
}
