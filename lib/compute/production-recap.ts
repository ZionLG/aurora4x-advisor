/**
 * Production Recap — Unified view of all ongoing projects across the empire.
 *
 * Queries 6 project types: Research, Industrial Production, Ship Construction,
 * Shipyard Upgrades, Ground Training, and Terraforming.
 * Calculates remaining days from production capacity.
 * Note: Commander bonuses are not yet included — displayed rates are base rates.
 */

import type { QueryFn, GameCtx } from './types'

const DAYS_PER_YEAR = 365

export interface RecapEntry {
  id: string
  type: 'research' | 'production' | 'ship' | 'shipyard' | 'training' | 'terraforming'
  badge: string
  name: string
  system: string
  colony: string
  colonyId: number
  remainingDays: number | null
  annualRate: string // Formatted display: "1,536 RP / 10 Labs"
  annualRateValue: number // Raw numeric value for sorting
  paused: boolean
  queued: boolean
}

/* ── Population capacity ───────────────────────────────────────────── */

interface PopCap {
  constructionRate: number // annual construction BP
  ordnanceRate: number
  fighterRate: number
  shipBuildRate: number // annual base shipyard rate
  researchPerLab: number // annual RP per lab
  trainingRate: number // annual training BP
  minConstructionPeriod: number // seconds per construction period (from FCT_Game)
  shipyardOperations: number // from FCT_Race
}

async function getPopCaps(query: QueryFn, ctx: GameCtx): Promise<Map<number, PopCap>> {
  const caps = new Map<number, PopCap>()
  try {
    // Query 1: Base modifiers per population (race, species, game, environment)
    const rows = await query<{
      PopulationID: number
      ConstructionProduction: number
      OrdnanceProduction: number
      FighterProduction: number
      ShipBuilding: number
      Research: number
      GroundFormationConstructionRate: number
      EconomicProdModifier: number
      ProductionRateModifier: number
      ResearchRateModifier: number
      ResearchSpeed: number
      Efficiency: number
      RadiationMod: number
      PoliticalStability: number
      ProductionMod: number
      MinConstructionPeriod: number
      ShipyardOperations: number
    }>(`
      SELECT
        p.PopulationID,
        r.ConstructionProduction, r.OrdnanceProduction, r.FighterProduction,
        r.ShipBuilding, r.Research, r.GroundFormationConstructionRate,
        COALESCE(r.EconomicProdModifier, 1) as EconomicProdModifier,
        COALESCE(sp.ProductionRateModifier, 1) as ProductionRateModifier,
        COALESCE(sp.ResearchRateModifier, 1) as ResearchRateModifier,
        COALESCE(g.ResearchSpeed / 100.0, 1) as ResearchSpeed,
        COALESCE(g.MinConstructionPeriod, 430000) as MinConstructionPeriod,
        COALESCE(r.ShipyardOperations, 1) as ShipyardOperations,
        COALESCE(p.Efficiency, 1) as Efficiency,
        (1.0 - COALESCE(sb.RadiationLevel, 0) / 10000.0) as RadiationMod,
        (1.0 - COALESCE(p.UnrestPoints, 0) / 100.0) as PoliticalStability,
        COALESCE(ps.ProductionMod, 1) as ProductionMod
      FROM FCT_Population p
      JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${ctx.gameId}
      JOIN FCT_Game g ON p.GameID = g.GameID
      LEFT JOIN FCT_Species sp ON p.SpeciesID = sp.SpeciesID
      LEFT JOIN FCT_SystemBody sb ON p.SystemBodyID = sb.SystemBodyID
      LEFT JOIN DIM_PopPoliticalStatus ps ON p.PoliticalStatus = ps.StatusID
      WHERE p.GameID = ${ctx.gameId} AND p.RaceID = ${ctx.raceId}
    `)

    // Query 2: Installation power per population (separate to avoid subquery issues)
    const instRows = await query<{
      PopID: number
      ConstructionPower: number
      OrdnancePower: number
      FighterPower: number
    }>(`
      SELECT pi.PopID,
        SUM(COALESCE(di.ConstructionValue, 0) * pi.Amount) as ConstructionPower,
        SUM(COALESCE(di.OrdnanceProductionValue, 0) * pi.Amount) as OrdnancePower,
        SUM(COALESCE(di.FighterProductionValue, 0) * pi.Amount) as FighterPower
      FROM FCT_PopulationInstallations pi
      JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
      WHERE pi.GameID = ${ctx.gameId}
      GROUP BY pi.PopID
    `)
    const instMap = new Map<number, { c: number; o: number; f: number }>()
    for (const ir of instRows) {
      instMap.set(ir.PopID, { c: ir.ConstructionPower || 0, o: ir.OrdnancePower || 0, f: ir.FighterPower || 0 })
    }

    // Query 3: Ground unit engineer construction power (with formation commander bonuses)
    const engMap = new Map<number, number>()
    try {
      const engRows = await query<{ PopulationID: number; GroundConstructionPower: number }>(`
        SELECT guf.PopulationID,
          SUM(fc.FormationConstructionRating * COALESCE(cb.BonusValue, 1)) as GroundConstructionPower
        FROM FCT_GroundUnitFormation guf
        JOIN (
          SELECT gufe.FormationID,
            SUM(gufe.Units * guc.ConstructionRating) as FormationConstructionRating
          FROM FCT_GroundUnitFormationElement gufe
          JOIN FCT_GroundUnitClass guc ON gufe.ClassID = guc.GroundUnitClassID
          WHERE guc.ConstructionRating > 0
          GROUP BY gufe.FormationID
        ) fc ON guf.FormationID = fc.FormationID
        LEFT JOIN FCT_Commander c ON c.CommandID = guf.FormationID
          AND c.CommanderType IN (1, 4) AND c.CommandType = 5 AND c.GameID = ${ctx.gameId}
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 5
        WHERE guf.GameID = ${ctx.gameId} AND guf.RaceID = ${ctx.raceId}
        GROUP BY guf.PopulationID
      `)
      for (const er of engRows) {
        engMap.set(er.PopulationID, er.GroundConstructionPower || 0)
      }
    } catch {
      /* no engineer data */
    }

    // Query 4: Sector commander bonuses (25% effectiveness, linked via system)
    let sectorMap = new Map<number, { construction: number; shipbuilding: number; training: number; terraform: number }>()
    try {
      const sectorRows = await query<{
        PopulationID: number
        SectorConstruction: number
        SectorShipbuilding: number
        SectorTraining: number
        SectorTerraform: number
      }>(`
        SELECT pop.PopulationID,
          1 + (COALESCE(cb5.BonusValue, 1) - 1) * 0.25 as SectorConstruction,
          1 + (COALESCE(cb4.BonusValue, 1) - 1) * 0.25 as SectorShipbuilding,
          1 + (COALESCE(cb11.BonusValue, 1) - 1) * 0.25 as SectorTraining,
          1 + (COALESCE(cb9.BonusValue, 1) - 1) * 0.25 as SectorTerraform
        FROM FCT_Commander c
        INNER JOIN FCT_RaceSysSurvey rss ON c.CommandID = rss.SectorID AND rss.SectorID != 0
        INNER JOIN FCT_Population pop ON rss.SystemID = pop.SystemID AND pop.GameID = ${ctx.gameId} AND pop.RaceID = ${ctx.raceId}
        LEFT JOIN FCT_CommanderBonuses cb5 ON cb5.CommanderID = c.CommanderID AND cb5.BonusID = 5
        LEFT JOIN FCT_CommanderBonuses cb4 ON cb4.CommanderID = c.CommanderID AND cb4.BonusID = 4
        LEFT JOIN FCT_CommanderBonuses cb11 ON cb11.CommanderID = c.CommanderID AND cb11.BonusID = 11
        LEFT JOIN FCT_CommanderBonuses cb9 ON cb9.CommanderID = c.CommanderID AND cb9.BonusID = 9
        WHERE c.GameID = ${ctx.gameId} AND c.CommandType = 4 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
      `)
      for (const sr of sectorRows) {
        sectorMap.set(sr.PopulationID, {
          construction: sr.SectorConstruction,
          shipbuilding: sr.SectorShipbuilding,
          training: sr.SectorTraining,
          terraform: sr.SectorTerraform,
        })
      }
    } catch {
      sectorMap = new Map()
    }

    // Query 5: Planet governor bonuses (separate query)
    let govMap = new Map<number, { construction: number; shipbuilding: number; training: number }>()
    try {
      const govRows = await query<{
        PopulationID: number
        ConstructionBonus: number
        ShipbuildingBonus: number
        TrainingBonus: number
      }>(`
        SELECT c.CommandID as PopulationID,
          COALESCE(cb5.BonusValue, 1) as ConstructionBonus,
          COALESCE(cb4.BonusValue, 1) as ShipbuildingBonus,
          COALESCE(cb11.BonusValue, 1) as TrainingBonus
        FROM FCT_Commander c
        LEFT JOIN FCT_CommanderBonuses cb5 ON cb5.CommanderID = c.CommanderID AND cb5.BonusID = 5
        LEFT JOIN FCT_CommanderBonuses cb4 ON cb4.CommanderID = c.CommanderID AND cb4.BonusID = 4
        LEFT JOIN FCT_CommanderBonuses cb11 ON cb11.CommanderID = c.CommanderID AND cb11.BonusID = 11
        WHERE c.GameID = ${ctx.gameId} AND c.CommandType = 3 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
      `)
      for (const gr of govRows) {
        govMap.set(gr.PopulationID, {
          construction: gr.ConstructionBonus,
          shipbuilding: gr.ShipbuildingBonus,
          training: gr.TrainingBonus,
        })
      }
    } catch {
      govMap = new Map()
    }

    // Combine all modifiers
    for (const r of rows) {
      const inst = instMap.get(r.PopulationID) ?? { c: 0, o: 0, f: 0 }
      const gov = govMap.get(r.PopulationID) ?? { construction: 1, shipbuilding: 1, training: 1 }
      const sector = sectorMap.get(r.PopulationID) ?? { construction: 1, shipbuilding: 1, training: 1, terraform: 1 }
      const eng = engMap.get(r.PopulationID) ?? 0
      const baseMod =
        r.ProductionRateModifier * r.EconomicProdModifier * r.Efficiency * r.RadiationMod * r.PoliticalStability * r.ProductionMod
      // OverallProductionModifier = baseMod × governor × sector (matches Electrons)
      const constructMod = baseMod * gov.construction * sector.construction
      const engineerMod = r.EconomicProdModifier * r.RadiationMod
      caps.set(r.PopulationID, {
        constructionRate: r.ConstructionProduction * constructMod * inst.c + r.ConstructionProduction * engineerMod * eng,
        ordnanceRate: r.OrdnanceProduction * constructMod * inst.o,
        fighterRate: r.FighterProduction * constructMod * inst.f,
        shipBuildRate: r.ShipBuilding * baseMod * gov.shipbuilding * sector.shipbuilding,
        researchPerLab:
          r.Research * r.ResearchRateModifier * r.EconomicProdModifier * r.Efficiency * r.RadiationMod * r.PoliticalStability * r.ProductionMod * r.ResearchSpeed,
        trainingRate: r.GroundFormationConstructionRate * baseMod * gov.training * sector.training,
        minConstructionPeriod: r.MinConstructionPeriod,
        shipyardOperations: r.ShipyardOperations,
      })
    }
  } catch (e) {
    console.warn('[ProductionRecap] Capacity query failed:', e)
  }
  return caps
}

function daysFromAnnual(remainingWork: number, annualRate: number): number | null {
  if (annualRate <= 0 || remainingWork <= 0) return null
  return Math.round((remainingWork / annualRate) * DAYS_PER_YEAR * 10) / 10
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}

/* ── Research ──────────────────────────────────────────────────────── */

async function getResearchEntries(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  try {
    // Join commander assigned to each project (CommandType=7, CommandID=ProjectID)
    // BonusID=3 = research bonus. If commander field matches project field: bonus*4-3
    const rows = await query<{
      ProjectID: number
      PopulationID: number
      PopName: string
      SystemName: string
      TechName: string
      ResearchPointsRequired: number
      Facilities: number
      Pause: number
      ResSpecID: number
      CommanderBonus: number | null
      CommanderField: number | null
      AnomalyBonus: number | null
      AnomalyField: number | null
    }>(`
      SELECT rp.ProjectID, rp.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        COALESCE(ts.Name, 'Unknown Tech') as TechName,
        rp.ResearchPointsRequired, rp.Facilities,
        COALESCE(rp.Pause, 0) as Pause,
        rp.ResSpecID,
        cb.BonusValue as CommanderBonus,
        c.ResSpecID as CommanderField,
        ac.ResearchBonus as AnomalyBonus,
        ac.ResearchField as AnomalyField
      FROM FCT_ResearchProject rp
      LEFT JOIN FCT_Population p ON rp.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      LEFT JOIN FCT_TechSystem ts ON rp.TechID = ts.TechSystemID
      LEFT JOIN FCT_Commander c ON c.CommandID = rp.ProjectID
        AND c.GameID = ${ctx.gameId} AND c.CommandType = 7
      LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 3
      LEFT JOIN FCT_AncientConstruct ac ON ac.SystemBodyID = p.SystemBodyID
        AND ac.GameID = ${ctx.gameId} AND ac.Active = 1
      WHERE rp.GameID = ${ctx.gameId} AND rp.RaceID = ${ctx.raceId}
      ORDER BY rp.PopulationID
    `)
    return rows.map((r) => {
      const cap = caps.get(r.PopulationID)
      // Commander research bonus: field match = bonus*4-3, no match = bonus, none = 1
      let cmdBonus = 1
      if (r.CommanderBonus != null) {
        cmdBonus =
          r.CommanderField != null && r.CommanderField === r.ResSpecID
            ? r.CommanderBonus * 4 - 3
            : r.CommanderBonus
      }
      // Ancient construct anomaly bonus: applies when construct field matches project field
      let anomalyBonus = 1
      if (r.AnomalyBonus != null && r.AnomalyField != null && r.AnomalyField === r.ResSpecID) {
        anomalyBonus = r.AnomalyBonus
      }
      const annualRP = cap ? cap.researchPerLab * r.Facilities * cmdBonus * anomalyBonus : 0
      return {
        id: `research-${r.ProjectID}`,
        type: 'research' as const,
        badge: 'Research',
        name: r.TechName,
        system: r.SystemName || '',
        system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
        colonyId: r.PopulationID,
        remainingDays: daysFromAnnual(r.ResearchPointsRequired, annualRP),
        annualRate: annualRP > 0 ? `${fmtNum(annualRP)} RP / ${r.Facilities} Labs` : `${r.Facilities} Labs`,
        annualRateValue: annualRP,
        paused: r.Pause !== 0,
        queued: false,
      }
    })
  } catch {
    return []
  }
}

/* ── Industrial Production ─────────────────────────────────────────── */

const PROD_TYPE_BADGE: Record<number, string> = {
  0: 'Construction',
  1: 'Ordnance',
  2: 'Fighter',
  3: 'Component',
  4: 'Space Station',
}

async function getIndustrialEntries(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  try {
    const rows = await query<{
      ProjectID: number
      PopulationID: number
      PopName: string
      SystemName: string
      Description: string
      ProductionType: number
      Amount: number
      ProdPerUnit: number
      Percentage: number
      Queue: number
      Pause: number
    }>(`
      SELECT ip.ProjectID, ip.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        ip.Description, ip.ProductionType, ip.Amount, ip.ProdPerUnit,
        COALESCE(ip.Percentage, 100) as Percentage,
        ip.Queue, COALESCE(ip.Pause, 0) as Pause
      FROM FCT_IndustrialProjects ip
      LEFT JOIN FCT_Population p ON ip.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      WHERE ip.GameID = ${ctx.gameId} AND ip.RaceID = ${ctx.raceId}
      ORDER BY ip.PopulationID, ip.Queue
    `)
    return rows.map((r) => {
      const cap = caps.get(r.PopulationID)
      const remainingWork = r.Amount * r.ProdPerUnit
      let annualCap = 0
      if (cap) {
        if (r.ProductionType === 1) annualCap = cap.ordnanceRate
        else if (r.ProductionType === 2) annualCap = cap.fighterRate
        else annualCap = cap.constructionRate
      }
      const allocated = annualCap * (r.Percentage / 100)
      const isQueued = r.Queue > 0
      let days = daysFromAnnual(remainingWork, allocated)
      if (isQueued && days != null) days = days * 50000

      const badge = PROD_TYPE_BADGE[r.ProductionType] ?? 'Production'
      // Show quantity prefix like Electrons: "1836.7x Mine"
      const qty = r.Amount >= 10 ? Math.round(r.Amount * 10) / 10 : Math.round(r.Amount * 100) / 100
      const desc = r.Description || 'Unknown'
      const name = r.Amount > 1 ? `${qty}x ${desc}` : desc
      return {
        id: `prod-${r.ProjectID}`,
        type: 'production' as const,
        badge,
        name,
        system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
        colonyId: r.PopulationID,
        remainingDays: days,
        annualRate: allocated > 0 ? `${fmtNum(allocated)} BP / ${r.Percentage}%` : `${r.Percentage}%`,
        annualRateValue: allocated,
        paused: r.Pause !== 0,
        queued: isQueued,
      }
    })
  } catch {
    return []
  }
}

/* ── Ship Construction (FCT_ShipyardTask) ──────────────────────────── */

async function getShipEntries(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  try {
    const rows = await query<{
      TaskID: number
      PopulationID: number
      PopName: string
      SystemName: string
      UnitName: string
      ClassName: string
      TotalBP: number
      CompletedBP: number
      Paused: number
      ShipSize: number
      ShipCommercial: number
    }>(`
      SELECT st.TaskID, sy.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        COALESCE(st.UnitName, '') as UnitName,
        COALESCE(sc.ClassName, 'Unknown') as ClassName,
        st.TotalBP, st.CompletedBP,
        COALESCE(st.Paused, 0) as Paused,
        COALESCE(sc.Size, 0) as ShipSize,
        COALESCE(sc.Commercial, 0) as ShipCommercial
      FROM FCT_ShipyardTask st
      JOIN FCT_Shipyard sy ON st.ShipyardID = sy.ShipyardID AND sy.GameID = ${ctx.gameId}
      LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      LEFT JOIN FCT_ShipClass sc ON st.ClassID = sc.ShipClassID
      WHERE st.GameID = ${ctx.gameId} AND st.RaceID = ${ctx.raceId}
    `)
    return rows.map((r) => {
      const remaining = Math.max(0, r.TotalBP - r.CompletedBP)
      const cap = caps.get(r.PopulationID)
      // Ship size modifier: 1 + (Size × CommercialModifier / 100 - 1) / 2
      // Commercial ships use Size as-is, military ships use Size × 0 (CommercialModifier=0 for military)
      const commercialMod = r.ShipCommercial ? 1 : 0
      const sizeMod = 1 + (r.ShipSize * commercialMod / 100 - 1) / 2
      const annualBP = (cap?.shipBuildRate ?? 0) * Math.max(sizeMod, 0.01)
      const name = r.UnitName ? `${r.ClassName} (${r.UnitName})` : r.ClassName
      return {
        id: `ship-${r.TaskID}`,
        type: 'ship' as const,
        badge: 'Ship',
        name,
        system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
        colonyId: r.PopulationID,
        remainingDays: daysFromAnnual(remaining, annualBP),
        annualRate: annualBP > 0 ? `${fmtNum(annualBP)} Mod Rate` : '',
        annualRateValue: annualBP,
        paused: r.Paused !== 0,
        queued: false,
      }
    })
  } catch {
    return []
  }
}

/* ── Shipyard Upgrades (FCT_Shipyard where TaskType > 0) ───────────── */

const SY_TASK_NAMES: Record<number, string> = {
  1: 'Add Slipway',
  2: 'Add 500t Capacity',
  3: 'Add 1,000t Capacity',
  4: 'Add 2,000t Capacity',
  5: 'Add 5,000t Capacity',
  6: 'Add 10,000t Capacity',
  7: 'Retool',
  8: 'Continual Capacity Upgrade',
  9: 'Spacemaster Mod',
}

async function getShipyardEntries(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  try {
    const rows = await query<{
      ShipyardID: number
      ShipyardName: string
      PopulationID: number
      PopName: string
      SystemName: string
      SYType: number
      Slipways: number
      Capacity: number
      TaskType: number
      RequiredBP: number
      CompletedBP: number
      PauseActivity: number
      RetoolClassName: string | null
      CapacityTarget: number
    }>(`
      SELECT sy.ShipyardID, sy.ShipyardName, sy.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        sy.SYType, sy.Slipways, sy.Capacity,
        COALESCE(sy.TaskType, 0) as TaskType,
        COALESCE(sy.RequiredBP, 0) as RequiredBP,
        COALESCE(sy.CompletedBP, 0) as CompletedBP,
        COALESCE(sy.PauseActivity, 0) as PauseActivity,
        COALESCE(sy.CapacityTarget, 0) as CapacityTarget,
        sc.ClassName as RetoolClassName
      FROM FCT_Shipyard sy
      LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      LEFT JOIN FCT_ShipClass sc ON sy.RetoolClassID = sc.ShipClassID
      WHERE sy.GameID = ${ctx.gameId} AND sy.RaceID = ${ctx.raceId}
        AND sy.TaskType > 0
    `)
    return rows.map((r) => {
      const cap = caps.get(r.PopulationID)
      const commercialMod = r.SYType === 1 ? 1 : 0.1
      const capMod = 1 + (r.Capacity * commercialMod / 5000 - 1) / 2
      const upgradeRate = (cap?.shipBuildRate ?? 0) * Math.max(capMod, 0.01)
      const effectiveRate = r.TaskType === 7 ? upgradeRate / Math.max(r.Slipways, 1) : upgradeRate

      // For continual capacity upgrades (TaskType=8), use Electrons' period-by-period formula
      if (r.TaskType === 8 && r.CapacityTarget > r.Capacity && cap) {
        const SECONDS_PER_YEAR = 31536000
        const SECONDS_PER_DAY = 86400
        const roi = cap.minConstructionPeriod / SECONDS_PER_YEAR // fraction of year per period
        const periodDays = cap.minConstructionPeriod / SECONDS_PER_DAY

        let periods = 0
        let newCapacity = r.Capacity
        const syTypeMod = r.SYType === 1 ? 500 : 5000
        const wat = 120 * r.Slipways * cap.shipyardOperations

        if (wat > 0) {
          while (newCapacity < r.CapacityTarget && periods < 100000) {
            const stepCapMod = 1 + (newCapacity * commercialMod / 5000 - 1) / 2
            const stepRate = (cap.shipBuildRate * Math.max(stepCapMod, 0.01)) * roi
            const added = (stepRate / wat) * syTypeMod
            newCapacity += added
            periods++
          }
        }

        const days = Math.round(periods * periodDays * 10) / 10
        const taskName = SY_TASK_NAMES[r.TaskType] ?? `Task ${r.TaskType}`
        const name = `${r.ShipyardName} - ${taskName} to ${fmtNum(r.CapacityTarget)}`
        return {
          id: `sy-${r.ShipyardID}`,
          type: 'shipyard' as const,
          badge: 'Shipyard',
          name,
          system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
          colonyId: r.PopulationID,
          remainingDays: days > 0 ? days : null,
          annualRate: effectiveRate > 0 ? `${fmtNum(effectiveRate)} Mod Rate` : '',
          paused: r.PauseActivity !== 0,
          queued: false,
        }
      }

      remaining = Math.max(0, r.RequiredBP - r.CompletedBP)
      const taskName = SY_TASK_NAMES[r.TaskType] ?? `Task ${r.TaskType}`
      const name =
        r.TaskType === 7 && r.RetoolClassName
          ? `${r.ShipyardName} - Retool to ${r.RetoolClassName}`
          : `${r.ShipyardName} - ${taskName}`

      return {
        id: `sy-${r.ShipyardID}`,
        type: 'shipyard' as const,
        badge: 'Shipyard',
        name,
        system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
        colonyId: r.PopulationID,
        remainingDays: daysFromAnnual(remaining, effectiveRate),
        annualRate: effectiveRate > 0 ? `${fmtNum(effectiveRate)} Mod Rate` : '',
        annualRateValue: effectiveRate,
        paused: r.PauseActivity !== 0,
        queued: false,
      }
    })
  } catch {
    return []
  }
}

/* ── Ground Unit Training ──────────────────────────────────────────── */

async function getTrainingEntries(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  try {
    const rows = await query<{
      TaskID: number
      PopulationID: number
      PopName: string
      SystemName: string
      FormationName: string
      TotalBP: number
      CompletedBP: number
    }>(`
      SELECT t.TaskID, t.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        COALESCE(t.FormationName, 'Unknown Formation') as FormationName,
        t.TotalBP, t.CompletedBP
      FROM FCT_GroundUnitTraining t
      LEFT JOIN FCT_Population p ON t.PopulationID = p.PopulationID AND p.GameID = ${ctx.gameId}
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      WHERE t.GameID = ${ctx.gameId} AND t.RaceID = ${ctx.raceId}
    `)
    return rows.map((r) => {
      const remaining = Math.max(0, r.TotalBP - r.CompletedBP)
      const cap = caps.get(r.PopulationID)
      const annualBP = cap?.trainingRate ?? 0
      return {
        id: `train-${r.TaskID}`,
        type: 'training' as const,
        badge: 'Training',
        name: r.FormationName,
        system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
        colonyId: r.PopulationID,
        remainingDays: daysFromAnnual(remaining, annualBP),
        annualRate: annualBP > 0 ? `${fmtNum(annualBP)} BP` : '',
        annualRateValue: annualBP,
        paused: false,
        queued: false,
      }
    })
  } catch {
    return []
  }
}

/* ── Terraforming ──────────────────────────────────────────────────── */

// Broken V1 removed - see V2 below

async function _brokenTerraformV1(query: QueryFn, ctx: GameCtx, caps: Map<number, PopCap>): Promise<RecapEntry[]> {
  const EARTH_SURFACE_AREA = 511187128

  try {
    // 1. Planetary terraformers (ground installations)
    const planetaryRows = await query<{
      PopulationID: number
      PopName: string
      GasName: string
      GasAtm: number
      MaxAtm: number
      TerraformStatus: number
      Radius: number
      TerraformPower: number
      TerraformingSpeed: number
    }>(`
      SELECT p.PopulationID, p.PopName,
        COALESCE(dg.Name, 'Unknown Gas') as GasName,
        COALESCE(ag.GasAtm, 0) as GasAtm,
        COALESCE(p.MaxAtm, 0) as MaxAtm,
        COALESCE(p.TerraformStatus, 0) as TerraformStatus,
        COALESCE(sb.Radius, 1) as Radius,
        COALESCE(inst.TerraformPower, 0) as TerraformPower,
        COALESCE(g.TerraformingSpeed / 100.0, 1) as TerraformingSpeed
      FROM FCT_Population p
      JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${ctx.gameId}
      JOIN FCT_Game g ON p.GameID = g.GameID
      LEFT JOIN FCT_SystemBody sb ON p.SystemBodyID = sb.SystemBodyID
      LEFT JOIN DIM_Gases dg ON p.TerraformingGasID = dg.GasID
      LEFT JOIN FCT_AtmosphericGas ag ON ag.SystemBodyID = p.SystemBodyID
        AND ag.AtmosGasID = p.TerraformingGasID AND ag.GameID = ${ctx.gameId}
      LEFT JOIN (
        SELECT pi.PopID, SUM(di.TerraformValue * pi.Amount) as TerraformPower
        FROM FCT_PopulationInstallations pi
        JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
        WHERE pi.GameID = ${ctx.gameId} AND di.TerraformValue > 0
        GROUP BY pi.PopID
      ) inst ON p.PopulationID = inst.PopID
      WHERE p.GameID = ${ctx.gameId} AND p.RaceID = ${ctx.raceId}
        AND p.TerraformingGasID IS NOT NULL AND p.TerraformingGasID > 0
    `)

    // 2. Orbital terraformers (ships with Terraformers modules orbiting the planet)
    let orbitalMap = new Map<number, number>() // popId → total orbital terraform power
    try {
      const orbitalRows = await query<{
        PopulationID: number
        OrbitalPower: number
      }>(`
        SELECT pop.PopulationID,
          SUM(sc.Terraformers * COALESCE(cb.BonusValue, 1)) as OrbitalPower
        FROM FCT_Ship s
        JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        JOIN FCT_Population pop ON f.OrbitBodyID = pop.SystemBodyID AND s.RaceID = pop.RaceID
        LEFT JOIN FCT_Commander c ON s.ShipID = c.CommandID AND c.CommandType = 1
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 9
        WHERE s.GameID = ${ctx.gameId} AND s.RaceID = ${ctx.raceId}
          AND sc.Terraformers > 0
          AND pop.TerraformingGasID IS NOT NULL AND pop.TerraformingGasID > 0
        GROUP BY pop.PopulationID
      `)
      for (const r of orbitalRows) {
        orbitalMap.set(r.PopulationID, r.OrbitalPower || 0)
      }
    } catch {
      orbitalMap = new Map()
    }

    // 3. Combine planetary + orbital, apply surface area scaling
    return planetaryRows
      .map((r) => {
        const cap = caps.get(r.PopulationID)
        // Planetary: PopulationTerraformingRate (with env modifiers) × TerraformPower
        // From the VIR view: PopulationTerraformingRate = cmdTerraformBonus × sectorBonus × Efficiency × Rad × Stability × ProdMod × TerraformingRate
        // Simplified (no commander): TerraformingRate × baseMod
        const baseTerraformRate = cap
          ? (cap.trainingRate / (cap.trainingRate > 0 ? 1 : 1)) // We don't have a separate terraform rate in PopCap yet
          : 0
        // Actually, use FCT_Race.TerraformingRate which we can get from the query
        // For planetary: the TerraformPower is sum of installations, rate comes from population modifiers
        // Electrons uses: populationTerraformingRate(popId) × Terraformers (installations)
        // populationTerraformingRate = cmdBonus × sectorBonus × Efficiency × Rad × Stability × ProdMod × FCT_Race.TerraformingRate
        // We'll approximate without commander terraforming bonus

        // The planetary rate needs FCT_Race.TerraformingRate × env modifiers × TerraformPower
        // We already queried TerraformPower. We need the rate from caps or from the query.
        // Since caps doesn't have terraformRate, let me compute it from the query data directly.
        // Actually, the planetaryRows query already has the data we need indirectly.

        // Simpler approach: query gives us TerraformPower and TerraformingSpeed
        // We need the base terraform rate per installation = FCT_Race.TerraformingRate × env modifiers
        // For now, let's query it separately or use a simpler calculation

        const orbitalPower = orbitalMap.get(r.PopulationID) ?? 0

        // Surface area scaling
        const localSurfaceArea = 4 * Math.PI * r.Radius * r.Radius
        const surfaceScale = localSurfaceArea > 0 ? EARTH_SURFACE_AREA / localSurfaceArea : 1

        // Total capacity = (planetary + orbital) × terraformingSpeed × surfaceScale
        // Planetary capacity = populationTerraformingRate × TerraformPower
        // Orbital capacity = baseTerraformRate × orbitalPower
        // For now, combine ground + orbital using the base rate from the query
        // The query gives us TerraformPower (ground installations) and we have orbitalPower (ships)
        // Both are multiplied by the same base rate, then by TerraformingSpeed and surface scale

        // Since we don't have the exact terraform rate per unit in this simplified model,
        // use: annualRate = (groundPower + orbitalPower) × raceBaseRate × envModifiers × speed × surfaceScale
        // But we don't have raceBaseRate separately here. Let me use a direct approach:
        // From the previous simple formula: EffectiveRate = TerraformingRate × Speed × envMod × TerraformPower
        // With orbital: EffectiveRate = TerraformingRate × Speed × envMod × (TerraformPower + orbitalPower) × surfaceScale
        // But orbital uses a different modifier chain (no planet env modifiers)

        // OK let me just estimate: combine both powers and use the simple rate
        // This won't be 100% accurate but much better than ground-only
        const totalPower = r.TerraformPower + orbitalPower
        // We need a per-unit rate. Query the race terraform rate directly
        // For simplicity, calculate the rate we had before and add orbital proportionally
        const groundOnlyRate = r.TerraformPower // This is just the power, not the rate
        // Hmm, this is getting complicated. Let me just recalculate properly.

        return { ...r, orbitalPower, surfaceScale, totalPower }
      })
      return []
  } catch {
    return []
  }
}

async function getTerraformingEntries(query: QueryFn, ctx: GameCtx): Promise<RecapEntry[]> {
  const EARTH_SURFACE_AREA = 511187128

  try {
    // Get terraforming base data per population
    const baseRows = await query<{
      PopulationID: number
      PopName: string
      SystemName: string
      GasName: string
      GasAtm: number
      MaxAtm: number
      TerraformStatus: number
      Radius: number
      TerraformingRate: number // from FCT_Race
      TerraformingSpeed: number // from FCT_Game / 100
      Efficiency: number
      RadMod: number
      Stability: number
      ProdMod: number
      GroundPower: number // sum of installation TerraformValue × Amount
    }>(`
      SELECT p.PopulationID, p.PopName,
        COALESCE(rss.Name, '') as SystemName,
        COALESCE(dg.Name, 'Unknown Gas') as GasName,
        COALESCE(ag.GasAtm, 0) as GasAtm,
        COALESCE(p.MaxAtm, 0) as MaxAtm,
        COALESCE(p.TerraformStatus, 0) as TerraformStatus,
        COALESCE(sb.Radius, 1) as Radius,
        COALESCE(r.TerraformingRate, 0) as TerraformingRate,
        COALESCE(g.TerraformingSpeed / 100.0, 1) as TerraformingSpeed,
        COALESCE(p.Efficiency, 1) as Efficiency,
        (1.0 - COALESCE(sb.RadiationLevel, 0) / 10000.0) as RadMod,
        (1.0 - COALESCE(p.UnrestPoints, 0) / 100.0) as Stability,
        COALESCE(ps.ProductionMod, 1) as ProdMod,
        COALESCE(inst.GroundPower, 0) as GroundPower
      FROM FCT_Population p
      JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${ctx.gameId}
      JOIN FCT_Game g ON p.GameID = g.GameID
      LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
      LEFT JOIN FCT_SystemBody sb ON p.SystemBodyID = sb.SystemBodyID
      LEFT JOIN DIM_PopPoliticalStatus ps ON p.PoliticalStatus = ps.StatusID
      LEFT JOIN DIM_Gases dg ON p.TerraformingGasID = dg.GasID
      LEFT JOIN FCT_AtmosphericGas ag ON ag.SystemBodyID = p.SystemBodyID
        AND ag.AtmosGasID = p.TerraformingGasID AND ag.GameID = ${ctx.gameId}
      LEFT JOIN (
        SELECT pi.PopID, SUM(di.TerraformValue * pi.Amount) as GroundPower
        FROM FCT_PopulationInstallations pi
        JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
        WHERE pi.GameID = ${ctx.gameId} AND di.TerraformValue > 0
        GROUP BY pi.PopID
      ) inst ON p.PopulationID = inst.PopID
      WHERE p.GameID = ${ctx.gameId} AND p.RaceID = ${ctx.raceId}
        AND p.TerraformingGasID IS NOT NULL AND p.TerraformingGasID > 0
    `)

    // Governor terraform bonus (BonusID=9)
    let govTerraformMap = new Map<number, number>()
    try {
      const govRows = await query<{ PopulationID: number; TerraformBonus: number }>(`
        SELECT c.CommandID as PopulationID, COALESCE(cb.BonusValue, 1) as TerraformBonus
        FROM FCT_Commander c
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 9
        WHERE c.GameID = ${ctx.gameId} AND c.CommandType = 3 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
      `)
      for (const g of govRows) {
        govTerraformMap.set(g.PopulationID, g.TerraformBonus)
      }
    } catch {
      govTerraformMap = new Map()
    }

    // Orbital terraformers (ships)
    let orbitalMap = new Map<number, number>()
    try {
      const orbRows = await query<{ PopulationID: number; OrbitalPower: number }>(`
        SELECT pop.PopulationID,
          SUM(sc.Terraformers * COALESCE(cb.BonusValue, 1)) as OrbitalPower
        FROM FCT_Ship s
        JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        JOIN FCT_Population pop ON f.OrbitBodyID = pop.SystemBodyID AND s.RaceID = pop.RaceID
        LEFT JOIN FCT_Commander c ON s.ShipID = c.CommandID AND c.CommandType = 1
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 9
        WHERE s.GameID = ${ctx.gameId} AND s.RaceID = ${ctx.raceId}
          AND sc.Terraformers > 0
          AND pop.TerraformingGasID IS NOT NULL AND pop.TerraformingGasID > 0
        GROUP BY pop.PopulationID
      `)
      for (const r of orbRows) {
        orbitalMap.set(r.PopulationID, r.OrbitalPower || 0)
      }
    } catch {
      orbitalMap = new Map()
    }

    return baseRows
      .map((r) => {
        const orbitalPower = orbitalMap.get(r.PopulationID) ?? 0

        // Planetary capacity = PopulationTerraformingRate × GroundPower
        // PopulationTerraformingRate = govTerraformBonus × Efficiency × RadMod × Stability × ProdMod × TerraformingRate
        const govTerraformBonus = govTerraformMap.get(r.PopulationID) ?? 1
        const popTerraformRate = govTerraformBonus * r.Efficiency * r.RadMod * r.Stability * r.ProdMod * r.TerraformingRate
        const planetaryCapacity = popTerraformRate * r.GroundPower

        // Orbital capacity = base TerraformingRate × OrbitalPower (includes commander bonus from query)
        const orbitalCapacity = r.TerraformingRate * orbitalPower

        // Total = (planetary + orbital) × TerraformingSpeed
        const totalCapacity = (planetaryCapacity + orbitalCapacity) * r.TerraformingSpeed

        // Surface area scaling
        const localSurface = 4 * Math.PI * r.Radius * r.Radius
        const annualRate = localSurface > 0 ? totalCapacity * (EARTH_SURFACE_AREA / localSurface) : 0

        if (annualRate <= 0) return null

        const remaining = r.TerraformStatus ? Math.max(0, r.MaxAtm - r.GasAtm) : Math.max(0, r.GasAtm - r.MaxAtm)
        const days = annualRate > 0 ? Math.round((remaining / (annualRate / DAYS_PER_YEAR)) * 10) / 10 : null

        return {
          id: `terra-${r.PopulationID}`,
          type: 'terraforming' as const,
          badge: 'Terraforming',
          name: `${r.GasName} to ${r.MaxAtm} Atm`,
          system: r.SystemName || '',
        colony: r.PopName || 'Unknown',
          colonyId: r.PopulationID,
          remainingDays: days,
          annualRate: `${annualRate.toFixed(4)} Atm`,
          annualRateValue: annualRate,
          paused: false,
          queued: false,
        }
      })
      .filter((e): e is RecapEntry => e !== null)
  } catch {
    return []
  }
}

/* ── Unified Recap ─────────────────────────────────────────────────── */

export async function getProductionRecap(query: QueryFn, ctx: GameCtx): Promise<RecapEntry[]> {
  const caps = await getPopCaps(query, ctx)
  const [research, industrial, ships, shipyards, training, terraforming] = await Promise.all([
    getResearchEntries(query, ctx, caps),
    getIndustrialEntries(query, ctx, caps),
    getShipEntries(query, ctx, caps),
    getShipyardEntries(query, ctx, caps),
    getTrainingEntries(query, ctx, caps),
    getTerraformingEntries(query, ctx),
  ])
  return [...research, ...industrial, ...ships, ...shipyards, ...training, ...terraforming].sort(
    (a, b) => (a.remainingDays ?? Infinity) - (b.remainingDays ?? Infinity)
  )
}
