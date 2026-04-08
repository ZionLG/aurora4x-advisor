/**
 * Warning types for the Warnings page.
 *
 * Each warning is a simple data object with category, severity, and display info.
 * The compute layer produces these from raw query results.
 */

export type WarningCategory = 'contacts' | 'economy' | 'populations' | 'administrations' | 'ships' | 'others'

export type WarningSeverity = 'high' | 'medium' | 'low' | 'info'

export interface Warning {
  id: string
  category: WarningCategory
  type: string
  severity: WarningSeverity
  title: string
  detail: string
  colony?: string
  system?: string
  value?: number
}

// ── Raw data types from SQL provider ─────────────────────────────────

export interface FreeLabData {
  populationId: number
  popName: string
  systemName: string
  totalLabs: number
  assignedLabs: number
  freeLabs: number
}

export interface FreeCapacityData {
  populationId: number
  popName: string
  systemName: string
  freePercent: number
  capacityType: 'construction' | 'ordnance' | 'fighter'
}

export interface DeadResearchData {
  populationId: number
  popName: string
  systemName: string
  labCount: number
}

export interface LowEfficiencyData {
  populationId: number
  popName: string
  systemName: string
  efficiency: number
  population: number
}

export interface GovernorlessData {
  populationId: number
  popName: string
  systemName: string
  population: number
}

export interface MismatchedResearchData {
  projectId: number
  popName: string
  systemName: string
  techName: string
  scientistName: string
  scientistField: string
  projectField: string
}

export interface WastedMiningData {
  populationId: number
  popName: string
  systemName: string
  miningInstallations: number
}

export interface WastedTerraformData {
  populationId: number
  popName: string
  systemName: string
  terraformInstallations: number
}

export interface ObsoleteShipyardData {
  shipyardId: number
  shipyardName: string
  popName: string
  systemName: string
  className: string
  capacity: number
  slipways: number
}

// ── Quick wins ──────────────────────────────────────────────────────

export interface StockpilingCivilianMineralsData {
  populationId: number
  popName: string
  systemName: string
  totalStockpile: number
}

export interface SelfSustainingDestinationData {
  populationId: number
  popName: string
  systemName: string
  population: number
}

// ── Ship warning data types ─────────────────────────────────────────

export interface DamagedShipData {
  shipId: number
  shipName: string
  fleetName: string
  damagedComponents: string
  repairCost: number
}

export interface ArmorDamagedShipData {
  shipId: number
  shipName: string
  fleetName: string
  armorDamage: number
  armorThickness: number
  thinnestLayer: number
}

export interface LowMoraleShipData {
  shipId: number
  shipName: string
  fleetName: string
  morale: number
}

export interface LowMaintenanceShipData {
  shipId: number
  shipName: string
  fleetName: string
  currentSupplies: number
  requiredSupplies: number
  supplyLevel: number
}

export interface MisconfiguredSupplyClassData {
  shipClassId: number
  className: string
}

export interface MisconfiguredTankerClassData {
  shipClassId: number
  className: string
}

export interface ObsoleteShipData {
  shipId: number
  shipName: string
  fleetName: string
  className: string
}

export interface FullyTrainedShipData {
  shipId: number
  shipName: string
  fleetName: string
}

export interface ActiveFireControlData {
  shipId: number
  shipName: string
  fleetName: string
  fireControls: string[]
}

export interface TransportNoShuttleData {
  shipClassId: number
  className: string
  cargoCapacity: number
  colonistCapacity: number
  troopCapacity: number
}

// ── Admin data types ────────────────────────────────────────────────

export interface CommanderlessAdminData {
  adminId: number
  adminName: string
  popName: string
}

export interface CommanderlessSectorData {
  sectorId: number
  sectorName: string
  popName: string
}

// ── Exploration / Contacts data types ───────────────────────────────

export interface ActiveLifepodData {
  lifepodId: number
  shipName: string
  crew: number
  systemName: string
  creationTime: number
}

export interface KnownWreckData {
  wreckId: number
  className: string
  size: number
  systemName: string
  owned: boolean
}

export interface UnexploitedConstructData {
  constructId: number
  systemBodyName: string
  systemName: string
  researchField: string
  researchBonus: number
  active: boolean
  hasPopulation: boolean
}

export interface DangerousRiftData {
  systemName: string
  diameter: number
  fleetCount: number
  populationCount: number
}

export interface IntruderData {
  systemName: string
  raceName: string
  contactType: string
  count: number
  hostile: boolean
}

// ── Provider interface ───────────────────────────────────────────────

export interface WarningsDataProvider {
  // Economy / Populations
  getStockpilingCivilianMinerals(): Promise<StockpilingCivilianMineralsData[]>
  getSelfSustainingDestinations(): Promise<SelfSustainingDestinationData[]>
  getFreeLabs(): Promise<FreeLabData[]>
  getFreeCapacity(): Promise<FreeCapacityData[]>
  getDeadResearch(): Promise<DeadResearchData[]>
  getLowEfficiency(): Promise<LowEfficiencyData[]>
  getGovernorless(): Promise<GovernorlessData[]>
  getMismatchedResearch(): Promise<MismatchedResearchData[]>
  getWastedMining(): Promise<WastedMiningData[]>
  getWastedTerraform(): Promise<WastedTerraformData[]>
  getObsoleteShipyards(): Promise<ObsoleteShipyardData[]>
  // Ships
  getDamagedShips(): Promise<DamagedShipData[]>
  getArmorDamagedShips(): Promise<ArmorDamagedShipData[]>
  getLowMoraleShips(): Promise<LowMoraleShipData[]>
  getLowMaintenanceShips(): Promise<LowMaintenanceShipData[]>
  getMisconfiguredSupplyClasses(): Promise<MisconfiguredSupplyClassData[]>
  getMisconfiguredTankerClasses(): Promise<MisconfiguredTankerClassData[]>
  getObsoleteShips(): Promise<ObsoleteShipData[]>
  getFullyTrainedShips(): Promise<FullyTrainedShipData[]>
  getActiveFireControls(): Promise<ActiveFireControlData[]>
  getTransportNoShuttleClasses(): Promise<TransportNoShuttleData[]>
  // Admin
  getCommanderlessAdmins(): Promise<CommanderlessAdminData[]>
  getCommanderlessSectors(): Promise<CommanderlessSectorData[]>
  // Exploration / Contacts
  getActiveLifepods(): Promise<ActiveLifepodData[]>
  getKnownWrecks(): Promise<KnownWreckData[]>
  getUnexploitedConstructs(): Promise<UnexploitedConstructData[]>
  getDangerousRifts(): Promise<DangerousRiftData[]>
  getIntruders(): Promise<IntruderData[]>
}
