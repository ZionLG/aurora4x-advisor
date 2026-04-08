/**
 * SQL queries for the tech tree page.
 * Returns field summaries + full tech list with research status.
 */

import type { QueryFn } from '../compute/types'
import type { ResearchField, Technology, TechTreeData } from './types'

export async function fetchTechTree(query: QueryFn, gameId: number, raceId: number): Promise<TechTreeData> {
  const [fields, techs] = await Promise.all([
    fetchFields(query, gameId, raceId),
    fetchTechs(query, gameId, raceId),
  ])
  return { fields, techs }
}

async function fetchFields(query: QueryFn, gameId: number, raceId: number): Promise<ResearchField[]> {
  const rows = await query<{
    ResearchFieldID: number
    FieldName: string
    Abbreviation: string
    Total: number
    Researched: number
  }>(`
    SELECT rf.ResearchFieldID, rf.FieldName, rf.Abbreviation,
      COUNT(*) as Total,
      SUM(CASE WHEN rt.TechID IS NOT NULL THEN 1 ELSE 0 END) as Researched
    FROM FCT_TechSystem ts
    JOIN DIM_TechType tt ON ts.TechTypeID = tt.TechTypeID
    JOIN DIM_ResearchField rf ON tt.FieldID = rf.ResearchFieldID
    LEFT JOIN FCT_RaceTech rt ON ts.TechSystemID = rt.TechID AND rt.GameID = ${gameId} AND rt.RaceID = ${raceId}
    WHERE ts.GameID = 0 AND rf.DoNotDisplay != 1
    GROUP BY rf.ResearchFieldID
    ORDER BY rf.ResearchFieldID
  `)
  return rows.map((r) => ({
    id: r.ResearchFieldID,
    name: r.FieldName,
    abbreviation: r.Abbreviation,
    total: r.Total,
    researched: r.Researched,
  }))
}

async function fetchTechs(query: QueryFn, gameId: number, raceId: number): Promise<Technology[]> {
  const rows = await query<{
    TechSystemID: number
    Name: string
    TechDescription: string
    FieldID: number
    Abbreviation: string
    TechTypeID: number
    TypeName: string
    DevelopCost: number
    Prerequisite1: number
    Prerequisite2: number
    ConventionalSystem: number
    RuinOnly: number
    Researched: number
    InProgress: number
  }>(`
    SELECT ts.TechSystemID, ts.Name, COALESCE(ts.TechDescription, '') as TechDescription,
      tt.FieldID, rf.Abbreviation,
      ts.TechTypeID, tt.Description as TypeName,
      ts.DevelopCost,
      ts.Prerequisite1, ts.Prerequisite2,
      ts.ConventionalSystem, ts.RuinOnly,
      CASE WHEN rt.TechID IS NOT NULL THEN 1 ELSE 0 END as Researched,
      CASE WHEN rp.TechID IS NOT NULL THEN 1 ELSE 0 END as InProgress
    FROM FCT_TechSystem ts
    JOIN DIM_TechType tt ON ts.TechTypeID = tt.TechTypeID
    JOIN DIM_ResearchField rf ON tt.FieldID = rf.ResearchFieldID
    LEFT JOIN FCT_RaceTech rt ON ts.TechSystemID = rt.TechID AND rt.GameID = ${gameId} AND rt.RaceID = ${raceId}
    LEFT JOIN FCT_ResearchProject rp ON ts.TechSystemID = rp.TechID AND rp.GameID = ${gameId} AND rp.RaceID = ${raceId}
    WHERE ts.GameID = 0 AND rf.DoNotDisplay != 1
    ORDER BY tt.FieldID, tt.Description, ts.DevelopCost
  `)

  // Build a set of researched tech IDs for prerequisite resolution
  const researchedIds = new Set(rows.filter((r) => r.Researched).map((r) => r.TechSystemID))

  return rows.map((r) => {
    let status: Technology['status']
    if (r.Researched) {
      status = 'researched'
    } else if (r.InProgress) {
      status = 'in-progress'
    } else {
      // Available if all prerequisites are researched (or no prerequisites)
      const pre1ok = r.Prerequisite1 === 0 || researchedIds.has(r.Prerequisite1)
      const pre2ok = r.Prerequisite2 === 0 || researchedIds.has(r.Prerequisite2)
      status = pre1ok && pre2ok ? 'available' : 'locked'
    }

    return {
      id: r.TechSystemID,
      name: r.Name,
      description: r.TechDescription,
      fieldId: r.FieldID,
      fieldAbbreviation: r.Abbreviation,
      techTypeId: r.TechTypeID,
      techTypeName: r.TypeName,
      developCost: r.DevelopCost,
      prerequisite1: r.Prerequisite1,
      prerequisite2: r.Prerequisite2,
      conventional: r.ConventionalSystem === 1,
      ruinOnly: r.RuinOnly === 1,
      status,
    }
  })
}
