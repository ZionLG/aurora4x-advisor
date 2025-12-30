// Shared type definitions for IPC communication between main, preload, and renderer

export type ArchetypeId =
  | 'staunch-nationalist'
  | 'technocrat-admin'
  | 'communist-commissar'
  | 'monarchist-advisor'
  | 'military-strategist'
  | 'corporate-executive'
  | 'diplomatic-envoy'
  | 'religious-zealot'

export interface Archetype {
  id: ArchetypeId
  name: string
  description: string
  toneDescriptors: string[]
  vocabularyTags: string[]
}

export interface IdeologyProfile {
  xenophobia: number
  diplomacy: number
  militancy: number
  expansionism: number
  determination: number
  trade: number
  translation: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface MatchResult {
  patternId: string
  patternName: string
  confidence: number
  failedRules: string[]
}

export interface PersonalityMatch {
  archetype: ArchetypeId
  primary: MatchResult
  alternatives: MatchResult[]
  allMatches: MatchResult[]
}
