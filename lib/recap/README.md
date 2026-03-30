# Data Architecture

This document explains how to build features that query Aurora game data.

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Hooks (app/hooks/data/)                          │
│  TanStack Query cache, stale times, deduplication       │
├─────────────────────────────────────────────────────────┤
│  IPC Handlers (lib/conveyor/handlers/)                  │
│  Picks data source, calls provider + compute            │
├─────────────────────────────────────────────────────────┤
│  Data Provider (lib/recap/sql-provider.ts)              │
│  SQL queries → typed data objects                       │
│  No computation, just fetching and mapping              │
├─────────────────────────────────────────────────────────┤
│  Compute (lib/recap/compute.ts)                         │
│  Pure functions: typed data in → results out            │
│  No SQL, no QueryFn, no knowledge of data source        │
│  Fully testable with mock data                          │
└─────────────────────────────────────────────────────────┘
```

## When to use what

### Direct data hook (no compute)
Use when the data from Aurora's DB is exactly what the UI needs — no math,
no cross-referencing, no derived values.

```typescript
// Example: game log entries are displayed as-is
export function useGameLog(...) {
  return useQuery({
    queryKey: ['empire', 'gameLog', ...],
    queryFn: () => window.conveyor.empire.getGameLog(...),
  })
}
```

**Use for:** Game log, settings, game date, simple lists.

### Compute function (with provider)
Use when raw data needs math, cross-referencing, or combining multiple sources
to produce derived values.

```typescript
// Example: remaining days = remainingWork / (annualRate / 365)
// annualRate depends on population, installations, commanders, bodies...
export function calculateResearchEntries(
  projects: ResearchProject[],  // raw data from provider
  caps: Map<number, PopCap>,    // derived from 6 other data sources
): RecapEntry[]                 // computed result
```

**Use for:** Production recap, warnings, habitability scoring, mineral projections.

## How to add a new feature

### 1. Define types in `lib/recap/types.ts`

Add interfaces for the raw data your feature needs:

```typescript
export interface MyFeatureData {
  id: number
  name: string
  someValue: number
  // ... fields matching what SQL returns
}
```

### 2. Add provider method in `lib/recap/sql-provider.ts`

Add a method that runs the SQL and returns typed objects:

```typescript
async getMyFeatureData(): Promise<MyFeatureData[]> {
  const rows = await this.query<{ ID: number; Name: string; SomeValue: number }>(`
    SELECT ... FROM FCT_MyTable WHERE GameID = ${this.gameId} ...
  `)
  return rows.map(r => ({
    id: r.ID,
    name: r.Name,
    someValue: r.SomeValue,
  }))
}
```

**Rules:**
- NEVER join `FCT_SystemBody` — use the body map instead (see below)
- NEVER use multiple LEFT JOINs on the same table with different aliases — use
  `CASE WHEN + GROUP BY` instead (bridge in-memory SQLite breaks with multi-self-joins)
- Always `COALESCE` nullable columns
- Map SQL UPPER_CASE columns to camelCase in the return

### 3. Add compute function in `lib/recap/compute.ts`

Pure function — receives typed data, returns results:

```typescript
export function calculateMyFeature(
  data: MyFeatureData[],
  bodies: Record<number, BodyData>,  // if you need body info
  caps: Map<number, PopCap>,         // if you need production rates
): MyResult[] {
  return data.map(d => {
    const body = bodies[d.systemBodyId]
    // ... pure math ...
    return { ... }
  })
}
```

**Rules:**
- NO SQL, NO QueryFn, NO imports from services
- Receive all data as function parameters
- Return typed results
- Use the body map for any SystemBody lookups (Radius, RadiationLevel, coordinates, etc.)

### 4. Add handler in `lib/conveyor/handlers/empire-handler.ts`

Wire it up — the handler picks the provider and passes data to compute:

```typescript
handle('empire:getMyFeature', async (forceOffline: boolean) => {
  const sql = createSqlProvider(forceOffline)
  const bodies = await getBodies(forceOffline)  // shared body map
  const data = await sql.getMyFeatureData()
  return compute.calculateMyFeature(data, bodies)
})
```

### 5. Add hook in `app/hooks/data/use-empire.ts`

```typescript
export function useMyFeature() {
  const enabled = useEmpireEnabled()
  return useQuery<MyResult[]>({
    queryKey: ['empire', 'myFeature'],
    queryFn: () => window.conveyor.empire.getMyFeature(false),
    enabled,
    staleTime: 10_000,
  })
}
```

### 6. Add schema + API

- `lib/conveyor/schemas/empire-schema.ts` — add the IPC channel
- `lib/conveyor/api/empire-api.ts` — add the client method

## Body data (FCT_SystemBody)

**NEVER join FCT_SystemBody in SQL queries.** It has no bridge save method and
is empty in bridge mode's in-memory SQLite.

Instead, use the shared body map:

```
Bridge mode  → MemoryBodyProvider reads from Aurora's RAM (real-time)
Offline mode → SqlRecapProvider reads from FCT_SystemBody (DB file)
```

The handler calls `getBodies(forceOffline)` which returns
`Record<number, BodyData>`. Pass this to any compute function that needs
body info. The compute function looks up by `systemBodyId`:

```typescript
const body = bodies[population.systemBodyId]
const radius = body?.radius ?? 0
const radiationLevel = body?.radiationLevel ?? 0
```

Available fields on `BodyData`: `systemBodyId`, `systemId`, `name`, `bodyClass`,
`radius`, `gravity`, `density`, `xcor`, `ycor`, `atmosPress`, `surfaceTemp`,
`hydroExt`, `hydroId`, `radiationLevel`, `dustLevel`.

## Commander bonuses

**NEVER use multiple LEFT JOINs on FCT_CommanderBonuses with different aliases.**
The bridge's in-memory SQLite silently fails to resolve them.

Instead, use `CASE WHEN + GROUP BY` in a single JOIN:

```sql
SELECT c.CommandID as PopID,
  MAX(CASE WHEN cb.BonusID = 5 THEN cb.BonusValue END) as ConstructionBonus,
  MAX(CASE WHEN cb.BonusID = 4 THEN cb.BonusValue END) as ShipbuildingBonus,
  MAX(CASE WHEN cb.BonusID = 11 THEN cb.BonusValue END) as TrainingBonus
FROM FCT_Commander c
LEFT JOIN FCT_CommanderBonuses cb
  ON cb.CommanderID = c.CommanderID AND cb.BonusID IN (4, 5, 11)
WHERE ...
GROUP BY c.CommandID
```

## File structure

```
lib/recap/
  types.ts            — All data interfaces (BodyData, PopCap, RecapEntry, provider input types)
  compute.ts          — Pure math functions (no SQL)
  sql-provider.ts     — SQL queries → typed data objects
  memory-provider.ts  — Bridge memory reader → BodyData
  get-bodies.ts       — Shared utility: fetches bodies from memory or SQL
  index.ts            — Re-exports

lib/compute/
  types.ts            — QueryFn, GameCtx (shared by all providers)
  game-log.ts         — Game log queries (simple, no compute needed)
  utils.ts            — formatGameDate helper
  index.ts            — Re-exports compute + recap

app/hooks/data/
  use-empire.ts       — All data hooks (gameDate, gameLog, recap*)
  use-empire-tick.ts  — Tick invalidation
  use-session-sync.ts — Session state sync
  index.ts            — Barrel exports
```
