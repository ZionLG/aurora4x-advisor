import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RefreshInterval = 5000 | 10000 | 30000 | 60000 | 0 // 0 = manual only

export interface RecapTypeSettings {
  autoRefresh: boolean
}

interface RecapSettingsState {
  refreshInterval: RefreshInterval
  forceOffline: boolean
  autoRefreshOnTick: boolean
  typeSettings: Record<string, RecapTypeSettings>

  setRefreshInterval: (interval: RefreshInterval) => void
  setForceOffline: (value: boolean) => void
  setAutoRefreshOnTick: (value: boolean) => void
  setTypeAutoRefresh: (type: string, enabled: boolean) => void
}

const DEFAULT_TYPE_SETTINGS: Record<string, RecapTypeSettings> = {
  research: { autoRefresh: true },
  industrial: { autoRefresh: true },
  ships: { autoRefresh: true },
  shipyards: { autoRefresh: true },
  training: { autoRefresh: true },
  terraforming: { autoRefresh: true },
}

export const useRecapSettingsStore = create<RecapSettingsState>()(
  persist(
    (set) => ({
      refreshInterval: 10000,
      forceOffline: false,
      autoRefreshOnTick: true,
      typeSettings: { ...DEFAULT_TYPE_SETTINGS },

      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setForceOffline: (value) => set({ forceOffline: value }),
      setAutoRefreshOnTick: (value) => set({ autoRefreshOnTick: value }),
      setTypeAutoRefresh: (type, enabled) =>
        set((state) => ({
          typeSettings: {
            ...state.typeSettings,
            [type]: { ...state.typeSettings[type], autoRefresh: enabled },
          },
        })),
    }),
    { name: 'recap-settings' }
  )
)
