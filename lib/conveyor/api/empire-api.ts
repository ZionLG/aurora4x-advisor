import { ConveyorApi } from '@/lib/preload/shared'
import type { ActionRequest, ReadCollectionParams } from '@/shared/types'

export class EmpireApi extends ConveyorApi {
  // Fleet & ship data
  getFleets = () => this.invoke('empire:getFleets')
  getShips = () => this.invoke('empire:getShips')

  // Ship classes
  getClasses = () => this.invoke('empire:getClasses')
  getClassDetail = (classId: number) => this.invoke('empire:getClassDetail', classId)

  // System / map
  getBodies = (systemId: number) => this.invoke('empire:getBodies', systemId)
  getSystems = () => this.invoke('empire:getSystems')
  getRealtimeFleets = () => this.invoke('empire:getRealtimeFleets')

  // Economy
  getMinerals = () => this.invoke('empire:getMinerals')
  getMineralHistory = (resolution: string, populationId: number | null) =>
    this.invoke('empire:getMineralHistory', resolution, populationId)
  getMineralBreakdown = (mineralId: number, resolution: string) =>
    this.invoke('empire:getMineralBreakdown', mineralId, resolution)
  getMineralColonies = () => this.invoke('empire:getMineralColonies')

  // Research
  getResearch = () => this.invoke('empire:getResearch')

  // Navigation
  getWaypoints = () => this.invoke('empire:getWaypoints')
  getGameDate = () => this.invoke('empire:getGameDate')

  // Route planning
  computeRoute = (request: Record<string, unknown>) => this.invoke('empire:computeRoute', request)
  computeFleetRoute = (request: Record<string, unknown>) => this.invoke('empire:computeFleetRoute', request)

  // Route persistence
  saveRoute = (route: Record<string, unknown>) => this.invoke('empire:saveRoute', route)
  loadRoutes = () => this.invoke('empire:loadRoutes')
  removeRoute = (id: string) => this.invoke('empire:removeRoute', id)
  updateRoute = (id: string, patch: Record<string, unknown>) => this.invoke('empire:updateRoute', id, patch)

  // Fleet filters
  loadFilters = () => this.invoke('empire:loadFilters')
  saveFilters = (filters: Record<string, unknown>[]) => this.invoke('empire:saveFilters', filters)

  // Production & shipyards
  getProduction = () => this.invoke('empire:getProduction')
  getShipyards = () => this.invoke('empire:getShipyards')

  // Habitability
  getHabitability = () => this.invoke('empire:getHabitability')
  getSpeciesRequirements = () => this.invoke('empire:getSpeciesRequirements')

  // Production recap (monolithic)
  getProductionRecap = () => this.invoke('empire:getProductionRecap')

  // Production recap (granular - shared cache, forceOffline bypasses bridge)
  getBodyMap = (forceOffline?: boolean) => this.invoke('empire:getBodyMap', forceOffline ?? false)
  getPopCapacities = (forceOffline?: boolean) => this.invoke('empire:getPopCapacities', forceOffline ?? false)
  getRecapResearch = (forceOffline?: boolean) => this.invoke('empire:getRecapResearch', forceOffline ?? false)
  getRecapIndustrial = (forceOffline?: boolean) => this.invoke('empire:getRecapIndustrial', forceOffline ?? false)
  getRecapShips = (forceOffline?: boolean) => this.invoke('empire:getRecapShips', forceOffline ?? false)
  getRecapShipyards = (forceOffline?: boolean) => this.invoke('empire:getRecapShipyards', forceOffline ?? false)
  getRecapTraining = (forceOffline?: boolean) => this.invoke('empire:getRecapTraining', forceOffline ?? false)
  getRecapTerraforming = (forceOffline?: boolean) => this.invoke('empire:getRecapTerraforming', forceOffline ?? false)

  // Warnings
  getWarnings = (forceOffline?: boolean) => this.invoke('empire:getWarnings', forceOffline ?? false)

  // Game log
  getGameLog = (
    limit?: number,
    offset?: number,
    eventTypes?: number[],
    onlyCustomized?: boolean,
    showHidden?: boolean,
    forceOffline?: boolean
  ) => this.invoke('empire:getGameLog', limit, offset, eventTypes, onlyCustomized, showHidden, forceOffline)
  getEventTypes = () => this.invoke('empire:getEventTypes')
  getHabitability = (forceOffline: boolean, speciesId: number, terraformers: number) => this.invoke('empire:getHabitability', forceOffline, speciesId, terraformers)
  getMinerals = (forceOffline?: boolean) => this.invoke('empire:getMinerals', forceOffline ?? false)
  getTechTree = (forceOffline?: boolean) => this.invoke('empire:getTechTree', forceOffline ?? false)

  // Bridge diagnostics
  getTableMapping = () => this.invoke('empire:getTableMapping')
  rediscoverMapping = () => this.invoke('empire:rediscoverMapping')
  markStale = () => this.invoke('empire:markStale')
  dumpBodyRaw = (systemBodyId: number) => this.invoke('empire:dumpBodyRaw', systemBodyId)

  // Raw SQL (dev tools)
  query = (sql: string) => this.invoke('empire:query', sql)

  // Actions
  executeAction = (request: ActionRequest) => this.invoke('empire:executeAction', request)

  // Memory explorer (dev tools)
  enumerateGameState = () => this.invoke('empire:enumerateGameState')
  enumerateCollections = () => this.invoke('empire:enumerateCollections')
  readCollection = (params: ReadCollectionParams) => this.invoke('empire:readCollection', params)
}
