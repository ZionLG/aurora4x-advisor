import { handle } from '@/lib/main/shared'
import { auroraBridge } from '@/lib/services/aurora-bridge'
import { gameSession } from '@/lib/services/game-session'
import {
  loadSavedRoutes,
  addSavedRoute,
  removeSavedRoute,
  updateSavedRoute,
} from '@/lib/services/route-persistence'
import { loadSavedFilters, saveSavedFilters } from '@/lib/services/filter-persistence'
import * as compute from '@/lib/compute'

function getBridgeQuery(): compute.QueryFn {
  return <T = Record<string, unknown>>(sql: string) => auroraBridge.query<T>(sql)
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
    return compute.getFleets(getBridgeQuery(), ctx)
  })

  handle('empire:getShips', async () => {
    const ctx = getGameCtx()
    return compute.getShips(getBridgeQuery(), ctx)
  })

  // Ship classes
  handle('empire:getClasses', async () => {
    const ctx = getGameCtx()
    return compute.getShipClasses(getBridgeQuery(), ctx)
  })

  handle('empire:getClassDetail', async (classId: number) => {
    const ctx = getGameCtx()
    return compute.getShipClassDetail(getBridgeQuery(), ctx, classId)
  })

  // System / map (realtime)
  handle('empire:getBodies', async (systemId: number) => {
    return auroraBridge.getBodies(systemId)
  })

  handle('empire:getSystems', async () => {
    return auroraBridge.getKnownSystems()
  })

  handle('empire:getRealtimeFleets', async () => {
    return auroraBridge.getFleets()
  })

  // Economy
  handle('empire:getMinerals', async () => {
    const ctx = getGameCtx()
    return compute.getMineralTotals(getBridgeQuery(), ctx)
  })

  handle('empire:getMineralHistory', async (resolution: string, populationId: number | null) => {
    const ctx = getGameCtx()
    return compute.getMineralHistory(
      getBridgeQuery(),
      ctx,
      resolution as compute.Resolution,
      populationId,
    )
  })

  handle('empire:getMineralBreakdown', async (mineralId: number, resolution: string) => {
    const ctx = getGameCtx()
    return compute.getMineralBreakdown(
      getBridgeQuery(),
      ctx,
      mineralId,
      resolution as compute.Resolution,
    )
  })

  handle('empire:getMineralColonies', async () => {
    const ctx = getGameCtx()
    return compute.getMineralColonies(getBridgeQuery(), ctx)
  })

  // Research
  handle('empire:getResearch', async () => {
    const ctx = getGameCtx()
    return compute.getResearchOverview(getBridgeQuery(), ctx)
  })

  // Navigation
  handle('empire:getWaypoints', async () => {
    const ctx = getGameCtx()
    return compute.getWaypoints(getBridgeQuery(), ctx)
  })

  handle('empire:getGameDate', () => {
    // Parse exact date from Aurora's title bar (pushed on every tick)
    // Format: "EmpireName   15 July 0058 08:00:00   Racial Wealth 269,6"
    const titleBar = auroraBridge.lastTitleBarText
    if (titleBar) {
      const match = titleBar.match(
        /\s{2,}(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
      )
      if (match) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
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
    return null
  })

  // Route planning
  handle('empire:computeRoute', async (request) => {
    const ctx = getGameCtx()
    return compute.computeRoute(getBridgeQuery(), ctx, request as compute.RouteRequest)
  })

  handle('empire:computeFleetRoute', async (request) => {
    const ctx = getGameCtx()
    return compute.computeFleetRoute(getBridgeQuery(), ctx, request as compute.FleetRouteRequest)
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

  // Raw SQL query
  handle('empire:query', async (sql: string) => {
    return auroraBridge.query(sql)
  })

  // Actions
  handle('empire:executeAction', async (request) => {
    return auroraBridge.executeAction(request)
  })

  // Memory explorer
  handle('empire:enumerateGameState', async () => {
    return auroraBridge.enumerateGameState()
  })

  handle('empire:enumerateCollections', async () => {
    return auroraBridge.enumerateCollections()
  })

  handle('empire:readCollection', async (params) => {
    return auroraBridge.readCollection(params)
  })
}
