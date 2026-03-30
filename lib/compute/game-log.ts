/**
 * Game Log Compute
 *
 * Queries the game event log from FCT_GameLog.
 */

import type { QueryFn, GameCtx } from './types'
import { formatGameDate } from './utils'

export interface EventTypeInfo {
  id: number
  description: string
  isCustomized: boolean // has custom color in FCT_EventColour
  isHidden: boolean // hidden by player in Aurora (FCT_HideEvents)
  hasEntries: boolean // has log entries in this game
  textColor: string | null // CSS rgba color
  alertColor: string | null // CSS rgba color
}

/**
 * Convert Aurora's .NET integer color to CSS rgba.
 * Colors are stored as signed 32-bit ARGB integers.
 */
function auroraColorToRgba(colorInt: number): string {
  // Handle .NET negative color values (unsigned conversion)
  const unsigned = colorInt >>> 0
  const b = unsigned & 0xff
  const g = (unsigned & 0xff00) >>> 8
  const r = (unsigned & 0xff0000) >>> 16
  const a = ((unsigned & 0xff000000) >>> 24) / 255
  return `rgba(${r}, ${g}, ${b}, ${a > 0 ? a : 1})`
}

export interface GameLogEntry {
  incrementId: number
  time: number
  formattedDate: string
  eventType: number
  eventTypeName: string
  message: string
  systemId: number
  raceId: number
  textColor: string | null
  isCustomized: boolean
}

export interface GameLogResult {
  entries: GameLogEntry[]
  totalCount: number
}

/**
 * Get all event types. Tries DIM_EventType (works offline), falls back to
 * extracting unique types from existing log entries.
 */
export async function getEventTypes(query: QueryFn): Promise<EventTypeInfo[]> {
  try {
    const rows = await query<{ EventTypeID: number; Description: string }>(
      `SELECT EventTypeID, Description FROM DIM_EventType ORDER BY Description`
    )
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.EventTypeID,
        description: r.Description,
        isCustomized: false,
        isHidden: false,
        hasEntries: false,
        textColor: null,
        alertColor: null,
      }))
    }
  } catch {
    // DIM tables not available via bridge — fall through
  }
  return []
}

/**
 * Get ALL event types with metadata: custom colors, whether they have log entries.
 */
export async function getUsedEventTypes(query: QueryFn, ctx: GameCtx): Promise<EventTypeInfo[]> {
  // Get hidden event types
  const hiddenTypes = new Set<number>()
  try {
    const hiddenRows = await query<{ EventID: number }>(
      `SELECT EventID FROM FCT_HideEvents
       WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
    )
    for (const r of hiddenRows) hiddenTypes.add(r.EventID)
  } catch {
    /* no hidden data */
  }

  // Get customized event colors
  const customColors = new Map<number, { textColor: string; alertColor: string }>()
  try {
    const colorRows = await query<{ EventTypeID: number; TextColour: number; AlertColour: number }>(
      `SELECT EventTypeID, TextColour, AlertColour FROM FCT_EventColour
       WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
    )
    for (const r of colorRows) {
      customColors.set(r.EventTypeID, {
        textColor: auroraColorToRgba(r.TextColour),
        alertColor: auroraColorToRgba(r.AlertColour),
      })
    }
  } catch {
    /* no color data */
  }

  // Get which event types have actual log entries
  const usedTypes = new Set<number>()
  try {
    const usedRows = await query<{ EventType: number }>(
      `SELECT DISTINCT EventType FROM FCT_GameLog
       WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
    )
    for (const r of usedRows) usedTypes.add(r.EventType)
  } catch {
    /* */
  }

  // Try DIM table for ALL event type names
  try {
    const rows = await query<{ EventTypeID: number; Description: string }>(
      `SELECT EventTypeID, Description FROM DIM_EventType
       WHERE length(trim(Description)) > 0
       ORDER BY Description`
    )
    if (rows.length > 0) {
      return rows.map((r) => {
        const color = customColors.get(r.EventTypeID)
        return {
          id: r.EventTypeID,
          description: r.Description,
          isCustomized: customColors.has(r.EventTypeID),
          isHidden: hiddenTypes.has(r.EventTypeID),
          hasEntries: usedTypes.has(r.EventTypeID),
          textColor: color?.textColor ?? null,
          alertColor: color?.alertColor ?? null,
        }
      })
    }
  } catch {
    /* DIM not available */
  }

  // Fallback: only used types, no names
  return Array.from(usedTypes)
    .sort()
    .map((id) => ({
      id,
      description: `Event ${id}`,
      isCustomized: customColors.has(id),
      isHidden: hiddenTypes.has(id),
      hasEntries: true,
      textColor: customColors.get(id)?.textColor ?? null,
      alertColor: customColors.get(id)?.alertColor ?? null,
    }))
}

/**
 * Get game log entries, optionally filtered by event type.
 */
export async function getGameLog(
  query: QueryFn,
  ctx: GameCtx,
  options?: {
    limit?: number
    offset?: number
    eventTypes?: number[]
    onlyCustomized?: boolean
    showHidden?: boolean
  }
): Promise<GameLogResult> {
  const limit = options?.limit ?? 200
  const offset = options?.offset ?? 0
  let typeFilter = options?.eventTypes?.length ? `AND gl.EventType IN (${options.eventTypes.join(',')})` : ''

  // Exclude hidden events by default (unless showHidden is true)
  if (!options?.showHidden) {
    try {
      const hiddenRows = await query<{ EventID: number }>(
        `SELECT EventID FROM FCT_HideEvents
         WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
      )
      const hiddenIds = hiddenRows.map((r) => r.EventID)
      if (hiddenIds.length > 0) {
        typeFilter += ` AND gl.EventType NOT IN (${hiddenIds.join(',')})`
      }
    } catch {
      /* no hidden data */
    }
  }

  // If onlyCustomized, restrict to event types that have custom colors
  if (options?.onlyCustomized) {
    try {
      const colorRows = await query<{ EventTypeID: number }>(
        `SELECT DISTINCT EventTypeID FROM FCT_EventColour
         WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
      )
      const customizedTypeIds = colorRows.map((r) => r.EventTypeID)
      if (customizedTypeIds.length > 0) {
        typeFilter += ` AND gl.EventType IN (${customizedTypeIds.join(',')})`
      } else {
        return { entries: [], totalCount: 0 }
      }
    } catch {
      /* skip filter */
    }
  }

  // Count total
  const countRow = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM FCT_GameLog gl
     WHERE gl.GameID = ${ctx.gameId} AND gl.RaceID = ${ctx.raceId}
     ${typeFilter}`
  )
  const totalCount = countRow[0]?.total ?? 0

  // Try with DIM join for event type names
  let rows: Array<{
    IncrementID: number
    Time: number
    EventType: number
    EventTypeName: string | null
    MessageText: string
    SystemID: number
    RaceID: number
  }>

  try {
    rows = await query(
      `SELECT gl.IncrementID, gl.Time, gl.EventType, et.Description as EventTypeName,
              gl.MessageText, gl.SystemID, gl.RaceID
       FROM FCT_GameLog gl
       LEFT JOIN DIM_EventType et ON gl.EventType = et.EventTypeID
       WHERE gl.GameID = ${ctx.gameId} AND gl.RaceID = ${ctx.raceId}
       ${typeFilter}
       ORDER BY gl.Time DESC, gl.IncrementID DESC
       LIMIT ${limit} OFFSET ${offset}`
    )
  } catch {
    // DIM not available — query without join
    rows = (
      await query<{
        IncrementID: number
        Time: number
        EventType: number
        MessageText: string
        SystemID: number
        RaceID: number
      }>(
        `SELECT gl.IncrementID, gl.Time, gl.EventType, gl.MessageText, gl.SystemID, gl.RaceID
       FROM FCT_GameLog gl
       WHERE gl.GameID = ${ctx.gameId} AND gl.RaceID = ${ctx.raceId}
       ${typeFilter}
       ORDER BY gl.Time DESC, gl.IncrementID DESC
       LIMIT ${limit} OFFSET ${offset}`
      )
    ).map((r) => ({ ...r, EventTypeName: null }))
  }

  // Get game start year
  const gameRow = await query<{ StartYear: number }>(`SELECT StartYear FROM FCT_Game WHERE GameID = ${ctx.gameId}`)
  const startYear = gameRow[0]?.StartYear ?? 2050

  // Get custom colors for this game/race
  const colorMap = new Map<number, { textColor: string }>()
  try {
    const colorRows = await query<{ EventTypeID: number; TextColour: number }>(
      `SELECT EventTypeID, TextColour FROM FCT_EventColour
       WHERE GameID = ${ctx.gameId} AND RaceID = ${ctx.raceId}`
    )
    for (const r of colorRows) {
      colorMap.set(r.EventTypeID, { textColor: auroraColorToRgba(r.TextColour) })
    }
  } catch {
    /* no color data */
  }

  const customizedTypes = new Set(colorMap.keys())

  const entries: GameLogEntry[] = rows.map((r) => ({
    incrementId: r.IncrementID,
    time: r.Time,
    formattedDate: formatGameDate(r.Time, startYear),
    eventType: r.EventType,
    eventTypeName: r.EventTypeName ?? `Event ${r.EventType}`,
    message: r.MessageText ?? '',
    systemId: r.SystemID,
    raceId: r.RaceID,
    textColor: colorMap.get(r.EventType)?.textColor ?? null,
    isCustomized: customizedTypes.has(r.EventType),
  }))

  return { entries, totalCount }
}
