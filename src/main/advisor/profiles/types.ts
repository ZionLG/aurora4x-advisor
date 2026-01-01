/**
 * Profile V2 Types - Full message duplication approach with Zod validation
 */

import { z } from 'zod'

/**
 * Zod schema for MatcherRule
 */
export const MatcherRuleSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  weight: z.number().optional() // Weight for scoring (1=Secondary, 2=Important, 3=Critical)
})

/**
 * Zod schema for Conditions - only supported condition keys allowed
 */
export const ConditionsSchema = z
  .object({
    gameYear: z
      .union([z.number(), z.object({ min: z.number().optional(), max: z.number().optional() })])
      .optional(),
    hasTNTech: z.boolean().optional(),
    alienContact: z.boolean().optional(),
    warStatus: z.enum(['peace', 'active']).optional(),
    hasBuiltFirstShip: z.boolean().optional(),
    hasSurveyedHomeSystem: z.boolean().optional()
  })
  .strict() // No extra keys allowed

/**
 * Zod schema for Greetings
 */
export const GreetingsSchema = z.object({
  initial: z.string().min(1),
  returning: z.string().min(1)
})

/**
 * Zod schema for TutorialAdvice
 */
export const TutorialAdviceSchema = z.object({
  id: z.string().min(1),
  conditions: ConditionsSchema,
  body: z.string().min(1)
})

/**
 * Zod schema for ObservationVariant
 */
export const ObservationVariantSchema = z.object({
  conditions: ConditionsSchema,
  message: z.string().min(1)
})

/**
 * Zod schema for Profile
 */
export const ProfileSchema = z
  .object({
    id: z.string().min(1),
    archetype: z.string().min(1),
    name: z.string().min(1),
    keywords: z.array(z.string()),
    description: z.string().min(1),
    matcher: z.record(z.string(), MatcherRuleSchema).optional(),
    greetings: GreetingsSchema,
    tutorialAdvice: z.array(TutorialAdviceSchema).optional(),
    observations: z.record(z.string(), z.array(ObservationVariantSchema))
  })
  .strict()

/**
 * TypeScript types inferred from Zod schemas
 */
export type Conditions = z.infer<typeof ConditionsSchema>
export type Greetings = z.infer<typeof GreetingsSchema>
export type TutorialAdvice = z.infer<typeof TutorialAdviceSchema>
export type ObservationVariant = z.infer<typeof ObservationVariantSchema>
export type Profile = z.infer<typeof ProfileSchema>

/**
 * Game state for condition matching
 */
export interface GameState {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  warStatus: 'peace' | 'active'
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
}

/**
 * Observation data for generating messages
 */
export interface Observation {
  id: string
  data: Record<string, unknown>
  message?: string // Generated message after applying conditions
}
