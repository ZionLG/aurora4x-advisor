import { IdeologyProfileSchema } from './types'

/**
 * Validation result for ideology profile
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate an ideology profile using Zod schema
 */
export function validateIdeology(ideology: unknown): ValidationResult {
  const result = IdeologyProfileSchema.safeParse(ideology)

  if (result.success) {
    return {
      valid: true,
      errors: []
    }
  }

  // Format Zod errors into readable messages
  const errors = result.error.issues.map((err) => {
    const path = err.path.join('.')
    return `${path}: ${err.message}`
  })

  return {
    valid: false,
    errors
  }
}
