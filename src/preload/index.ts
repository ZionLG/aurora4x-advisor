import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  advisor: {
    getAllArchetypeIds: () => ipcRenderer.invoke('advisor:getAllArchetypeIds'),
    getArchetype: (id: string) => ipcRenderer.invoke('advisor:getArchetype', id),
    validateIdeology: (ideology: unknown) =>
      ipcRenderer.invoke('advisor:validateIdeology', ideology),
    matchPersonality: (archetype: string, ideology: unknown) =>
      ipcRenderer.invoke('advisor:matchPersonality', archetype, ideology)
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
