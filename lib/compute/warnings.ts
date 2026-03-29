import type { QueryFn, GameCtx } from './types'

export type WarningSeverity = 'info' | 'warning' | 'critical'
export type WarningCategory = 'economy' | 'military' | 'logistics' | 'production' | 'diplomacy'

export interface Warning {
  id: string
  category: WarningCategory
  severity: WarningSeverity
  title: string
  message: string
  data: Record<string, unknown>
}

const MINERAL_COLUMNS = [
  'Duranium',
  'Neutronium',
  'Corbomite',
  'Tritanium',
  'Boronide',
  'Mercassium',
  'Vendarite',
  'Sorium',
  'Uridium',
  'Corundium',
  'Gallicite'
] as const

export async function getWarnings(query: QueryFn, ctx: GameCtx): Promise<Warning[]> {
  const warnings: Warning[] = []

  await Promise.all([
    checkLowMinerals(query, ctx, warnings),
    checkLowFuel(query, ctx, warnings),
    checkLowMaintenanceSupplies(query, ctx, warnings),
    checkShipMaintenance(query, ctx, warnings),
    checkIdleShipyards(query, ctx, warnings),
    checkContacts(query, ctx, warnings),
    checkDepletingDeposits(query, ctx, warnings)
  ])

  return warnings
}

async function checkLowMinerals(
  query: QueryFn,
  ctx: GameCtx,
  warnings: Warning[]
): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT PopulationID, PopName,
      Duranium, Neutronium, Corbomite, Tritanium, Boronide,
      Mercassium, Vendarite, Sorium, Uridium, Corundium, Gallicite
    FROM FCT_Population
    WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
  )

  for (const row of rows) {
    const popId = row.PopulationID as number
    const popName = (row.PopName as string) || 'Unknown Colony'

    for (const mineral of MINERAL_COLUMNS) {
      const amount = (row[mineral] as number) || 0

      if (amount < 100) {
        warnings.push({
          id: `low-${mineral.toLowerCase()}-${popId}`,
          category: 'economy',
          severity: 'critical',
          title: `Critical ${mineral} shortage`,
          message: `${popName} has only ${Math.round(amount)} ${mineral} remaining.`,
          data: { populationId: popId, populationName: popName, mineral, amount: Math.round(amount) }
        })
      } else if (amount < 500) {
        warnings.push({
          id: `low-${mineral.toLowerCase()}-${popId}`,
          category: 'economy',
          severity: 'warning',
          title: `Low ${mineral} stockpile`,
          message: `${popName} has only ${Math.round(amount)} ${mineral} remaining.`,
          data: { populationId: popId, populationName: popName, mineral, amount: Math.round(amount) }
        })
      }
    }
  }
}

async function checkLowFuel(query: QueryFn, ctx: GameCtx, warnings: Warning[]): Promise<void> {
  const rows = await query<{ PopulationID: number; PopName: string; FuelStockpile: number }>(
    `SELECT PopulationID, PopName, FuelStockpile
    FROM FCT_Population
    WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}
      AND FuelStockpile < 1000`
  )

  for (const row of rows) {
    const amount = Math.round(row.FuelStockpile || 0)
    const severity: WarningSeverity = amount < 200 ? 'critical' : 'warning'
    const popName = row.PopName || 'Unknown Colony'

    warnings.push({
      id: `low-fuel-${row.PopulationID}`,
      category: 'logistics',
      severity,
      title: `Low fuel stockpile`,
      message: `${popName} has only ${amount} fuel remaining.`,
      data: { populationId: row.PopulationID, populationName: popName, fuel: amount }
    })
  }
}

async function checkLowMaintenanceSupplies(
  query: QueryFn,
  ctx: GameCtx,
  warnings: Warning[]
): Promise<void> {
  const rows = await query<{
    PopulationID: number
    PopName: string
    MaintenanceStockpile: number
  }>(
    `SELECT PopulationID, PopName, MaintenanceStockpile
    FROM FCT_Population
    WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}
      AND MaintenanceStockpile < 500`
  )

  for (const row of rows) {
    const amount = Math.round(row.MaintenanceStockpile || 0)
    const severity: WarningSeverity = amount < 100 ? 'critical' : 'warning'
    const popName = row.PopName || 'Unknown Colony'

    warnings.push({
      id: `low-maintenance-${row.PopulationID}`,
      category: 'logistics',
      severity,
      title: `Low maintenance supplies`,
      message: `${popName} has only ${amount} maintenance supplies remaining.`,
      data: {
        populationId: row.PopulationID,
        populationName: popName,
        maintenanceSupplies: amount
      }
    })
  }
}

async function checkShipMaintenance(
  query: QueryFn,
  ctx: GameCtx,
  warnings: Warning[]
): Promise<void> {
  const rows = await query<{
    ShipID: number
    ShipName: string
    ClassName: string
    MaintenanceState: number
  }>(
    `SELECT s.ShipID, s.ShipName, sc.ClassName, s.MaintenanceState
    FROM FCT_Ship s
    JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
    WHERE s.GameID = ${ctx.gameId} AND s.RaceID = ${ctx.raceId}
      AND s.MaintenanceState > 50`
  )

  for (const row of rows) {
    const severity: WarningSeverity = row.MaintenanceState > 80 ? 'critical' : 'warning'

    warnings.push({
      id: `ship-maintenance-${row.ShipID}`,
      category: 'military',
      severity,
      title: `Ship needs maintenance`,
      message: `${row.ShipName} (${row.ClassName}) has a maintenance state of ${row.MaintenanceState}.`,
      data: {
        shipId: row.ShipID,
        shipName: row.ShipName,
        className: row.ClassName,
        maintenanceState: row.MaintenanceState
      }
    })
  }
}

async function checkIdleShipyards(
  query: QueryFn,
  ctx: GameCtx,
  warnings: Warning[]
): Promise<void> {
  const rows = await query<{
    ShipyardID: number
    ShipyardName: string
    Slipways: number
    Capacity: number
  }>(
    `SELECT sy.ShipyardID, sy.ShipyardName, sy.Slipways, sy.Capacity
    FROM FCT_Shipyard sy
    JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
    WHERE p.GameID = ${ctx.gameId} AND p.RaceID = ${ctx.raceId}
      AND sy.TaskType = 0`
  )

  for (const row of rows) {
    warnings.push({
      id: `idle-shipyard-${row.ShipyardID}`,
      category: 'production',
      severity: 'info',
      title: `Idle shipyard`,
      message: `${row.ShipyardName} (${row.Slipways} slipways, ${row.Capacity} ton capacity) has no active task.`,
      data: {
        shipyardId: row.ShipyardID,
        shipyardName: row.ShipyardName,
        slipways: row.Slipways,
        capacity: row.Capacity
      }
    })
  }
}

async function checkContacts(query: QueryFn, ctx: GameCtx, warnings: Warning[]): Promise<void> {
  const rows = await query<{
    UniqueID: number
    ContactID: number
    ContactName: string
    ContactType: number
    ContactRaceID: number
    DetectRaceID: number
    SystemID: number
  }>(
    `SELECT UniqueID, ContactID, ContactName, ContactType,
      ContactRaceID, DetectRaceID, SystemID
    FROM FCT_Contacts
    WHERE GameID = ${ctx.gameId}
      AND (DetectRaceID = ${ctx.raceId} OR ContactRaceID != ${ctx.raceId})`
  )

  for (const row of rows) {
    const contactName = row.ContactName || `Contact #${row.ContactID}`

    if (row.DetectRaceID === ctx.raceId && row.ContactRaceID !== ctx.raceId) {
      warnings.push({
        id: `contact-detected-${row.UniqueID}`,
        category: 'diplomacy',
        severity: 'warning',
        title: `Alien contact detected`,
        message: `${contactName} detected in system ${row.SystemID}.`,
        data: {
          uniqueId: row.UniqueID,
          contactId: row.ContactID,
          contactName,
          contactType: row.ContactType,
          contactRaceId: row.ContactRaceID,
          systemId: row.SystemID
        }
      })
    } else if (row.DetectRaceID !== ctx.raceId) {
      warnings.push({
        id: `contact-detected-us-${row.UniqueID}`,
        category: 'diplomacy',
        severity: 'critical',
        title: `We have been detected`,
        message: `Race ${row.DetectRaceID} has detected us (${contactName}) in system ${row.SystemID}.`,
        data: {
          uniqueId: row.UniqueID,
          contactId: row.ContactID,
          contactName,
          contactType: row.ContactType,
          detectRaceId: row.DetectRaceID,
          systemId: row.SystemID
        }
      })
    }
  }
}

async function checkDepletingDeposits(
  query: QueryFn,
  ctx: GameCtx,
  warnings: Warning[]
): Promise<void> {
  const rows = await query<{
    SystemBodyID: number
    MaterialID: number
    Amount: number
    Accessibility: number
  }>(
    `SELECT md.SystemBodyID, md.MaterialID, md.Amount, md.Accessibility
    FROM FCT_MineralDeposit md
    WHERE md.GameID = ${ctx.gameId}
      AND md.Amount > 0 AND md.Amount < 100`
  )

  const mineralNames: Record<number, string> = {
    1: 'Duranium',
    2: 'Neutronium',
    3: 'Corbomite',
    4: 'Tritanium',
    5: 'Boronide',
    6: 'Mercassium',
    7: 'Vendarite',
    8: 'Sorium',
    9: 'Uridium',
    10: 'Corundium',
    11: 'Gallicite'
  }

  for (const row of rows) {
    const mineralName = mineralNames[row.MaterialID] || `Mineral ${row.MaterialID}`
    const severity: WarningSeverity = row.Amount < 20 ? 'critical' : 'warning'

    warnings.push({
      id: `depleting-deposit-${row.SystemBodyID}-${row.MaterialID}`,
      category: 'economy',
      severity,
      title: `Depleting ${mineralName} deposit`,
      message: `${mineralName} deposit on body ${row.SystemBodyID} nearly exhausted (${Math.round(row.Amount)} remaining, accessibility ${row.Accessibility}).`,
      data: {
        systemBodyId: row.SystemBodyID,
        materialId: row.MaterialID,
        mineralName,
        amount: Math.round(row.Amount),
        accessibility: row.Accessibility
      }
    })
  }
}
