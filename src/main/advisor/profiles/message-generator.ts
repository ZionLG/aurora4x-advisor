/**
 * Message generation system - looks up and processes profile messages
 */

import { Profile, Observation, GameState, TutorialAdvice, Conditions } from './types'
import { loadGenericProfile } from './loader'

/**
 * Get observation message for a profile, with fallback to generic
 */
export function getObservationMessage(
  observationId: string,
  observation: Observation,
  gameState: GameState,
  profile: Profile
): string {
  // Try profile first
  let message = tryGetObservationMessage(profile, observationId, gameState)
  if (message) {
    return substituteData(message, observation.data)
  }

  // Fall back to generic
  const genericProfile = loadGenericProfile()
  message = tryGetObservationMessage(genericProfile, observationId, gameState)

  if (message) {
    console.warn(
      `Profile ${profile.id} missing observation '${observationId}', using generic fallback`
    )
    return substituteData(message, observation.data)
  }

  // Should never happen if generic.json is complete
  console.error(`No message found for observation '${observationId}' in profile or generic`)
  return `Observation: ${observationId}`
}

/**
 * Try to get observation message from a profile
 */
function tryGetObservationMessage(
  profile: Profile,
  observationId: string,
  gameState: GameState
): string | null {
  const variants = profile.observations[observationId]
  if (!variants || variants.length === 0) {
    return null
  }

  // Find first matching variant
  for (const variant of variants) {
    if (matchesConditions(variant.conditions, gameState)) {
      return variant.message
    }
  }

  return null
}

/**
 * Get tutorial advice for a profile, with generic fallback
 */
export function getTutorialAdvice(gameState: GameState, profile: Profile): TutorialAdvice[] {
  const genericProfile = loadGenericProfile()
  const advice: TutorialAdvice[] = []

  // Collect all tutorial IDs from generic
  const allTutorialIds = genericProfile.tutorialAdvice?.map((t) => t.id) || []

  for (const tutorialId of allTutorialIds) {
    // Check if profile overrides this tutorial
    const profileOverride = profile.tutorialAdvice?.find((t) => t.id === tutorialId)
    const tutorialItem =
      profileOverride || genericProfile.tutorialAdvice?.find((t) => t.id === tutorialId)

    if (tutorialItem && matchesConditions(tutorialItem.conditions, gameState)) {
      advice.push(tutorialItem)
    }
  }

  return advice
}

/**
 * Get greeting for a profile
 */
export function getGreeting(profile: Profile, isInitial: boolean): string {
  return isInitial ? profile.greetings.initial : profile.greetings.returning
}

/**
 * Check if game state matches conditions
 */
export function matchesConditions(conditions: Conditions, gameState: GameState): boolean {
  // Empty conditions = always match
  if (Object.keys(conditions).length === 0) {
    return true
  }

  for (const [key, value] of Object.entries(conditions)) {
    const stateValue = gameState[key]

    // Handle range conditions (e.g., gameYear: { min: 1, max: 5 })
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const range = value as { min?: number; max?: number }

      if (range.min !== undefined && stateValue < range.min) {
        return false
      }
      if (range.max !== undefined && stateValue > range.max) {
        return false
      }
    }
    // Handle direct value comparison
    else if (stateValue !== value) {
      return false
    }
  }

  return true
}

/**
 * Substitute {{placeholders}} in message with observation data
 */
function substituteData(message: string, data: Record<string, unknown>): string {
  let result = message

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(placeholder, String(value))
  }

  return result
}
