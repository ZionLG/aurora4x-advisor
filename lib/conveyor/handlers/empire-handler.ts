import { handle } from '@/lib/main/shared'

export const registerEmpireHandlers = () => {
  // Fleet & ship data — will wire to compute + bridge in Phase 3
  handle('empire:getFleets', () => [])
  handle('empire:getShips', () => [])

  // Ship classes
  handle('empire:getClasses', () => [])
  handle('empire:getClassDetail', (_classId: number) => ({}))

  // System / map — will wire to bridge realtime in Phase 3
  handle('empire:getBodies', (_systemId: number) => [])
  handle('empire:getSystems', () => [])
  handle('empire:getRealtimeFleets', () => [])

  // Economy
  handle('empire:getMinerals', () => ({ totals: {}, byColony: [] }))
  handle('empire:getMineralHistory', (_resolution: string, _populationId: number | null) => ({
    resolution: 'raw',
    populationId: null,
    series: [],
  }))
  handle('empire:getMineralBreakdown', (_mineralId: number, _resolution: string) => ({
    mineralId: 0,
    mineralName: '',
    resolution: 'raw',
    series: [],
  }))
  handle('empire:getMineralColonies', () => [])

  // Research
  handle('empire:getResearch', () => ({}))

  // Navigation
  handle('empire:getWaypoints', () => [])
  handle('empire:getGameDate', () => ({
    gameTime: 0,
    startYear: 2025,
    year: 2025,
    month: 1,
    day: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formatted: '2025-01-01',
  }))

  // Route planning — will wire to compute module in Phase 3
  handle('empire:computeRoute', (_request) => ({}))
  handle('empire:computeFleetRoute', (_request) => ({}))

  // Route persistence
  handle('empire:saveRoute', (_route) => {})
  handle('empire:loadRoutes', () => [])
  handle('empire:removeRoute', (_id: string) => {})
  handle('empire:updateRoute', (_id: string, _patch) => {})

  // Fleet filters
  handle('empire:loadFilters', () => [])
  handle('empire:saveFilters', (_filters) => {})

  // Raw SQL query
  handle('empire:query', (_sql: string) => [])

  // Actions
  handle('empire:executeAction', (_request) => ({ Success: false, Error: 'Not connected' }))

  // Memory explorer
  handle('empire:enumerateGameState', () => [])
  handle('empire:enumerateCollections', () => [])
  handle('empire:readCollection', (_params) => ({}))
}
