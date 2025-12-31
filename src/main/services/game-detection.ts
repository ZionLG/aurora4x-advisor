import Database from 'better-sqlite3'
import path from 'path'
import type { GameInfo } from '@shared/types'

/**
 * Detects game information from Aurora 4X database
 */
export async function detectGame(gameName: string): Promise<GameInfo> {
  console.log('[Game Detection] ========================================')
  console.log('[Game Detection] Detecting game information')
  console.log('[Game Detection] ========================================')
  console.log(`[Game Detection] Looking for game: "${gameName}"`)

  // Path to Aurora database - should be configurable in production
  const dbPath = path.join(process.cwd(), 'docs', 'AuroraDB.db')
  console.log(`[Game Detection] Database path: ${dbPath}`)

  let db: Database.Database | null = null

  try {
    // Open database connection
    console.log('[Game Detection] Opening database connection (readonly)...')
    db = new Database(dbPath, { readonly: true })
    console.log('[Game Detection] ✅ Database connection established')

    // Query 1: Get game information
    console.log('[Game Detection] --- Query 1: Getting game information ---')
    console.log('[Game Detection] SQL: SELECT GameID, StartYear FROM FCT_Game WHERE GameName = ?')
    console.log(`[Game Detection] Parameter: "${gameName}"`)

    const gameQuery = db.prepare(`
      SELECT GameID, StartYear
      FROM FCT_Game
      WHERE GameName = ?
    `)
    const gameRow = gameQuery.get(gameName) as { GameID: number; StartYear: number } | undefined

    if (!gameRow) {
      console.error(`[Game Detection] ❌ Game "${gameName}" not found in database`)
      throw new Error(`Game "${gameName}" not found in database`)
    }

    console.log('[Game Detection] ✅ Game found!')
    console.log(`[Game Detection] GameID: ${gameRow.GameID}`)
    console.log(`[Game Detection] Start Year: ${gameRow.StartYear}`)

    // Query 2: Get player race (NPR = 0 means player-controlled)
    console.log('[Game Detection] --- Query 2: Getting player race ---')
    console.log(
      '[Game Detection] SQL: SELECT RaceName, RaceStartingLevel FROM FCT_Race WHERE GameID = ? AND NPR = 0'
    )
    console.log(`[Game Detection] Parameter: GameID = ${gameRow.GameID}`)

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
      console.error(`[Game Detection] ❌ No player race found for game "${gameName}"`)
      throw new Error(`No player race found for game "${gameName}"`)
    }

    console.log('[Game Detection] ✅ Player race found!')
    console.log(`[Game Detection] Race Name: ${raceRow.RaceName}`)
    console.log(`[Game Detection] Race Starting Level: ${raceRow.RaceStartingLevel}`)

    // Map RaceStartingLevel to tech level
    // 0 = TN (Trans-Newtonian), 1 = Industrial/Conventional Start
    const techLevel = raceRow.RaceStartingLevel === 0 ? 'TN' : 'Industrial'
    console.log(
      `[Game Detection] Tech Level: ${techLevel} (RaceStartingLevel: ${raceRow.RaceStartingLevel})`
    )

    const gameInfo: GameInfo = {
      gameName,
      startingYear: gameRow.StartYear,
      techLevel,
      empireName: raceRow.RaceName
    }

    console.log('[Game Detection] ========================================')
    console.log('[Game Detection] ✅ Game detection successful!')
    console.log('[Game Detection] ========================================')
    console.log('[Game Detection] Game Info:', JSON.stringify(gameInfo, null, 2))

    return gameInfo
  } catch (error) {
    console.error('[Game Detection] ========================================')
    console.error('[Game Detection] ❌ Game detection failed!')
    console.error('[Game Detection] ========================================')
    console.error('[Game Detection] Error:', error)
    if (error instanceof Error) {
      console.error('[Game Detection] Error message:', error.message)
      console.error('[Game Detection] Error stack:', error.stack)
    }

    // If database doesn't exist or query fails, return error
    throw new Error(
      `Failed to detect game: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Always close the database connection
    if (db) {
      console.log('[Game Detection] Closing database connection...')
      db.close()
      console.log('[Game Detection] ✅ Database connection closed')
    }
  }
}
