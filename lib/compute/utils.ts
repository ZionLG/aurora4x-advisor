/**
 * Shared utilities for the compute layer.
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/**
 * Convert Aurora's GameTime (seconds since epoch) to a formatted date string.
 *
 * Uses the same approach as Aurora Electrons:
 *   dayjs.utc(0).set('year', startYear).add(seconds, 'second')
 *
 * Aurora stores time as seconds elapsed since Jan 1 of the game's start year.
 */
export function formatGameDate(timeSeconds: number, startYear: number): string {
  const date = dayjs.utc(0).set('year', startYear).set('hour', 0).set('minute', 0).set('second', 0).add(timeSeconds, 'second')
  return date.format('YY-MM-DD')
}

export function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
