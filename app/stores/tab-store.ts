import { create } from 'zustand'
import type { ModuleDefinition } from '@/app/modules/registry'

export interface AppTab {
  id: string // module id
  route: string // module route
  name: string // display name
  icon: string // lucide icon name (for serialization)
}

interface TabState {
  tabs: AppTab[]
  activeTabId: string | null

  openTab: (mod: ModuleDefinition) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
}

const MAX_TABS = 12

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (mod) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.id === mod.id)

    if (existing) {
      // Already open — just switch to it
      set({ activeTabId: existing.id })
      return
    }

    // Open new tab
    const newTab: AppTab = {
      id: mod.id,
      route: mod.route,
      name: mod.name,
      icon: mod.icon.displayName ?? mod.id,
    }

    if (tabs.length >= MAX_TABS) {
      // Replace the oldest non-active tab
      const toRemove = tabs.find((t) => t.id !== get().activeTabId)
      if (toRemove) {
        set({
          tabs: [...tabs.filter((t) => t.id !== toRemove.id), newTab],
          activeTabId: newTab.id,
        })
        return
      }
    }

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.id,
    })
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    const newTabs = tabs.filter((t) => t.id !== id)

    let newActive = activeTabId
    if (activeTabId === id) {
      // Switch to adjacent tab
      if (newTabs.length > 0) {
        newActive = newTabs[Math.min(idx, newTabs.length - 1)].id
      } else {
        newActive = null
      }
    }

    set({ tabs: newTabs, activeTabId: newActive })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  reorderTabs: (fromIndex, toIndex) => {
    const { tabs } = get()
    const newTabs = [...tabs]
    const [moved] = newTabs.splice(fromIndex, 1)
    newTabs.splice(toIndex, 0, moved)
    set({ tabs: newTabs })
  },

  closeOtherTabs: (id) => {
    const { tabs } = get()
    set({ tabs: tabs.filter((t) => t.id === id), activeTabId: id })
  },

  closeAllTabs: () => set({ tabs: [], activeTabId: null }),
}))
