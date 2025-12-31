import { IdeologyProfile } from './types'
import { ArchetypeId } from '../archetypes/types'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Weight values for profile matching
 */
export enum MatchWeight {
  Critical = 3,
  Important = 2,
  Secondary = 1
}

/**
 * Matcher rule for a single ideology stat
 */
export interface MatcherRule {
  min?: number
  max?: number
  weight: MatchWeight
}

/**
 * Personality profile definition
 */
export interface PersonalityProfile {
  id: string
  archetype: ArchetypeId
  name: string
  keywords: string[]
  description: string
  matcher: {
    [key: string]: MatcherRule
  }
}

/**
 * Match result for a single profile
 */
export interface MatchResult {
  profileId: string
  profileName: string
  confidence: number
  failedRules: string[]
}

/**
 * Overall personality match result
 */
export interface PersonalityMatch {
  archetype: ArchetypeId
  primary: MatchResult
  allMatches: MatchResult[]
}

/**
 * Calculate distance from value to required range
 */
function calculateDistance(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min - value
  if (max !== undefined && value > max) return value - max
  return 0
}

/**
 * Calculate match score for a single profile
 */
function calculateProfileMatch(
  ideology: IdeologyProfile,
  profile: PersonalityProfile
): MatchResult {
  let totalScore = 0
  let maxPossibleScore = 0
  const failedRules: string[] = []

  for (const [stat, rule] of Object.entries(profile.matcher)) {
    const value = ideology[stat as keyof IdeologyProfile] as number
    const weight = rule.weight // Enum value is already the number

    maxPossibleScore += weight

    // Check if value is within required range
    const meetsMin = rule.min === undefined || value >= rule.min
    const meetsMax = rule.max === undefined || value <= rule.max

    if (meetsMin && meetsMax) {
      // Full points if within range
      totalScore += weight
    } else {
      // Partial points based on how close
      const distance = calculateDistance(value, rule.min, rule.max)
      const partial = weight * Math.max(0, 1 - distance / 25) // 25 = threshold
      totalScore += partial

      if (distance > 10) {
        failedRules.push(stat)
      }
    }
  }

  const confidence = (totalScore / maxPossibleScore) * 100

  return {
    profileId: profile.id,
    profileName: profile.name,
    confidence: Math.round(confidence),
    failedRules
  }
}

/**
 * Load all personality profiles from config directory
 */
function loadAllProfiles(): PersonalityProfile[] {
  const profiles: PersonalityProfile[] = []
  const configDir = path.join(process.cwd(), 'config', 'personality-profiles')

  if (!fs.existsSync(configDir)) {
    return profiles
  }

  // Read all archetype folders
  const archetypeFolders = fs.readdirSync(configDir)

  for (const folder of archetypeFolders) {
    const folderPath = path.join(configDir, folder)
    const stat = fs.statSync(folderPath)

    if (!stat.isDirectory()) continue

    // Read all JSON files in the folder
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.json'))

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const profile = JSON.parse(content) as PersonalityProfile
      profiles.push(profile)
    }
  }

  return profiles
}

/**
 * Match ideology profile to best-fit personality profile within archetype
 */
export function matchPersonality(
  archetype: ArchetypeId,
  ideology: IdeologyProfile
): PersonalityMatch {
  const allProfiles = loadAllProfiles()

  // Filter profiles by archetype
  const archetypeProfiles = allProfiles.filter((p) => p.archetype === archetype)

  if (archetypeProfiles.length === 0) {
    throw new Error(`No personality profiles found for archetype: ${archetype}`)
  }

  // Calculate match scores and sort by confidence
  const results = archetypeProfiles
    .map((profile) => calculateProfileMatch(ideology, profile))
    .sort((a, b) => b.confidence - a.confidence)

  return {
    archetype,
    primary: results[0],
    allMatches: results
  }
}
