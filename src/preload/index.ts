import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  advisor: {
    getAllArchetypes: () => ipcRenderer.invoke('advisor:getAllArchetypes'),
    getArchetype: (id: string) => ipcRenderer.invoke('advisor:getArchetype', id),
    matchPersonality: (archetype: string, ideology: unknown) =>
      ipcRenderer.invoke('advisor:matchPersonality', archetype, ideology)
  },
  game: {
    detectGame: (gameName: string) => ipcRenderer.invoke('game:detectGame', gameName)
  },
  games: {
    load: () => ipcRenderer.invoke('games:load'),
    save: (games: unknown) => ipcRenderer.invoke('games:save', games),
    addOrUpdate: (game: unknown) => ipcRenderer.invoke('games:addOrUpdate', game),
    remove: (gameId: string) => ipcRenderer.invoke('games:remove', gameId),
    updatePersonality: (gameId: string, archetype: string, name: string) =>
      ipcRenderer.invoke('games:updatePersonality', gameId, archetype, name),
    updateLastAccessed: (gameId: string) => ipcRenderer.invoke('games:updateLastAccessed', gameId),
    clearAll: () => ipcRenderer.invoke('games:clearAll')
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
    update: (key: string, value: unknown) => ipcRenderer.invoke('settings:update', key, value)
  },
  dbWatcher: {
    setPath: (dbPath: string | null) => ipcRenderer.invoke('dbWatcher:setPath', dbPath),
    setCurrentGame: (gameId: string | null) =>
      ipcRenderer.invoke('dbWatcher:setCurrentGame', gameId),
    getStatus: () => ipcRenderer.invoke('dbWatcher:getStatus'),
    pickFile: () => ipcRenderer.invoke('dbWatcher:pickFile')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
