import { handle } from '@/lib/main/shared'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { gameSession } from '@/lib/services/game-session'
import { getOfflineQuery } from '@/lib/services/offline-query'
import { loadSavedRoutes, addSavedRoute, removeSavedRoute, updateSavedRoute } from '@/lib/services/route-persistence'
import { loadSavedFilters, saveSavedFilters } from '@/lib/services/filter-persistence'
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
  // Fleet & ship data
  handle('empire:getFleets', async () => {
    const ctx = getGameCtx()
    return compute.getFleets(getQuery(), ctx)
  })

  handle('empire:getShips', async () => {
    const ctx = getGameCtx()
    return compute.getShips(getQuery(), ctx)
  })

  // Ship classes
  handle('empire:getClasses', async () => {
    const ctx = getGameCtx()
    return compute.getShipClasses(getQuery(), ctx)
  })

  handle('empire:getClassDetail', async (classId: number) => {
    const ctx = getGameCtx()
    return compute.getShipClassDetail(getQuery(), ctx, classId)
  })

  // System / map (realtime — bridge only)
  handle('empire:getBodies', async (systemId: number) => {
    requireBridge()
    return auroraBridge.getBodies(systemId)
  })

  handle('empire:getSystems', async () => {
    requireBridge()
    return auroraBridge.getKnownSystems()
  })

  handle('empire:getRealtimeFleets', async () => {
    requireBridge()
    return auroraBridge.getFleets()
  })

  // Economy
  handle('empire:getMinerals', async () => {
    const ctx = getGameCtx()
    return compute.getMineralTotals(getQuery(), ctx)
  })

  handle('empire:getMineralHistory', async (resolution: string, populationId: number | null) => {
    const ctx = getGameCtx()
    return compute.getMineralHistory(getQuery(), ctx, resolution as compute.Resolution, populationId)
  })

  handle('empire:getMineralBreakdown', async (mineralId: number, resolution: string) => {
    const ctx = getGameCtx()
    return compute.getMineralBreakdown(getQuery(), ctx, mineralId, resolution as compute.Resolution)
  })

  handle('empire:getMineralColonies', async () => {
    const ctx = getGameCtx()
    return compute.getMineralColonies(getQuery(), ctx)
  })

  // Research
  handle('empire:getResearch', async () => {
    const ctx = getGameCtx()
    return compute.getResearchOverview(getQuery(), ctx)
  })

  // Navigation
  handle('empire:getWaypoints', async () => {
    const ctx = getGameCtx()
    return compute.getWaypoints(getQuery(), ctx)
  })

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

  // Route planning
  handle('empire:computeRoute', async (request) => {
    const ctx = getGameCtx()
    return compute.computeRoute(getQuery(), ctx, request as compute.RouteRequest)
  })

  handle('empire:computeFleetRoute', async (request) => {
    const ctx = getGameCtx()
    return compute.computeFleetRoute(getQuery(), ctx, request as compute.FleetRouteRequest)
  })

  // Route persistence
  handle('empire:saveRoute', async (route) => {
    await addSavedRoute(route as Parameters<typeof addSavedRoute>[0])
  })

  handle('empire:loadRoutes', () => loadSavedRoutes())

  handle('empire:removeRoute', async (id: string) => {
    await removeSavedRoute(id)
  })

  handle('empire:updateRoute', async (id: string, patch) => {
    await updateSavedRoute(id, patch as Parameters<typeof updateSavedRoute>[1])
  })

  // Fleet filters
  handle('empire:loadFilters', () => loadSavedFilters())

  handle('empire:saveFilters', async (filters) => {
    await saveSavedFilters(filters as Parameters<typeof saveSavedFilters>[0])
  })

  // Production & shipyards
  handle('empire:getProduction', async () => {
    const ctx = getGameCtx()
    return compute.getProductionTasks(getQuery(), ctx)
  })

  handle('empire:getShipyards', async () => {
    const ctx = getGameCtx()
    return compute.getShipyards(getQuery(), ctx)
  })

  // Warnings
  handle('empire:getWarnings', async () => {
    const ctx = getGameCtx()
    return compute.getWarnings(getQuery(), ctx)
  })

  // Habitability
  handle('empire:getHabitability', async () => {
    const ctx = getGameCtx()
    return compute.getHabitability(getQuery(), ctx)
  })

  handle('empire:getSpeciesRequirements', async () => {
    const ctx = getGameCtx()
    return compute.getSpeciesRequirements(getQuery(), ctx)
  })

  // Production recap
  handle('empire:getProductionRecap', async () => {
    const ctx = getGameCtx()
    return compute.getProductionRecap(getQuery(), ctx)
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
