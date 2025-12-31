/**
 * Profile loading system with validation
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { Profile, ProfileSchema } from './types'
import { z } from 'zod'

/**
 * Get bundled (default) config directory - read-only
 */
function getBundledConfigDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'config')
    : path.join(__dirname, '../../../../resources/config')
}

/**
 * Get user config directory - for custom profiles
 */
function getUserConfigDir(): string {
  const userConfigDir = path.join(app.getPath('userData'), 'config')

  // Ensure user config directory exists
  if (!fs.existsSync(userConfigDir)) {
    fs.mkdirSync(userConfigDir, { recursive: true })
  }

  return userConfigDir
}

const BUNDLED_CONFIG_DIR = getBundledConfigDir()
const USER_CONFIG_DIR = getUserConfigDir()
const BUNDLED_PROFILES_DIR = path.join(BUNDLED_CONFIG_DIR, 'personality-profiles')
const USER_PROFILES_DIR = path.join(USER_CONFIG_DIR, 'personality-profiles')

let cachedGeneric: Profile | null = null
const cachedProfiles: Map<string, Profile> = new Map()

/**
 * Load the generic fallback profile (always from bundled)
 */
export function loadGenericProfile(): Profile {
  if (cachedGeneric) {
    return cachedGeneric
  }

  const bundledGeneric = path.join(BUNDLED_CONFIG_DIR, 'generic.json')
  const content = fs.readFileSync(bundledGeneric, 'utf-8')
  const parsed = JSON.parse(content)

  try {
    cachedGeneric = ProfileSchema.parse(parsed)
    return cachedGeneric
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Generic profile validation failed:', error.issues)
      throw new Error(`Generic profile is invalid: ${formatValidationError(error)}`)
    }
    throw error
  }
}

/**
 * Load a specific profile by ID
 */
export function loadProfile(profileId: string): Profile {
  if (cachedProfiles.has(profileId)) {
    return cachedProfiles.get(profileId)!
  }

  // Search for profile in subdirectories
  const profile = findAndLoadProfile(profileId)
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`)
  }

  cachedProfiles.set(profileId, profile)
  return profile
}

/**
 * Find and load a profile by searching subdirectories
 * User profiles take priority (allows overriding bundled profiles)
 */
function findAndLoadProfile(profileId: string): Profile | null {
  // Try user profiles first (overrides bundled if same ID)
  if (fs.existsSync(USER_PROFILES_DIR)) {
    const userProfile = searchProfilesDir(USER_PROFILES_DIR, profileId)
    if (userProfile) return userProfile
  }

  // Fall back to bundled profiles
  return searchProfilesDir(BUNDLED_PROFILES_DIR, profileId)
}

/**
 * Search a profiles directory for a specific profile ID
 */
function searchProfilesDir(profilesDir: string, profileId: string): Profile | null {
  if (!fs.existsSync(profilesDir)) return null

  const archetypeDirs = fs.readdirSync(profilesDir)

  for (const archetypeDir of archetypeDirs) {
    const archetypePath = path.join(profilesDir, archetypeDir)
    if (!fs.statSync(archetypePath).isDirectory()) continue

    const files = fs.readdirSync(archetypePath)

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const filePath = path.join(archetypePath, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)

      if (parsed.id === profileId) {
        try {
          return ProfileSchema.parse(parsed)
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error(`Profile validation failed for ${filePath}:`, error.issues)
            throw new Error(`Profile ${profileId} is invalid: ${formatValidationError(error)}`)
          }
          throw error
        }
      }
    }
  }

  return null
}

/**
 * Load all profiles from a directory
 */
function loadProfilesFromDir(profilesDir: string): Profile[] {
  const profiles: Profile[] = []

  if (!fs.existsSync(profilesDir)) return profiles

  const archetypeDirs = fs.readdirSync(profilesDir)

  for (const archetypeDir of archetypeDirs) {
    const archetypePath = path.join(profilesDir, archetypeDir)
    if (!fs.statSync(archetypePath).isDirectory()) continue

    const files = fs.readdirSync(archetypePath)

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const filePath = path.join(archetypePath, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(content)
        const profile = ProfileSchema.parse(parsed)

        profiles.push(profile)
        cachedProfiles.set(profile.id, profile)
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(`Profile validation failed for ${filePath}:`, error.issues)
          console.error(`Skipping invalid profile: ${formatValidationError(error)}`)
          // Skip invalid profiles instead of crashing
          continue
        }
        // Re-throw non-validation errors (file read errors, JSON parse errors)
        throw error
      }
    }
  }

  return profiles
}

/**
 * Load all profiles (bundled + user custom, user profiles override bundled if same ID)
 */
export function loadAllProfiles(): Profile[] {
  const profilesMap = new Map<string, Profile>()

  // Load bundled profiles first (default 10)
  const bundledProfiles = loadProfilesFromDir(BUNDLED_PROFILES_DIR)
  for (const profile of bundledProfiles) {
    profilesMap.set(profile.id, profile)
  }

  // Load user custom profiles (additions + overrides)
  const userProfiles = loadProfilesFromDir(USER_PROFILES_DIR)
  for (const profile of userProfiles) {
    // This will override bundled profile if same ID
    profilesMap.set(profile.id, profile)
  }

  return Array.from(profilesMap.values())
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  cachedGeneric = null
  cachedProfiles.clear()
}

/**
 * Format Zod validation errors into a readable message
 */
function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return `${path}: ${issue.message}`
    })
    .join(', ')
}
