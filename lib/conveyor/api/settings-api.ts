import { ConveyorApi } from '@/lib/preload/shared'
import type { AppSettings } from '@/shared/types'

export class SettingsApi extends ConveyorApi {
  load = () => this.invoke('settings:load')
  save = (settings: AppSettings) => this.invoke('settings:save', settings)
  update = (key: string, value: unknown) => this.invoke('settings:update', key, value)
  pickDbFile = () => this.invoke('settings:pickDbFile')
  getProviders = () => this.invoke('settings:getProviders')
  getActiveProvider = () => this.invoke('settings:getActiveProvider')
  setProvider = (
    id: string,
    model: string | null,
    apiKey: string | null,
    baseUrl: string | null,
  ) => this.invoke('settings:setProvider', id, model, apiKey, baseUrl)
}
