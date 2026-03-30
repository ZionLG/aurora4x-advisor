import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { ArchetypeId, GovernmentProfile, Ministry } from '@/shared/types'

export interface ProfilePreset {
  profile: GovernmentProfile
  archetype: ArchetypeId
  ideology: Record<string, number>
  ministries: Omit<Ministry, 'id'>[]
}

const PROFILES_FILE = 'custom-profiles.json'

function getProfilesPath(): string {
  return path.join(app.getPath('userData'), PROFILES_FILE)
}

export async function loadCustomProfiles(): Promise<ProfilePreset[]> {
  try {
    const data = await readFile(getProfilesPath(), 'utf-8')
    return JSON.parse(data) as ProfilePreset[]
  } catch {
    return []
  }
}

export async function saveCustomProfile(preset: ProfilePreset): Promise<void> {
  const profiles = await loadCustomProfiles()
  profiles.push(preset)
  const userDataPath = app.getPath('userData')
  await mkdir(userDataPath, { recursive: true })
  await writeFile(getProfilesPath(), JSON.stringify(profiles, null, 2), 'utf-8')
}

export async function removeCustomProfile(id: string): Promise<void> {
  const profiles = await loadCustomProfiles()
  const filtered = profiles.filter((p) => p.profile.id !== id)
  const userDataPath = app.getPath('userData')
  await mkdir(userDataPath, { recursive: true })
  await writeFile(getProfilesPath(), JSON.stringify(filtered, null, 2), 'utf-8')
}

export async function updateCustomProfile(id: string, preset: ProfilePreset): Promise<void> {
  const profiles = await loadCustomProfiles()
  const index = profiles.findIndex((p) => p.profile.id === id)
  if (index !== -1) {
    profiles[index] = preset
  } else {
    profiles.push(preset)
  }
  const userDataPath = app.getPath('userData')
  await mkdir(userDataPath, { recursive: true })
  await writeFile(getProfilesPath(), JSON.stringify(profiles, null, 2), 'utf-8')
}
