import { create } from 'zustand'
import type { AppSettings } from '@/shared/types'

interface SettingsState {
  settings: AppSettings | null
  isLoading: boolean

  setSettings: (settings: AppSettings) => void
  setLoading: (loading: boolean) => void
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: true,

  setSettings: (settings) => set({ settings, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  updateSetting: (key, value) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, [key]: value } : null,
    })),
}))
