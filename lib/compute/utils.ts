/**
 * Shared utilities for the compute layer.
 */

/**
 * Convert Aurora's GameTime (seconds since epoch) to a formatted date string.
 *
 * Uses standard Gregorian calendar with leap years.
 * JS Date quirk: years 0-99 map to 1900-1999 in the constructor,
 * so we use setUTCFullYear to set the exact year.
 */
export function formatGameDate(timeSeconds: number, startYear: number): string {
  const epoch = new Date(Date.UTC(2000, 0, 1, 0, 0, 0))
  epoch.setUTCFullYear(startYear)
  const date = new Date(epoch.getTime() + timeSeconds * 1000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
