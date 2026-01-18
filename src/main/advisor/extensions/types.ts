/**
 * Extension system types
 */

export interface ExtensionDefinition {
  id: string
  label?: string // Human-readable name (e.g., "Game Year", "At War")
  description?: string
  author?: string
  version?: string
  query: {
    sql: string // Can contain {{variableName}} placeholders
    timeout?: number
  }
  result:
    | { type: 'boolean'; field: string; operator: string; value: unknown }
    | { type: 'number'; field: string; default?: number }
    | { type: 'rows'; mapping: Record<string, string> }
}

export interface ExtensionResult {
  success: boolean
  type: 'boolean' | 'number' | 'rows'
  value?: boolean | number
  rows?: Array<Record<string, unknown>>
  error?: string
  executionTime?: number
}
