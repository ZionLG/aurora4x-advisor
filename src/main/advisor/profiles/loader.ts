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
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config')
  }

  // In development, electron-vite bundles to out/main/
  // So __dirname is: out/main
  // We need to go up 2 levels to project root
  const projectRoot = path.join(__dirname, '../..')
  const configPath = path.join(projectRoot, 'resources/config')

  console.log('[Loader] Dev mode - __dirname:', __dirname)
  console.log('[Loader] Dev mode - project root:', projectRoot)
  console.log('[Loader] Dev mode - config path:', configPath)

  return configPath
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

// Lazy getters to avoid calculating paths at module load time
function getBundledProfilesDir(): string {
  return path.join(getBundledConfigDir(), 'personality-profiles')
}

function getUserProfilesDir(): string {
  return path.join(getUserConfigDir(), 'personality-profiles')
}

let cachedGeneric: Profile | null = null
const cachedProfiles: Map<string, Profile> = new Map()

/**
 * Load the generic fallback profile (always from bundled)
 */
export function loadGenericProfile(): Profile {
  if (cachedGeneric) {
    return cachedGeneric
  }

  const bundledGeneric = path.join(getBundledConfigDir(), 'generic.json')
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
  const userProfilesDir = getUserProfilesDir()
  if (fs.existsSync(userProfilesDir)) {
    const userProfile = searchProfilesDir(userProfilesDir, profileId)
    if (userProfile) return userProfile
  }

  // Fall back to bundled profiles
  return searchProfilesDir(getBundledProfilesDir(), profileId)
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

  console.log('[Loader] Loading profiles from:', profilesDir)

  if (!fs.existsSync(profilesDir)) {
    console.log('[Loader] Directory does not exist:', profilesDir)
    return profiles
  }

  const archetypeDirs = fs.readdirSync(profilesDir)
  console.log('[Loader] Found archetype directories:', archetypeDirs)

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
  const bundledConfigDir = getBundledConfigDir()
  const bundledProfilesDir = getBundledProfilesDir()
  const userProfilesDir = getUserProfilesDir()

  console.log('[Loader] ===== Loading All Profiles =====')
  console.log('[Loader] Bundled config dir:', bundledConfigDir)
  console.log('[Loader] Bundled profiles dir:', bundledProfilesDir)
  console.log('[Loader] User profiles dir:', userProfilesDir)

  const profilesMap = new Map<string, Profile>()

  // Load bundled profiles first (default 10)
  const bundledProfiles = loadProfilesFromDir(bundledProfilesDir)
  console.log('[Loader] Loaded', bundledProfiles.length, 'bundled profiles')
  for (const profile of bundledProfiles) {
    console.log('[Loader]   -', profile.id, '(archetype:', profile.archetype + ')')
    profilesMap.set(profile.id, profile)
  }

  // Load user custom profiles (additions + overrides)
  const userProfiles = loadProfilesFromDir(userProfilesDir)
  console.log('[Loader] Loaded', userProfiles.length, 'user profiles')
  for (const profile of userProfiles) {
    console.log('[Loader]   -', profile.id, '(archetype:', profile.archetype + ')')
    // This will override bundled profile if same ID
    profilesMap.set(profile.id, profile)
  }

  console.log('[Loader] Total profiles:', profilesMap.size)
  console.log('[Loader] =====================================')

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
