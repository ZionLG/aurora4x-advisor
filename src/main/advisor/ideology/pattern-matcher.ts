import { IdeologyProfile } from './types'
import { ArchetypeId } from '../archetypes/types'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Weight values for pattern matching
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
 * Personality pattern definition
 */
export interface PersonalityPattern {
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
 * Match result for a single pattern
 */
export interface MatchResult {
  patternId: string
  patternName: string
  confidence: number
  failedRules: string[]
}

/**
 * Overall personality match result
 */
export interface PersonalityMatch {
  archetype: ArchetypeId
  primary: MatchResult
  alternatives: MatchResult[]
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
 * Calculate match score for a single pattern
 */
function calculatePatternMatch(
  ideology: IdeologyProfile,
  pattern: PersonalityPattern
): MatchResult {
  let totalScore = 0
  let maxPossibleScore = 0
  const failedRules: string[] = []

  for (const [stat, rule] of Object.entries(pattern.matcher)) {
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
    patternId: pattern.id,
    patternName: pattern.name,
    confidence: Math.round(confidence),
    failedRules
  }
}

/**
 * Load all personality patterns from config directory
 */
function loadAllPatterns(): PersonalityPattern[] {
  const patterns: PersonalityPattern[] = []
  const configDir = path.join(process.cwd(), 'config', 'personality-patterns')

  if (!fs.existsSync(configDir)) {
    return patterns
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
      const pattern = JSON.parse(content) as PersonalityPattern
      patterns.push(pattern)
    }
  }

  return patterns
}

/**
 * Match ideology profile to best-fit personality pattern within archetype
 */
export function matchPersonality(
  archetype: ArchetypeId,
  ideology: IdeologyProfile
): PersonalityMatch {
  const allPatterns = loadAllPatterns()

  // Filter patterns by archetype
  const archetypePatterns = allPatterns.filter((p) => p.archetype === archetype)

  if (archetypePatterns.length === 0) {
    throw new Error(`No personality patterns found for archetype: ${archetype}`)
  }

  // Calculate match scores
  const results = archetypePatterns
    .map((pattern) => calculatePatternMatch(ideology, pattern))
    .sort((a, b) => b.confidence - a.confidence)

  const primary = results[0]
  const alternatives = results.slice(1, 3).filter((m) => m.confidence >= 60)

  return {
    archetype,
    primary,
    alternatives,
    allMatches: results
  }
}
