import type { QueryFn, GameCtx } from './types'

// TaskTypeID mapping from Aurora DB
const TASK_TYPES: Record<number, string> = {
  1: 'Construction',
  2: 'Refit',
  3: 'Repair',
  4: 'Scrap',
  5: 'Overhaul'
}

export interface ProductionTask {
  projectId: number
  colony: string
  description: string
  productionType: number
  amount: number
  percentComplete: number
  paused: boolean
  queue: number
}

export interface ShipyardTaskInfo {
  taskId: number
  taskType: string
  className: string
  unitName: string
  totalBP: number
  completedBP: number
  percentComplete: number
  paused: boolean
}

export interface ShipyardInfo {
  shipyardId: number
  name: string
  colony: string
  type: string
  slipways: number
  capacity: number
  currentTask: ShipyardTaskInfo | null
}

export async function getProductionTasks(
  query: QueryFn,
  ctx: GameCtx
): Promise<ProductionTask[]> {
  const rows = await query<{
    ProjectID: number
    PopName: string
    Description: string
    ProductionType: number
    Amount: number
    PartialCompletion: number
    ProdPerUnit: number
    Pause: number
    Queue: number
  }>(
    `SELECT ip.ProjectID, p.PopName, ip.Description, ip.ProductionType,
      ip.Amount, ip.PartialCompletion, ip.ProdPerUnit, ip.Pause, ip.Queue
    FROM FCT_IndustrialProjects ip
    LEFT JOIN FCT_Population p ON ip.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
    WHERE ip.GameID = ${ctx.gameId} AND ip.RaceID = ${ctx.raceId}
    ORDER BY p.PopName, ip.Queue`
  )

  return rows.map((r) => {
    const prodPerUnit = r.ProdPerUnit || 0
    const totalWork = prodPerUnit * r.Amount
    const percentComplete =
      totalWork > 0 ? Math.round((r.PartialCompletion / totalWork) * 100) : 0

    return {
      projectId: r.ProjectID,
      colony: r.PopName || 'Unknown',
      description: r.Description || '',
      productionType: r.ProductionType,
      amount: r.Amount,
      percentComplete: Math.min(percentComplete, 100),
      paused: !!r.Pause,
      queue: r.Queue
    }
  })
}

export async function getShipyards(
  query: QueryFn,
  ctx: GameCtx
): Promise<ShipyardInfo[]> {
  const rows = await query<{
    ShipyardID: number
    ShipyardName: string
    PopName: string
    SYType: number
    Slipways: number
    Capacity: number
    TaskID: number | null
    TaskTypeID: number | null
    ClassName: string | null
    UnitName: string | null
    TotalBP: number | null
    CompletedBP: number | null
    TaskPaused: number | null
  }>(
    `SELECT sy.ShipyardID, sy.ShipyardName, p.PopName, sy.SYType, sy.Slipways, sy.Capacity,
      st.TaskID, st.TaskTypeID, sc.ClassName, st.UnitName,
      st.TotalBP, st.CompletedBP, st.Paused as TaskPaused
    FROM FCT_Shipyard sy
    LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
    LEFT JOIN FCT_ShipyardTask st ON sy.ShipyardID = st.ShipyardID
      AND st.GameID = ${ctx.gameId} AND st.RaceID = ${ctx.raceId}
    LEFT JOIN FCT_ShipClass sc ON st.ClassID = sc.ShipClassID
    WHERE sy.GameID = ${ctx.gameId} AND sy.RaceID = ${ctx.raceId}
    ORDER BY p.PopName, sy.ShipyardName`
  )

  return rows.map((r) => {
    let currentTask: ShipyardTaskInfo | null = null
    if (r.TaskID != null) {
      const totalBP = r.TotalBP || 0
      const completedBP = r.CompletedBP || 0
      currentTask = {
        taskId: r.TaskID,
        taskType: TASK_TYPES[r.TaskTypeID || 0] || 'Unknown',
        className: r.ClassName || 'Unknown',
        unitName: r.UnitName || '',
        totalBP,
        completedBP,
        percentComplete: totalBP > 0 ? Math.round((completedBP / totalBP) * 100) : 0,
        paused: !!r.TaskPaused
      }
    }

    return {
      shipyardId: r.ShipyardID,
      name: r.ShipyardName || 'Unnamed Shipyard',
      colony: r.PopName || 'Unknown',
      type: r.SYType === 1 ? 'Naval' : 'Commercial',
      slipways: r.Slipways,
      capacity: r.Capacity,
      currentTask
    }
  })
}
