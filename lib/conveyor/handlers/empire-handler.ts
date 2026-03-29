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
import { formatGameDate } from '@/lib/compute/utils'

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

  handle('empire:getGameDate', async () => {
    const ctx = getGameCtx()
    const rows = await getBridgeQuery()<{ GameTime: number; StartYear: number }>(
      `SELECT GameTime, StartYear FROM FCT_Game WHERE GameID = ${ctx.gameId}`,
    )
    if (rows.length === 0) return null
    const { GameTime, StartYear } = rows[0]
    const totalDays = GameTime / 86400
    const yearsElapsed = Math.floor(totalDays / 365.25)
    const remainingDays = totalDays - yearsElapsed * 365.25
    return {
      gameTime: GameTime,
      startYear: StartYear,
      year: StartYear + yearsElapsed,
      month: Math.floor(remainingDays / 30.44) + 1,
      day: Math.floor(remainingDays % 30.44) + 1,
      hours: Math.floor((GameTime % 86400) / 3600),
      minutes: Math.floor((GameTime % 3600) / 60),
      seconds: Math.floor(GameTime % 60),
      formatted: formatGameDate(GameTime, StartYear),
    }
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
