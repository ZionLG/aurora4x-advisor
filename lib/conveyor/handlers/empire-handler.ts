import { handle } from '@/lib/main/shared'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { gameSession } from '@/lib/services/game-session'
import { getOfflineQuery, makeDirectQuery } from '@/lib/services/offline-query'
import * as compute from '@/lib/compute'
import { formatGameDate } from '@/lib/compute/utils'

/**
 * Returns the active QueryFn — either offline (direct SQLite) or bridge (WebSocket).
 * The compute module doesn't care which one it gets.
 */
function getQuery(): compute.QueryFn {
  const offlineQuery = getOfflineQuery()
  if (offlineQuery) return offlineQuery
  return <T = Record<string, unknown>>(sql: string) => auroraBridge.query<T>(sql)
}

function requireBridge(): void {
  if (!auroraBridge.isConnected) {
    throw new Error('This feature requires the Aurora bridge connection')
  }
}

function getGameCtx(): compute.GameCtx {
  const game = gameSession.currentGame
  if (!game) throw new Error('No game selected')
  return { gameId: game.gameInfo.auroraGameId, raceId: game.gameInfo.auroraRaceId }
}

export const registerEmpireHandlers = () => {
  // Game date (used by sidebar)
  handle('empire:getGameDate', async () => {
    // Try bridge title bar first (realtime)
    const titleBar = auroraBridge.lastTitleBarText
    if (titleBar) {
      const match = titleBar.match(
        /\s{2,}(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/
      )
      if (match) {
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        const day = parseInt(match[1])
        const month = monthNames.indexOf(match[2]) + 1
        const year = parseInt(match[3])
        const hours = parseInt(match[4])
        const minutes = parseInt(match[5])
        const seconds = parseInt(match[6])
        const m = month < 10 ? `0${month}` : `${month}`
        const d = day < 10 ? `0${day}` : `${day}`
        return {
          gameTime: 0,
          startYear: year,
          year,
          month,
          day,
          hours,
          minutes,
          seconds,
          formatted: `${year}-${m}-${d}`,
        }
      }
    }

    // Fallback: read from database (works offline)
    try {
      const ctx = getGameCtx()
      const rows = await getQuery()<{ GameTime: number; StartYear: number }>(
        `SELECT GameTime, StartYear FROM FCT_Game WHERE GameID = ${ctx.gameId}`
      )
      if (rows.length > 0) {
        const { GameTime, StartYear } = rows[0]
        return {
          gameTime: GameTime,
          startYear: StartYear,
          year: 0,
          month: 0,
          day: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          formatted: formatGameDate(GameTime, StartYear),
        }
      }
    } catch {
      /* no data available */
    }

    return null
  })


  // ── Production Recap (granular, provider-based) ──────────────────────

  function createSqlProvider(forceOffline: boolean) {
    let queryFn: compute.QueryFn
    if (forceOffline) {
      const offlineQuery = getOfflineQuery()
      if (offlineQuery) {
        queryFn = offlineQuery
      } else {
        const dbPath = auroraBridge.auroraDbPath
        queryFn = dbPath ? makeDirectQuery(dbPath) : getQuery()
      }
    } else {
      queryFn = getQuery()
    }
    const ctx = getGameCtx()
    return new compute.SqlRecapProvider(queryFn, ctx.gameId, ctx.raceId)
  }

  /**
   * Shared body data — bridge reads from Aurora's RAM, offline reads from DB file.
   * Cached 30s with concurrent request deduplication (see get-bodies.ts).
   */
  async function getBodies(forceOffline: boolean): Promise<Record<number, compute.BodyData>> {
    const ctx = getGameCtx()
    let queryFn: compute.QueryFn
    if (forceOffline) {
      const offlineQuery = getOfflineQuery()
      queryFn = offlineQuery ?? (auroraBridge.auroraDbPath ? makeDirectQuery(auroraBridge.auroraDbPath) : getQuery())
    } else {
      queryFn = getQuery()
    }
    return compute.fetchBodies({
      bridgeConnected: auroraBridge.isConnected,
      bridgeSend: auroraBridge.send.bind(auroraBridge),
      query: queryFn,
      gameId: ctx.gameId,
      raceId: ctx.raceId,
      forceOffline,
    })
  }

  // PopCaps: cached + deduplicated (6 handlers fire concurrently from composer)
  let popCapsCache: { data: Map<number, compute.PopCap>; gameId: number; ts: number; offline: boolean } | null = null
  let popCapsInflight: Promise<Map<number, compute.PopCap>> | null = null
  const POPCAPS_TTL = 2000

  async function getCachedPopCaps(forceOffline: boolean): Promise<Map<number, compute.PopCap>> {
    const ctx = getGameCtx()
    const now = Date.now()
    if (
      popCapsCache &&
      popCapsCache.gameId === ctx.gameId &&
      popCapsCache.offline === forceOffline &&
      now - popCapsCache.ts < POPCAPS_TTL
    ) {
      return popCapsCache.data
    }
    if (popCapsInflight) return popCapsInflight

    popCapsInflight = (async () => {
      const sql = createSqlProvider(forceOffline)
      const [pops, inst, eng, gov, sector, bodies] = await Promise.all([
        sql.getPopulations(),
        sql.getInstallationPower(),
        sql.getEngineerPower(),
        sql.getGovernorBonuses(),
        sql.getSectorBonuses(),
        getBodies(forceOffline),
      ])
      const data = compute.calculatePopCaps(pops, inst, eng, gov, sector, bodies)
      popCapsCache = { data, gameId: ctx.gameId, ts: Date.now(), offline: forceOffline }
      return data
    })()

    try {
      return await popCapsInflight
    } finally {
      popCapsInflight = null
    }
  }

  handle('empire:getProductionRecap', async () => {
    // Monolithic — kept for compat
    const provider = createSqlProvider(false)
    const [pops, inst, eng, gov, sector, bodies] = await Promise.all([
      provider.getPopulations(),
      provider.getInstallationPower(),
      provider.getEngineerPower(),
      provider.getGovernorBonuses(),
      provider.getSectorBonuses(),
      getBodies(false),
    ])
    const caps = compute.calculatePopCaps(pops, inst, eng, gov, sector, bodies)
    const [research, industrial, ships, shipyards, training, terraforming] = await Promise.all([
      provider.getResearchProjects().then((p) => compute.calculateResearchEntries(p, caps)),
      provider.getIndustrialProjects().then((p) => compute.calculateIndustrialEntries(p, caps)),
      provider.getShipTasks().then((t) => compute.calculateShipEntries(t, caps)),
      provider.getShipyardUpgrades().then((u) => compute.calculateShipyardEntries(u, caps)),
      provider.getTrainingTasks().then((t) => compute.calculateTrainingEntries(t, caps)),
      Promise.all([
        provider.getTerraformingData(),
        provider.getOrbitalTerraformers(),
        provider.getGovernorTerraformBonuses(),
      ]).then(([td, ot, gt]) => compute.calculateTerraformingEntries(td, ot, gt, bodies)),
    ])
    return [...research, ...industrial, ...ships, ...shipyards, ...training, ...terraforming].sort(
      (a, b) => (a.remainingDays ?? Infinity) - (b.remainingDays ?? Infinity)
    )
  })

  handle('empire:getBodyMap', async (forceOffline: boolean) => {
    return getBodies(forceOffline)
  })

  handle('empire:getPopCapacities', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const result: Record<number, compute.PopCap> = {}
    caps.forEach((v, k) => {
      result[k] = v
    })
    return result
  })

  handle('empire:getRecapResearch', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const provider = createSqlProvider(forceOffline)
    const projects = await provider.getResearchProjects()
    return compute.calculateResearchEntries(projects, caps)
  })

  handle('empire:getRecapIndustrial', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const provider = createSqlProvider(forceOffline)
    const projects = await provider.getIndustrialProjects()
    return compute.calculateIndustrialEntries(projects, caps)
  })

  handle('empire:getRecapShips', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const provider = createSqlProvider(forceOffline)
    const tasks = await provider.getShipTasks()
    return compute.calculateShipEntries(tasks, caps)
  })

  handle('empire:getRecapShipyards', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const provider = createSqlProvider(forceOffline)
    const upgrades = await provider.getShipyardUpgrades()
    return compute.calculateShipyardEntries(upgrades, caps)
  })

  handle('empire:getRecapTraining', async (forceOffline: boolean) => {
    const caps = await getCachedPopCaps(forceOffline)
    const provider = createSqlProvider(forceOffline)
    const tasks = await provider.getTrainingTasks()
    return compute.calculateTrainingEntries(tasks, caps)
  })

  handle('empire:getRecapTerraforming', async (forceOffline: boolean) => {
    const sql = createSqlProvider(forceOffline)
    const [data, orbital, govTerraform, bodies] = await Promise.all([
      sql.getTerraformingData(),
      sql.getOrbitalTerraformers(),
      sql.getGovernorTerraformBonuses(),
      getBodies(forceOffline),
    ])
    return compute.calculateTerraformingEntries(data, orbital, govTerraform, bodies)
  })

  // Game log
  handle(
    'empire:getGameLog',
    async (limit?: number, offset?: number, eventTypes?: number[], onlyCustomized?: boolean, showHidden?: boolean) => {
      const ctx = getGameCtx()
      return compute.getGameLog(getQuery(), ctx, { limit, offset, eventTypes, onlyCustomized, showHidden })
    }
  )

  handle('empire:getEventTypes', async () => {
    const ctx = getGameCtx()
    return compute.getUsedEventTypes(getQuery(), ctx)
  })

  // Raw SQL query (works offline)
  handle('empire:query', async (sql: string) => {
    return getQuery()(sql)
  })

  // Actions (bridge only)
  handle('empire:executeAction', async (request) => {
    requireBridge()
    return auroraBridge.executeAction(request)
  })

  // Bridge diagnostics
  handle('empire:getTableMapping', async () => {
    requireBridge()
    return auroraBridge.getTableMapping()
  })

  handle('empire:rediscoverMapping', async () => {
    requireBridge()
    return auroraBridge.send('rediscovermapping', null)
  })

  handle('empire:dumpBodyRaw', async (systemBodyId: number) => {
    requireBridge()
    return auroraBridge.send('dumpbodyraw', { SystemBodyId: systemBodyId })
  })

  // Memory explorer (bridge only)
  handle('empire:enumerateGameState', async () => {
    requireBridge()
    return auroraBridge.enumerateGameState()
  })

  handle('empire:enumerateCollections', async () => {
    requireBridge()
    return auroraBridge.enumerateCollections()
  })

  handle('empire:readCollection', async (params) => {
    requireBridge()
    return auroraBridge.readCollection(params)
  })
}
