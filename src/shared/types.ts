// Shared type definitions for IPC communication between main, preload, and renderer

import { z } from 'zod'

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

// Zod schema for ideology validation
export const IdeologyProfileSchema = z.object({
  /** Fear of other races (1-100) */
  xenophobia: z.number().int().min(1).max(100),

  /** Persuasion & negotiation skill (1-100) */
  diplomacy: z.number().int().min(1).max(100),

  /** Use of military force (1-100) */
  militancy: z.number().int().min(1).max(100),

  /** Desire to expand territory (1-100) */
  expansionism: z.number().int().min(1).max(100),

  /** Perseverance despite setbacks (1-100) */
  determination: z.number().int().min(1).max(100),

  /** Willingness to trade (1-100) */
  trade: z.number().int().min(1).max(100)
})

export type IdeologyProfile = z.infer<typeof IdeologyProfileSchema>

export interface MatchResult {
  profileId: string
  profileName: string
  confidence: number
  failedRules: string[]
}

export interface PersonalityMatch {
  archetype: ArchetypeId
  primary: MatchResult
  allMatches: MatchResult[]
}

// Game detection types
export interface GameInfo {
  gameName: string
  startingYear: number
  techLevel: 'TN' | 'Industrial'
  empireName: string
}

// Game state snapshot (captured after initial setup)
export interface GameSnapshot {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  warStatus: 'peace' | 'active'
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
  capturedAt: number
}

// Game session types
export interface GameSession {
  id: string
  gameInfo: GameInfo
  personalityArchetype: string | null
  personalityName: string | null
  initialSnapshot?: GameSnapshot // Captured right after setup
  createdAt: number
  lastAccessedAt: number
}

// App settings types
export interface AppSettings {
  auroraDbPath: string | null
  watchEnabled: boolean
}
