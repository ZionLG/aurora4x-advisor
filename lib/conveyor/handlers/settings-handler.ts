import { dialog } from 'electron'
import { handle } from '@/lib/main/shared'
import { loadSettings, saveSettings, updateSetting } from '@/lib/services/settings-persistence'
import { verifyConnection } from '@/lib/services/ai-provider'
import type { AppSettings } from '@/shared/types'

const AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', requiresApiKey: true, requiresBaseUrl: false },
  { id: 'openai', name: 'OpenAI', requiresApiKey: true, requiresBaseUrl: false },
  { id: 'ollama', name: 'Ollama (Local)', requiresApiKey: false, requiresBaseUrl: true },
]

export const registerSettingsHandlers = () => {
  handle('settings:load', () => loadSettings())

  handle('settings:save', (settings: AppSettings) => saveSettings(settings))

  handle('settings:update', (key: string, value: unknown) =>
    updateSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings]),
  )

  handle('settings:pickDbFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Aurora Database',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  handle('settings:getProviders', () => AI_PROVIDERS)

  handle('settings:getActiveProvider', async () => {
    const settings = await loadSettings()
    if (!settings.aiProvider) return null
    const provider = AI_PROVIDERS.find((p) => p.id === settings.aiProvider)
    if (!provider) return null
    return { id: provider.id, name: provider.name, model: settings.aiModel }
  })

  handle('settings:setProvider', async (
    id: string,
    model: string | null,
    apiKey: string | null,
    baseUrl: string | null,
  ) => {
    const settings = await loadSettings()
    settings.aiProvider = id as AppSettings['aiProvider']
    settings.aiModel = model
    settings.aiApiKey = apiKey
    settings.ollamaBaseUrl = baseUrl
    await saveSettings(settings)
  })

  handle('settings:verifyAi', () => verifyConnection())
}
