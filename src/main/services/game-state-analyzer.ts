/**
 * Game State Analyzer
 *
 * After a snapshot is created, analyzes the game state from the Aurora DB
 * and calculates which tutorials and advice apply.
 */

import Database from 'better-sqlite3'
import type { GameState, TutorialAdvice } from '../advisor/profiles/types'
import { getTutorialAdvice, loadProfile } from '../advisor'

/**
 * Advice package sent to client
 */
export interface AdvicePackage {
  gameState: GameState
  tutorials: TutorialAdvice[]
  // observations: Observation[] // Future: add observations
  analyzedAt: number
}

/**
 * Analyze game state from snapshot DB and return applicable advice
 */
export async function analyzeGameState(
  snapshotPath: string,
  profileId: string
): Promise<AdvicePackage> {
  console.log('[Analyzer] Analyzing game state from snapshot:', snapshotPath)
  console.log('[Analyzer] Using profile:', profileId)

  // Open the snapshot DB (readonly)
  let db: Database.Database | null = null

  try {
    db = new Database(snapshotPath, { readonly: true, fileMustExist: true })

    // TODO: Query actual game state from DB
    // For now, return mock data with DB infrastructure ready

    const gameState = await queryGameState(db)
    console.log('[Analyzer] Game state extracted:', gameState)

    // Load profile and get tutorials
    const profile = loadProfile(profileId)
    const tutorials = getTutorialAdvice(gameState, profile)
    console.log('[Analyzer] Found', tutorials.length, 'applicable tutorials')

    const advicePackage: AdvicePackage = {
      gameState,
      tutorials,
      analyzedAt: Date.now()
    }

    return advicePackage
  } finally {
    if (db) {
      db.close()
    }
  }
}

/**
 * Query game state from Aurora DB
 * For now: Opens DB and prepares infrastructure, but returns mock data
 */
async function queryGameState(db: Database.Database): Promise<GameState> {
  console.log('[Analyzer] Querying game state...', db.name)

  // TODO: Implement actual queries
  // Here's where the queries would go:

  // 1. Query game year
  // const gameYearQuery = db.prepare(`
  //   SELECT GameTime, StartYear
  //   FROM FCT_Game
  //   LIMIT 1
  // `)
  // const gameYearRow = gameYearQuery.get() as { GameTime: number; StartYear: number } | undefined

  // 2. Query TN tech status
  // const techQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_TechSystem
  //   WHERE CompletionDate > 0
  //   LIMIT 1
  // `)

  // 3. Query alien contact
  // const alienContactQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_Race
  //   WHERE NPR = 0 AND RaceID != (SELECT RaceID FROM FCT_Race WHERE PlayerRace = 1 LIMIT 1)
  //   LIMIT 1
  // `)

  // 4. Query war status
  // const warQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_RaceRelations
  //   WHERE RelationValue < 0
  //   LIMIT 1
  // `)

  // 5. Query ship construction
  // const shipQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_Ship
  //   WHERE RaceID = (SELECT RaceID FROM FCT_Race WHERE PlayerRace = 1 LIMIT 1)
  //   LIMIT 1
  // `)

  // 6. Query system survey status
  // const surveyQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_SystemBody
  //   WHERE Surveyed = 1
  //   LIMIT 1
  // `)

  // For now: Return mock data
  console.log('[Analyzer] Using MOCK game state (queries not implemented yet)')

  const mockGameState: GameState = {
    gameYear: 1,
    hasTNTech: false,
    alienContact: false,
    warStatus: 'peace',
    hasBuiltFirstShip: false,
    hasSurveyedHomeSystem: false
  }

  return mockGameState
}

/**
 * Trigger immediate analysis (for after setup completes)
 * This doesn't wait for a DB change - it analyzes right away
 */
export async function triggerImmediateAnalysis(
  dbPath: string,
  profileId: string
): Promise<AdvicePackage> {
  console.log('[Analyzer] Triggering immediate analysis')
  console.log('[Analyzer] DB path:', dbPath)

  // For immediate analysis, we analyze the current DB directly
  // (not a snapshot, since we just finished setup)
  return analyzeGameState(dbPath, profileId)
}
