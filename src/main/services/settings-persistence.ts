import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { AppSettings } from '@shared/types'

const SETTINGS_FILE = 'settings.json'

const DEFAULT_SETTINGS: AppSettings = {
  auroraDbPath: null,
  watchEnabled: true
}

/**
 * Get the path to the settings file
 */
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, SETTINGS_FILE)
}

/**
 * Load app settings from disk
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const settingsPath = getSettingsPath()
    const data = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(data) as AppSettings

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...settings
    }
  } catch {
    // If file doesn't exist or is invalid, return defaults
    console.log('No settings file found, using defaults')
    return DEFAULT_SETTINGS
  }
}

/**
 * Save app settings to disk
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const settingsPath = getSettingsPath()
    const userDataPath = app.getPath('userData')

    // Ensure directory exists
    await mkdir(userDataPath, { recursive: true })

    // Write settings
    await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw new Error('Failed to save settings')
  }
}

/**
 * Update specific setting value
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<AppSettings> {
  const settings = await loadSettings()
  settings[key] = value
  await saveSettings(settings)
  return settings
}
