import Database from 'better-sqlite3'
import path from 'path'
import type { GameInfo } from '@shared/types'

/**
 * Detects game information from Aurora 4X database
 */
export async function detectGame(gameName: string): Promise<GameInfo> {
  // Path to Aurora database - should be configurable in production
  const dbPath = path.join(process.cwd(), 'docs', 'AuroraDB.db')

  let db: Database.Database | null = null

  try {
    // Open database connection
    db = new Database(dbPath, { readonly: true })

    // Query 1: Get game information
    const gameQuery = db.prepare(`
      SELECT GameID, StartYear
      FROM FCT_Game
      WHERE GameName = ?
    `)
    const gameRow = gameQuery.get(gameName) as { GameID: number; StartYear: number } | undefined

    if (!gameRow) {
      throw new Error(`Game "${gameName}" not found in database`)
    }

    // Query 2: Get player race (NPR = 0 means player-controlled)
    const raceQuery = db.prepare(`
      SELECT RaceName, RaceStartingLevel
      FROM FCT_Race
      WHERE GameID = ? AND NPR = 0
      LIMIT 1
    `)
    const raceRow = raceQuery.get(gameRow.GameID) as
      | {
          RaceName: string
          RaceStartingLevel: number
        }
      | undefined

    if (!raceRow) {
      throw new Error(`No player race found for game "${gameName}"`)
    }

    // Map RaceStartingLevel to tech level
    // 0 = TN (Trans-Newtonian), 1 = Industrial/Conventional Start
    const techLevel = raceRow.RaceStartingLevel === 0 ? 'TN' : 'Industrial'

    return {
      gameName,
      startingYear: gameRow.StartYear,
      techLevel,
      empireName: raceRow.RaceName
    }
  } catch (error) {
    // If database doesn't exist or query fails, return error
    throw new Error(
      `Failed to detect game: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Always close the database connection
    if (db) {
      db.close()
    }
  }
}
