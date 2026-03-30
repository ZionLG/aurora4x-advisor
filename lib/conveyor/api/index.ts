import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { SessionApi } from './session-api'
import { EmpireApi } from './empire-api'
import { GovernmentApi } from './government-api'
import { SettingsApi } from './settings-api'
import { createSubscriber } from '@/lib/conveyor/events'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  session: new SessionApi(electronAPI),
  empire: new EmpireApi(electronAPI),
  government: new GovernmentApi(electronAPI),
  settings: new SettingsApi(electronAPI),
  subscribe: createSubscriber(electronAPI.ipcRenderer),
}

export type ConveyorApi = typeof conveyor
