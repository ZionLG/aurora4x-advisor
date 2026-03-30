import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { AppSettings } from '@/shared/types'

const SETTINGS_FILE = 'settings.json'

const DEFAULT_SETTINGS: AppSettings = {
  auroraDbPath: null,
  watchEnabled: true,
  bridgeEnabled: false,
  bridgePort: 47842,
  enableTimeControls: false,
  enableDevTools: false,
  zoomLevel: 0,
  aiProvider: null,
  aiModel: null,
  aiApiKey: null,
  ollamaBaseUrl: null,
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await readFile(getSettingsPath(), 'utf-8')
    const settings = JSON.parse(data) as AppSettings
    return { ...DEFAULT_SETTINGS, ...settings }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const userDataPath = app.getPath('userData')
  await mkdir(userDataPath, { recursive: true })
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<AppSettings> {
  const settings = await loadSettings()
  settings[key] = value
  await saveSettings(settings)
  return settings
}
