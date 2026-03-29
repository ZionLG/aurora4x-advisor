import { IdeologyProfile } from './types'
import { ArchetypeId, ARCHETYPES } from '../archetypes/types'

export enum MatchWeight {
  Critical = 3,
  Important = 2,
  Secondary = 1,
}

export interface MatcherRule {
  min?: number
  max?: number
  weight?: MatchWeight
}

export interface MatchResult {
  archetypeId: ArchetypeId
  archetypeName: string
  confidence: number
}

export interface PersonalityMatch {
  archetype: ArchetypeId
  primary: MatchResult
  allMatches: MatchResult[]
}

/**
 * Ideology affinity rules per archetype.
 * Defines which ideology stats each archetype favors.
 */
const ARCHETYPE_AFFINITIES: Record<ArchetypeId, Partial<Record<keyof IdeologyProfile, MatcherRule>>> = {
  'staunch-nationalist': {
    xenophobia: { min: 60, weight: MatchWeight.Critical },
    expansionism: { min: 50, weight: MatchWeight.Important },
    determination: { min: 50, weight: MatchWeight.Secondary },
  },
  'technocrat-admin': {
    trade: { min: 40, weight: MatchWeight.Important },
    diplomacy: { min: 40, weight: MatchWeight.Important },
    determination: { min: 50, weight: MatchWeight.Secondary },
  },
  'communist-commissar': {
    trade: { max: 40, weight: MatchWeight.Important },
    determination: { min: 60, weight: MatchWeight.Critical },
    expansionism: { min: 40, weight: MatchWeight.Secondary },
  },
  'monarchist-advisor': {
    diplomacy: { min: 40, weight: MatchWeight.Important },
    determination: { min: 50, weight: MatchWeight.Important },
    xenophobia: { min: 30, max: 70, weight: MatchWeight.Secondary },
  },
  'military-strategist': {
    militancy: { min: 60, weight: MatchWeight.Critical },
    determination: { min: 50, weight: MatchWeight.Important },
    expansionism: { min: 40, weight: MatchWeight.Secondary },
  },
  'corporate-executive': {
    trade: { min: 60, weight: MatchWeight.Critical },
    diplomacy: { min: 40, weight: MatchWeight.Important },
    militancy: { max: 50, weight: MatchWeight.Secondary },
  },
  'diplomatic-envoy': {
    diplomacy: { min: 60, weight: MatchWeight.Critical },
    xenophobia: { max: 40, weight: MatchWeight.Important },
    trade: { min: 40, weight: MatchWeight.Secondary },
  },
  'religious-zealot': {
    determination: { min: 70, weight: MatchWeight.Critical },
    xenophobia: { min: 50, weight: MatchWeight.Important },
    militancy: { min: 40, weight: MatchWeight.Secondary },
  },
}

function scoreArchetype(ideology: IdeologyProfile, archetypeId: ArchetypeId): MatchResult {
  const rules = ARCHETYPE_AFFINITIES[archetypeId]
  let totalScore = 0
  let maxScore = 0

  for (const [stat, rule] of Object.entries(rules)) {
    const value = ideology[stat as keyof IdeologyProfile]
    const weight = rule.weight ?? MatchWeight.Important
    maxScore += weight

    const meetsMin = rule.min === undefined || value >= rule.min
    const meetsMax = rule.max === undefined || value <= rule.max

    if (meetsMin && meetsMax) {
      totalScore += weight
    } else {
      const distance =
        rule.min !== undefined && value < rule.min
          ? rule.min - value
          : rule.max !== undefined && value > rule.max
            ? value - rule.max
            : 0
      totalScore += weight * Math.max(0, 1 - distance / 25)
    }
  }

  return {
    archetypeId,
    archetypeName: ARCHETYPES[archetypeId].name,
    confidence: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50,
  }
}

/**
 * Match ideology scores to the best-fit archetype.
 */
export function matchPersonality(ideology: IdeologyProfile): PersonalityMatch {
  const results = (Object.keys(ARCHETYPES) as ArchetypeId[])
    .map((id) => scoreArchetype(ideology, id))
    .sort((a, b) => b.confidence - a.confidence)

  return {
    archetype: results[0].archetypeId,
    primary: results[0],
    allMatches: results,
  }
}
