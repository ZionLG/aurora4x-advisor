# Plan: Production Recap Architecture Refactor

## Summary

Refactor the 928-line monolithic `lib/compute/production-recap.ts` into a clean 3-layer architecture:

1. **Data Types** — shared typed interfaces for all raw game data
2. **Data Provider** — fetches typed data from SQL (or future memory reader)
3. **Compute** — pure functions that receive data objects and return results (no SQL, no QueryFn)

The handler layer becomes a thin orchestrator that picks a provider, fetches data, and passes it to compute.

## Research Findings

### Current Issues (from codebase analysis)

- Compute functions embed 30+ SQL queries directly (ref: production-recap.ts lines 72-93, 103-110, 120-136, etc.)
- Conditional SQL templates based on `bodyMap` parameter (ref: lines 84, 91, 793, 804)
- Dead V1 terraforming code (lines 634-762) — unreachable, lint warnings
- Governor bonus triple-self-JOIN bug — SQLite in-memory engine fails with multiple LEFT JOINs on same table (confirmed via testing)
- `r.RadiationMod` reference after rename to `RadiationLevel` caused NaN (ref: line 228 bug)
- `annualRateValue` missing from shipyard continual upgrade return path (ref: line 541-553)
- Inconsistent indentation in terraforming return (ref: line 547-548, 898)
- Stale docstring claims commander bonuses not included (line 7) — they are
- Handler has inline SQL fallback in `empire:getBodyMap` (breaks SQL-in-compute boundary)
- `forceOffline` boolean propagates through every layer, adding complexity everywhere

### Governor Bonus Fix

The triple-self-JOIN on `FCT_CommanderBonuses` fails in bridge mode. Confirmed fix: use `CASE WHEN` + `GROUP BY` in a single query:

```sql
SELECT c.CommandID as PopID,
  MAX(CASE WHEN cb.BonusID = 5 THEN cb.BonusValue END) as ConstructionBonus,
  MAX(CASE WHEN cb.BonusID = 4 THEN cb.BonusValue END) as ShipbuildingBonus,
  MAX(CASE WHEN cb.BonusID = 11 THEN cb.BonusValue END) as TrainingBonus
FROM FCT_Commander c
LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID IN (4, 5, 11)
WHERE c.GameID = ? AND c.CommandType = 3 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
GROUP BY c.CommandID
```

Single JOIN, no multi-alias issue. Same pattern for sector commanders (4 bonus types).

### Body Data Resolution

- `FCT_SystemBody` has no bridge save method — data comes from disk at startup
- DIM table copy (already implemented) populates it from `AuroraDB.db` on bridge startup
- SqlProvider can always JOIN `FCT_SystemBody` — no conditional needed
- For future MemoryProvider: read from `getbodies` endpoint (RadiationLevel = field `ak`, confirmed)

## Implementation Steps

### Step 1: Create `lib/recap/types.ts` — Data interfaces

All typed interfaces for raw data flowing between provider and compute:

```typescript
// Population base modifiers (from FCT_Population + FCT_Race + FCT_Game + FCT_Species)
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
  researchSpeed: number          // FCT_Game.ResearchSpeed / 100
  efficiency: number
  politicalStability: number     // 1 - UnrestPoints/100
  productionMod: number          // DIM_PopPoliticalStatus.ProductionMod
  minConstructionPeriod: number  // FCT_Game.MinConstructionPeriod (seconds)
  shipyardOperations: number     // FCT_Race.ShipyardOperations
}

// Installation production power (from FCT_PopulationInstallations + DIM_PlanetaryInstallation)
export interface InstallationPower {
  popId: number
  constructionPower: number
  ordnancePower: number
  fighterPower: number
}

// Ground engineer construction power (from FCT_GroundUnitFormation + elements + classes + commanders)
export interface EngineerPower {
  populationId: number
  groundConstructionPower: number
}

// Planet governor bonuses (from FCT_Commander + FCT_CommanderBonuses, CommandType=3)
export interface GovernorBonus {
  populationId: number
  construction: number  // BonusID=5, default 1
  shipbuilding: number  // BonusID=4, default 1
  training: number      // BonusID=11, default 1
}

// Sector commander bonuses (25% effectiveness, from FCT_Commander + bonuses, CommandType=4)
export interface SectorBonus {
  populationId: number
  construction: number
  shipbuilding: number
  training: number
  terraform: number
}

// System body data (from FCT_SystemBody or bridge memory)
export interface BodyData {
  radius: number
  radiationLevel: number
  hydroExt: number
  atmosPress: number
}

// Research project (from FCT_ResearchProject + joins)
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
  commanderBonus: number | null   // BonusID=3
  commanderField: number | null   // Commander.ResSpecID
  anomalyBonus: number | null     // FCT_AncientConstruct.ResearchBonus
  anomalyField: number | null     // FCT_AncientConstruct.ResearchField
}

// Industrial project (from FCT_IndustrialProjects + joins)
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

// Ship construction task (from FCT_ShipyardTask + joins)
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

// Shipyard upgrade (from FCT_Shipyard where TaskType > 0)
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

// Training task (from FCT_GroundUnitTraining + joins)
export interface TrainingTask {
  taskId: number
  populationId: number
  popName: string
  systemName: string
  formationName: string
  totalBP: number
  completedBP: number
}

// Terraforming base data (from FCT_Population + joins, per terraforming colony)
export interface TerraformingData {
  populationId: number
  popName: string
  systemName: string
  systemBodyId: number
  gasName: string
  gasAtm: number
  maxAtm: number
  terraformStatus: number
  terraformingRate: number    // FCT_Race.TerraformingRate
  terraformingSpeed: number   // FCT_Game.TerraformingSpeed / 100
  efficiency: number
  stability: number
  prodMod: number
  groundPower: number         // sum of installation TerraformValue × Amount
}

// Orbital terraformer power (from FCT_Ship + FCT_ShipClass + FCT_Fleet)
export interface OrbitalTerraformer {
  populationId: number
  orbitalPower: number
}

// Governor terraform bonus (from FCT_Commander + BonusID=9)
export interface GovernorTerraformBonus {
  populationId: number
  terraformBonus: number
}

// Re-export existing output types
export interface RecapEntry { ... }  // same as current
export interface PopCap { ... }      // same as current
```

### Step 2: Create `lib/recap/sql-provider.ts` — SQL data fetching

Extract all SQL queries from `production-recap.ts` into a class:

```typescript
import type { QueryFn, GameCtx } from '../compute/types'
import type { PopulationData, InstallationPower, ... } from './types'

export class SqlRecapProvider {
  constructor(private query: QueryFn, private ctx: GameCtx) {}

  async getPopulations(): Promise<PopulationData[]> { /* SQL from getPopCaps Query 1 */ }
  async getInstallationPower(): Promise<InstallationPower[]> { /* SQL from getPopCaps Query 2 */ }
  async getEngineerPower(): Promise<EngineerPower[]> { /* SQL from getPopCaps Query 3 */ }
  async getGovernorBonuses(): Promise<GovernorBonus[]> { /* CASE WHEN + GROUP BY fix */ }
  async getSectorBonuses(): Promise<SectorBonus[]> { /* CASE WHEN + GROUP BY fix */ }
  async getBodies(): Promise<Record<number, BodyData>> { /* SQL on FCT_SystemBody */ }
  async getResearchProjects(): Promise<ResearchProject[]> { /* SQL from getResearchEntries */ }
  async getIndustrialProjects(): Promise<IndustrialProject[]> { /* SQL from getIndustrialEntries */ }
  async getShipTasks(): Promise<ShipTask[]> { /* SQL from getShipEntries */ }
  async getShipyardUpgrades(): Promise<ShipyardUpgrade[]> { /* SQL from getShipyardEntries */ }
  async getTrainingTasks(): Promise<TrainingTask[]> { /* SQL from getTrainingEntries */ }
  async getTerraformingData(): Promise<TerraformingData[]> { /* SQL from getTerraformingEntries base */ }
  async getOrbitalTerraformers(): Promise<OrbitalTerraformer[]> { /* SQL from orbital query */ }
  async getGovernorTerraformBonuses(): Promise<GovernorTerraformBonus[]> { /* SQL from gov terraform */ }
}
```

Key changes from current SQL:

- Governor bonuses: single query with `CASE WHEN` + `GROUP BY` (fixes bridge bug)
- Sector bonuses: same `CASE WHEN` pattern (fixes same bug proactively)
- NO conditional `${bodyMap ? ... : ...}` — always JOIN `FCT_SystemBody`
- NO `bodyMap` parameter anywhere
- SQL returns camelCase fields matching the typed interfaces (mapped from SQL column names)

### Step 3: Create `lib/recap/compute.ts` — Pure computation

All math, zero SQL. Each function takes typed data objects and returns results:

```typescript
import type { PopulationData, InstallationPower, ..., RecapEntry, PopCap, BodyData } from './types'

const DAYS_PER_YEAR = 365

export function calculatePopCaps(
  populations: PopulationData[],
  installations: InstallationPower[],
  engineers: EngineerPower[],
  governors: GovernorBonus[],
  sectors: SectorBonus[],
  bodies: Record<number, BodyData>,
): Map<number, PopCap> { ... }

export function calculateResearchEntries(
  projects: ResearchProject[],
  caps: Map<number, PopCap>,
): RecapEntry[] { ... }

export function calculateIndustrialEntries(
  projects: IndustrialProject[],
  caps: Map<number, PopCap>,
): RecapEntry[] { ... }

export function calculateShipEntries(
  tasks: ShipTask[],
  caps: Map<number, PopCap>,
): RecapEntry[] { ... }

export function calculateShipyardEntries(
  upgrades: ShipyardUpgrade[],
  caps: Map<number, PopCap>,
): RecapEntry[] { ... }

export function calculateTrainingEntries(
  tasks: TrainingTask[],
  caps: Map<number, PopCap>,
): RecapEntry[] { ... }

export function calculateTerraformingEntries(
  data: TerraformingData[],
  orbital: OrbitalTerraformer[],
  govTerraform: GovernorTerraformBonus[],
  bodies: Record<number, BodyData>,
): RecapEntry[] { ... }
```

The math inside each function is identical to current — just extracted from the SQL query `.map()` callbacks. No logic changes.

### Step 4: Create `lib/recap/index.ts` — Re-exports

```typescript
export * from './types'
export * from './compute'
export { SqlRecapProvider } from './sql-provider'
```

### Step 5: Update `lib/compute/index.ts` — Point to new location

Replace `export * from './production-recap'` with `export * from '../recap'`.
Keep backward compat for any other files importing from compute.

### Step 6: Update `lib/conveyor/handlers/empire-handler.ts` — Simplify handlers

Remove:

- `getRecapQuery()` function
- `getBodyMapData()` function and its cache
- `getCachedPopCaps()` function and its cache
- All `bodyMap` passing logic
- Inline SQL in `empire:getBodyMap`

Add:

- `createProvider(forceOffline)` — returns `new SqlRecapProvider(queryFn, ctx)`
- `popCapsCache` — caches the computed `Map<number, PopCap>` result (2s TTL, keyed by provider type)

Handler pattern becomes:

```typescript
handle('empire:getRecapResearch', async (forceOffline: boolean) => {
  const provider = createProvider(forceOffline)
  const caps = await getCachedPopCaps(provider)
  const projects = await provider.getResearchProjects()
  return recap.calculateResearchEntries(projects, caps)
})
```

`getCachedPopCaps` internally:

```typescript
async function getCachedPopCaps(provider: SqlRecapProvider) {
  // Check TTL cache...
  const [pops, inst, eng, gov, sector, bodies] = await Promise.all([
    provider.getPopulations(),
    provider.getInstallationPower(),
    provider.getEngineerPower(),
    provider.getGovernorBonuses(),
    provider.getSectorBonuses(),
    provider.getBodies(),
  ])
  return recap.calculatePopCaps(pops, inst, eng, gov, sector, bodies)
}
```

### Step 7: Delete `lib/compute/production-recap.ts`

The old 928-line monolith is fully replaced.

### Step 8: Verify — build + lint + test

- `npx tsc --noEmit` — zero errors
- `npx eslint lib/recap/ lib/conveyor/handlers/empire-handler.ts` — zero errors
- Manual test: offline mode shows same values as before
- Manual test: bridge mode shows same values as before (including training=263)

## Risk Areas

- **Governor bonus SQL change**: The `CASE WHEN` + `GROUP BY` pattern is a different SQL approach. Must verify against both offline (better-sqlite3) and bridge (in-memory SQLite). Low risk — this is standard SQL.
- **Field name mapping**: SQL returns UPPER_CASE column names, TypeScript interfaces use camelCase. The SqlProvider must map between them. Alternatively, use SQL aliases to match camelCase directly.
- **PopCaps cache invalidation**: Switching from `forceOffline=false` to `true` should bust the cache. The cache key must include the provider type.
- **Import paths**: Many files import from `lib/compute/production-recap`. The `lib/compute/index.ts` re-export handles this, but any direct imports need updating.

## Validation

- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint lib/recap/` passes
- [ ] Offline mode: all 13 entries match Electrons values
- [ ] Bridge mode: all 13 entries match Electrons values (including training=263)
- [ ] Force offline toggle works
- [ ] Settings panel (stale time, per-type toggles) still works
- [ ] Pop-out windows still show production data
- [ ] No `FCT_SystemBody` conditional in any compute code
- [ ] No `QueryFn` import in any compute code
- [ ] No `bodyMap` parameter anywhere
