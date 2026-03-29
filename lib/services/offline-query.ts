/**
 * Offline Query Service
 *
 * Provides a QueryFn implementation that reads directly from Aurora's
 * SQLite database file using better-sqlite3. Used when the bridge
 * is not connected.
 *
 * Opens/closes the DB per query to avoid locking conflicts with Aurora
 * saving to the same file. This is the same pattern game-detection.ts uses.
 */

import Database from 'better-sqlite3'
import type { QueryFn } from '@/lib/compute/types'

let currentPath: string | null = null
let isOpen = false

export function openOfflineDb(dbPath: string): void {
  // Verify the path is accessible by doing a test open/close
  let testDb: Database.Database | null = null
  try {
    testDb = new Database(dbPath, { readonly: true })
    testDb.close()
    testDb = null
  } catch (err) {
    if (testDb) testDb.close()
    console.warn('[OfflineQuery] Failed to open database:', err)
    throw err
  }

  currentPath = dbPath
  isOpen = true
  console.warn(`[OfflineQuery] Offline mode active: ${dbPath}`)
}

export function closeOfflineDb(): void {
  if (isOpen) {
    currentPath = null
    isOpen = false
    console.warn('[OfflineQuery] Offline mode deactivated')
  }
}

export function isOfflineReady(): boolean {
  return isOpen && currentPath !== null
}

export function getOfflinePath(): string | null {
  return currentPath
}

/**
 * Returns a QueryFn that reads from the offline SQLite database,
 * or null if offline mode is not active.
 *
 * Opens and closes the DB handle for each query to avoid conflicts
 * with Aurora writing to the same file during saves.
 */
export function getOfflineQuery(): QueryFn | null {
  if (!isOpen || !currentPath) return null

  const dbPath = currentPath
  return <T = Record<string, unknown>>(sql: string): Promise<T[]> => {
    let db: Database.Database | null = null
    try {
      db = new Database(dbPath, { readonly: true })
      const rows = db.prepare(sql).all() as T[]
      db.close()
      return Promise.resolve(rows)
    } catch (err) {
      if (db) {
        try { db.close() } catch { /* ignore */ }
      }
      return Promise.reject(err)
    }
  }
}
