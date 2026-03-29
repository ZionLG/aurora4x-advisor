import { IdeologyProfile } from './types'
import { ArchetypeId } from '../archetypes/types'
import { loadAllProfiles, Profile } from '../profiles'

/**
 * Weight values for profile matching
 */
export enum MatchWeight {
  Critical = 3,
  Important = 2,
  Secondary = 1
}

/**
 * Matcher rule for a single ideology stat (includes weight for scoring)
 */
export interface MatcherRule {
  min?: number
  max?: number
  weight?: MatchWeight // Optional: default to Important if not specified
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
function calculateProfileMatch(ideology: IdeologyProfile, profile: Profile): MatchResult {
  let totalScore = 0
  let maxPossibleScore = 0
  const failedRules: string[] = []

  // If profile has no matcher, return 50% confidence (neutral match)
  if (!profile.matcher || Object.keys(profile.matcher).length === 0) {
    return {
      profileId: profile.id,
      profileName: profile.name,
      confidence: 50,
      failedRules: []
    }
  }

  for (const [stat, rule] of Object.entries(profile.matcher)) {
    const value = ideology[stat as keyof IdeologyProfile] as number
    const weight = rule.weight || MatchWeight.Important // Default to Important

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
 * Match ideology profile to best-fit personality profile within archetype
 */
export function matchPersonality(
  archetype: ArchetypeId,
  ideology: IdeologyProfile
): PersonalityMatch {
  console.log('[Matcher] Matching personality for archetype:', archetype)
  const allProfiles = loadAllProfiles()
  console.log('[Matcher] Total profiles loaded:', allProfiles.length)

  // Filter profiles by archetype
  const archetypeProfiles = allProfiles.filter((p) => p.archetype === archetype)
  console.log('[Matcher] Profiles matching archetype:', archetypeProfiles.length)

  if (archetypeProfiles.length === 0) {
    console.error('[Matcher] ERROR: No profiles found for archetype:', archetype)
    console.error('[Matcher] Available archetypes:', [
      ...new Set(allProfiles.map((p) => p.archetype))
    ])
    throw new Error(`No personality profiles found for archetype: ${archetype}`)
  }

  // Calculate match scores and sort by confidence
  const results = archetypeProfiles
    .map((profile) => calculateProfileMatch(ideology, profile))
    .sort((a, b) => b.confidence - a.confidence)

  console.log(
    '[Matcher] Best match:',
    results[0].profileName,
    'with confidence:',
    results[0].confidence
  )

  return {
    archetype,
    primary: results[0],
    allMatches: results
  }
}
