/**
 * Aurora 4X Advisor System - Public API
 *
 * Phase 1: Modular advisor with manual ideology inputs
 */

// Ideology types and validation
export type { IdeologyProfile } from './ideology/types'
export { IdeologyProfileSchema, IDEOLOGY_RANGES, getIdeologyTier } from './ideology/types'
export type { ValidationResult } from './ideology/validator'
export { validateIdeology } from './ideology/validator'

// Archetype types
export type { ArchetypeId, Archetype } from './archetypes/types'
export { ARCHETYPES, getArchetype, getAllArchetypes } from './archetypes/types'

// Profile matching
export { MatchWeight } from './ideology/pattern-matcher'
export type {
  MatcherRule,
  PersonalityProfile,
  MatchResult,
  PersonalityMatch
} from './ideology/pattern-matcher'
export { matchPersonality } from './ideology/pattern-matcher'
