import { dialog } from 'electron'
import { handle } from '@/lib/main/shared'
import type { AppSettings } from '@/shared/types'

const AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', requiresApiKey: true, requiresBaseUrl: false },
  { id: 'openai', name: 'OpenAI', requiresApiKey: true, requiresBaseUrl: false },
  { id: 'ollama', name: 'Ollama (Local)', requiresApiKey: false, requiresBaseUrl: true },
]

const DEFAULT_SETTINGS: AppSettings = {
  auroraDbPath: null,
  watchEnabled: true,
  bridgeEnabled: true,
  bridgePort: 47842,
  enableTimeControls: false,
  enableDevTools: false,
  zoomLevel: 1,
  aiProvider: null,
  aiModel: null,
  aiApiKey: null,
  ollamaBaseUrl: null,
}

// In-memory settings until Phase 3 wires persistence
let currentSettings: AppSettings = { ...DEFAULT_SETTINGS }

export const registerSettingsHandlers = () => {
  handle('settings:load', () => {
    // Will wire to SettingsPersistence in Phase 3
    return currentSettings
  })

  handle('settings:save', (settings: AppSettings) => {
    currentSettings = settings
  })

  handle('settings:update', (key: string, value: unknown) => {
    currentSettings = { ...currentSettings, [key]: value }
    return currentSettings
  })

  handle('settings:pickDbFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Aurora Database',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  handle('settings:getProviders', () => {
    return AI_PROVIDERS
  })

  handle('settings:getActiveProvider', () => {
    if (!currentSettings.aiProvider) return null
    const provider = AI_PROVIDERS.find((p) => p.id === currentSettings.aiProvider)
    if (!provider) return null
    return {
      id: provider.id,
      name: provider.name,
      model: currentSettings.aiModel,
    }
  })

  handle('settings:setProvider', (
    id: string,
    model: string | null,
    apiKey: string | null,
    baseUrl: string | null,
  ) => {
    currentSettings = {
      ...currentSettings,
      aiProvider: id as AppSettings['aiProvider'],
      aiModel: model,
      aiApiKey: apiKey,
      ollamaBaseUrl: baseUrl,
    }
  })
}
