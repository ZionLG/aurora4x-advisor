import { z } from 'zod'

/**
 * Ideology Profile - 6 racial characteristics that shape worldview
 *
 * These values are read from FCT_Species table in Aurora DB (or manual input in Phase 1).
 * They define how the advisor interprets events and what priorities it emphasizes.
 */
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

/**
 * Ideology stat ranges with labels
 */
export const IDEOLOGY_RANGES = {
  xenophobia: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Genocidal' },
      { min: 75, max: 89, label: 'Paranoid' },
      { min: 60, max: 74, label: 'Highly Suspicious' },
      { min: 40, max: 59, label: 'Cautious' },
      { min: 25, max: 39, label: 'Open-Minded' },
      { min: 10, max: 24, label: 'Welcoming' },
      { min: 1, max: 9, label: 'Naive' }
    ]
  },
  diplomacy: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Master Negotiator' },
      { min: 75, max: 89, label: 'Skilled Diplomat' },
      { min: 60, max: 74, label: 'Diplomatic' },
      { min: 40, max: 59, label: 'Adequate' },
      { min: 25, max: 39, label: 'Poor' },
      { min: 10, max: 24, label: 'Terrible' },
      { min: 1, max: 9, label: 'Incapable' }
    ]
  },
  militancy: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Bloodthirsty' },
      { min: 75, max: 89, label: 'Warmonger' },
      { min: 60, max: 74, label: 'Hawkish' },
      { min: 40, max: 59, label: 'Pragmatic' },
      { min: 25, max: 39, label: 'Dovish' },
      { min: 10, max: 24, label: 'Pacifist' },
      { min: 1, max: 9, label: 'Absolute Pacifist' }
    ]
  },
  expansionism: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Lebensraum' },
      { min: 75, max: 89, label: 'Manifest Destiny' },
      { min: 60, max: 74, label: 'Expansionist' },
      { min: 40, max: 59, label: 'Steady Growth' },
      { min: 25, max: 39, label: 'Conservative' },
      { min: 10, max: 24, label: 'Isolationist' },
      { min: 1, max: 9, label: 'Fortress World' }
    ]
  },
  determination: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Fanatical' },
      { min: 75, max: 89, label: 'Unbreakable' },
      { min: 60, max: 74, label: 'Resolute' },
      { min: 40, max: 59, label: 'Pragmatic' },
      { min: 25, max: 39, label: 'Flexible' },
      { min: 10, max: 24, label: 'Defeatist' },
      { min: 1, max: 9, label: 'Coward' }
    ]
  },
  trade: {
    min: 1,
    max: 100,
    tiers: [
      { min: 90, max: 100, label: 'Merchant Republic' },
      { min: 75, max: 89, label: 'Free Trader' },
      { min: 60, max: 74, label: 'Pro-Trade' },
      { min: 40, max: 59, label: 'Selective' },
      { min: 25, max: 39, label: 'Protectionist' },
      { min: 10, max: 24, label: 'Autarky' },
      { min: 1, max: 9, label: 'Hermit Kingdom' }
    ]
  }
} as const

/**
 * Get the tier label for a given ideology stat value
 */
export function getIdeologyTier(stat: keyof typeof IDEOLOGY_RANGES, value: number): string {
  const range = IDEOLOGY_RANGES[stat]
  const tier = range.tiers.find((t) => value >= t.min && value <= t.max)
  return tier?.label || 'Unknown'
}

/**
 * Validation result for ideology profile
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}
