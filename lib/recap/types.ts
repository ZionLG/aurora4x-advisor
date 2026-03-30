/**
 * Typed interfaces for the production recap system.
 *
 * These flow between three layers:
 *   DataProvider → raw game data → Compute → RecapEntry results
 *
 * The DataProvider populates these from SQL or memory.
 * The Compute layer is pure functions that never touch SQL.
 */

// ── Output types ─────────────────────────────────────────────────────

export interface RecapEntry {
  id: string
  type: 'research' | 'production' | 'ship' | 'shipyard' | 'training' | 'terraforming'
  badge: string
  name: string
  system: string
  colony: string
  colonyId: number
  remainingDays: number | null
  annualRate: string
  annualRateValue: number
  paused: boolean
  queued: boolean
}

export interface PopCap {
  constructionRate: number
  ordnanceRate: number
  fighterRate: number
  shipBuildRate: number
  researchPerLab: number
  trainingRate: number
  minConstructionPeriod: number
  shipyardOperations: number
}

// ── Body data ────────────────────────────────────────────────────────

/**
 * System body data used across all compute functions.
 *
 * Fetched once per request cycle:
 *   - Bridge mode: from Aurora's RAM via MemoryBodyProvider (getbodies endpoint)
 *   - Offline mode: from FCT_SystemBody via SqlRecapProvider
 *
 * Keyed by SystemBodyID. Any compute function that needs body info
 * receives this map instead of JOINing FCT_SystemBody in SQL.
 */
export interface BodyData {
  // Identity
  systemBodyId: number
  systemId: number
  name: string
  bodyClass: number | string

  // Physical
  radius: number
  gravity: number
  density: number

  // Position
  xcor: number
  ycor: number

  // Atmosphere & surface
  atmosPress: number
  surfaceTemp: number
  hydroExt: number
  hydroId: number

  // Environment
  radiationLevel: number
  dustLevel: number
}

// ── Population capacity inputs ───────────────────────────────────────

export interface PopulationData {
  populationId: number
  systemBodyId: number
  constructionProduction: number
  ordnanceProduction: number
  fighterProduction: number
  shipBuilding: number
  research: number
  groundFormationConstructionRate: number
  economicProdModifier: number
  productionRateModifier: number
  researchRateModifier: number
  researchSpeed: number
  efficiency: number
  politicalStability: number
  productionMod: number
  minConstructionPeriod: number
  shipyardOperations: number
}

export interface InstallationPower {
  popId: number
  constructionPower: number
  ordnancePower: number
  fighterPower: number
}

export interface EngineerPower {
  populationId: number
  groundConstructionPower: number
}

export interface GovernorBonus {
  populationId: number
  construction: number
  shipbuilding: number
  training: number
}

export interface SectorBonus {
  populationId: number
  construction: number
  shipbuilding: number
  training: number
  terraform: number
}

// ── Project-type inputs ──────────────────────────────────────────────

export interface ResearchProject {
  projectId: number
  populationId: number
  popName: string
  systemName: string
  techName: string
  researchPointsRequired: number
  facilities: number
  pause: number
  resSpecId: number
  commanderBonus: number | null
  commanderField: number | null
  anomalyBonus: number | null
  anomalyField: number | null
}

export interface IndustrialProject {
  projectId: number
  populationId: number
  popName: string
  systemName: string
  description: string
  productionType: number
  amount: number
  prodPerUnit: number
  percentage: number
  queue: number
  pause: number
}

export interface ShipTask {
  taskId: number
  populationId: number
  popName: string
  systemName: string
  unitName: string
  className: string
  totalBP: number
  completedBP: number
  paused: number
  shipSize: number
  shipCommercial: number
}

export interface ShipyardUpgrade {
  shipyardId: number
  shipyardName: string
  populationId: number
  popName: string
  systemName: string
  syType: number
  slipways: number
  capacity: number
  taskType: number
  requiredBP: number
  completedBP: number
  pauseActivity: number
  capacityTarget: number
  retoolClassName: string | null
}

export interface TrainingTask {
  taskId: number
  populationId: number
  popName: string
  systemName: string
  formationName: string
  totalBP: number
  completedBP: number
}

export interface TerraformingData {
  populationId: number
  popName: string
  systemName: string
  systemBodyId: number
  gasName: string
  gasAtm: number
  maxAtm: number
  terraformStatus: number
  terraformingRate: number
  terraformingSpeed: number
  efficiency: number
  stability: number
  prodMod: number
  groundPower: number
}

export interface OrbitalTerraformer {
  populationId: number
  orbitalPower: number
}

export interface GovernorTerraformBonus {
  populationId: number
  terraformBonus: number
}

// ── Data provider interface ──────────────────────────────────────────

export interface RecapDataProvider {
  getPopulations(): Promise<PopulationData[]>
  getInstallationPower(): Promise<InstallationPower[]>
  getEngineerPower(): Promise<EngineerPower[]>
  getGovernorBonuses(): Promise<GovernorBonus[]>
  getSectorBonuses(): Promise<SectorBonus[]>
  getBodies(): Promise<Record<number, BodyData>>
  getResearchProjects(): Promise<ResearchProject[]>
  getIndustrialProjects(): Promise<IndustrialProject[]>
  getShipTasks(): Promise<ShipTask[]>
  getShipyardUpgrades(): Promise<ShipyardUpgrade[]>
  getTrainingTasks(): Promise<TrainingTask[]>
  getTerraformingData(): Promise<TerraformingData[]>
  getOrbitalTerraformers(): Promise<OrbitalTerraformer[]>
  getGovernorTerraformBonuses(): Promise<GovernorTerraformBonus[]>
}
