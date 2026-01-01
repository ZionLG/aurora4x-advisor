/**
 * Game State Analyzer
 *
 * After a snapshot is created, analyzes the game state from the Aurora DB
 * and calculates which tutorials and advice apply.
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import type { GameState, TutorialAdvice, Observation } from '../advisor/profiles/types'
import { getTutorialAdvice, loadProfile, getObservationMessage } from '../advisor'

/**
 * Advice package sent to client
 */
export interface AdvicePackage {
  gameState: GameState
  tutorials: TutorialAdvice[]
  observations: Observation[]
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

  // Get snapshot file modification time (when it was created/last saved)
  const snapshotStats = fs.statSync(snapshotPath)
  const snapshotModifiedAt = snapshotStats.mtimeMs

  // Open the snapshot DB (readonly)
  let db: Database.Database | null = null

  try {
    db = new Database(snapshotPath, { readonly: true, fileMustExist: true })

    // TODO: Query actual game state from DB
    // For now, return mock data with DB infrastructure ready

    const gameState = await queryGameState(db)
    console.log('[Analyzer] Game state extracted:', gameState)

    // Load profile
    const profile = loadProfile(profileId)

    // Get tutorials
    const tutorials = getTutorialAdvice(gameState, profile)
    console.log('[Analyzer] Found', tutorials.length, 'applicable tutorials')

    // Detect observations
    const rawObservations = detectObservations(db, gameState)

    // Process observations: apply conditions and generate messages
    const processedObservations: Observation[] = []
    for (const obs of rawObservations) {
      const message = getObservationMessage(obs.id, obs, gameState, profile)
      processedObservations.push({
        id: obs.id,
        data: obs.data,
        message // Add the generated message
      })
    }
    console.log('[Analyzer] Processed', processedObservations.length, 'observations')

    const advicePackage: AdvicePackage = {
      gameState,
      tutorials,
      observations: processedObservations,
      analyzedAt: snapshotModifiedAt // Use snapshot file time, not current time
    }

    return advicePackage
  } finally {
    if (db) {
      db.close()
    }
  }
}

/**
 * Detect observations from game state
 * For now: Returns mock observations to demonstrate the system
 */
function detectObservations(db: Database.Database, gameState: GameState): Observation[] {
  console.log('[Analyzer] Detecting observations...', db.name)

  // TODO: Implement actual queries to detect issues
  // Here's where the detection queries would go:

  // Example queries:
  // const idleLabsQuery = db.prepare(`
  //   SELECT COUNT(*) as count
  //   FROM FCT_ResearchLab
  //   WHERE ProjectID IS NULL
  // `)

  // For now: Return mock observations
  console.log('[Analyzer] Using MOCK observations (detection not implemented yet)')

  const observations: Observation[] = []

  // MOCK: Detect idle labs
  // Simulating: 5 labs are idle
  observations.push({
    id: 'idle-labs',
    data: {
      idleLabs: 5
    }
  })

  // MOCK: Detect idle construction factories
  // Simulating: 30% of construction capacity is idle
  observations.push({
    id: 'idle-construction-factories',
    data: {
      percentageIdle: 30
    }
  })

  // MOCK: Low fuel warning (only if we're past early game)
  if (gameState.gameYear > 2) {
    observations.push({
      id: 'fuel-low',
      data: {
        fuelPercent: 15,
        systemName: 'Sol'
      }
    })
  }

  // MOCK: Maintenance needed (only if player has built ships)
  if (gameState.hasBuiltFirstShip) {
    observations.push({
      id: 'maintenance-needed',
      data: {
        systemName: 'Sol'
      }
    })
  }

  console.log('[Analyzer] Detected', observations.length, 'observations')
  return observations
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

  // MOCK SCENARIO 1: Early game (year 1) - shows all 3 basic tutorials
  const mockGameState: GameState = {
    gameYear: 1,
    hasTNTech: false,
    alienContact: false,
    warStatus: 'peace',
    hasBuiltFirstShip: false,
    hasSurveyedHomeSystem: false
  }

  // MOCK SCENARIO 2: Mid game - player has built ship but hasn't surveyed yet
  // const mockGameState: GameState = {
  //   gameYear: 2,
  //   hasTNTech: false,
  //   alienContact: false,
  //   warStatus: 'peace',
  //   hasBuiltFirstShip: true, // Built ship - removes "first-survey-ship" tutorial
  //   hasSurveyedHomeSystem: false // Still shows "mineral-survey" tutorial
  // }

  // MOCK SCENARIO 3: Late early game - player has progressed
  // const mockGameState: GameState = {
  //   gameYear: 4,
  //   hasTNTech: false,
  //   alienContact: false,
  //   warStatus: 'peace',
  //   hasBuiltFirstShip: true,
  //   hasSurveyedHomeSystem: true // All early tutorials complete - shows none
  // }

  // MOCK SCENARIO 4: Too late for early tutorials
  // const mockGameState: GameState = {
  //   gameYear: 10, // Year too high - removes time-based tutorials
  //   hasTNTech: true,
  //   alienContact: true,
  //   warStatus: 'active',
  //   hasBuiltFirstShip: true,
  //   hasSurveyedHomeSystem: true
  // }

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
