/**
 * SQL-based data provider for the production recap.
 *
 * Extracts all SQL queries into a single class. Works for both
 * offline (better-sqlite3) and bridge (WebSocket) via the QueryFn abstraction.
 *
 * IMPORTANT: Body data (FCT_SystemBody) is handled differently per mode:
 *   - Offline mode: getBodies() queries FCT_SystemBody via SQL (data is in the DB file)
 *   - Bridge mode:  getBodies() is NOT called. The handler uses MemoryBodyProvider
 *                   instead, which reads real-time data from Aurora's RAM.
 *                   FCT_SystemBody has no bridge save method, so the in-memory
 *                   SQLite table is empty in bridge mode.
 *
 * The handler (empire-handler.ts) decides which source to use for bodies.
 * All other data is fetched via SQL in both modes.
 *
 * Governor/sector bonuses use CASE WHEN + GROUP BY to avoid the
 * multi-self-join bug in the bridge's in-memory SQLite.
 */

import type { QueryFn } from '../compute/types'
import type {
  RecapDataProvider,
  PopulationData,
  InstallationPower,
  EngineerPower,
  GovernorBonus,
  SectorBonus,
  BodyData,
  ResearchProject,
  IndustrialProject,
  ShipTask,
  ShipyardUpgrade,
  TrainingTask,
  TerraformingData,
  OrbitalTerraformer,
  GovernorTerraformBonus,
} from './types'

export class SqlRecapProvider implements RecapDataProvider {
  constructor(
    private query: QueryFn,
    private gameId: number,
    private raceId: number
  ) {}

  async getPopulations(): Promise<PopulationData[]> {
    const rows = await this.query<{
      PopulationID: number
      SystemBodyID: number
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
      PoliticalStability: number
      ProductionMod: number
      MinConstructionPeriod: number
      ShipyardOperations: number
    }>(`
      SELECT
        p.PopulationID, p.SystemBodyID,
        r.ConstructionProduction, r.OrdnanceProduction, r.FighterProduction,
        r.ShipBuilding, r.Research, r.GroundFormationConstructionRate,
        COALESCE(r.EconomicProdModifier, 1) as EconomicProdModifier,
        COALESCE(sp.ProductionRateModifier, 1) as ProductionRateModifier,
        COALESCE(sp.ResearchRateModifier, 1) as ResearchRateModifier,
        COALESCE(g.ResearchSpeed / 100.0, 1) as ResearchSpeed,
        COALESCE(g.MinConstructionPeriod, 430000) as MinConstructionPeriod,
        COALESCE(r.ShipyardOperations, 1) as ShipyardOperations,
        COALESCE(p.Efficiency, 1) as Efficiency,
        (1.0 - COALESCE(p.UnrestPoints, 0) / 100.0) as PoliticalStability,
        COALESCE(ps.ProductionMod, 1) as ProductionMod
      FROM FCT_Population p
      JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${this.gameId}
      JOIN FCT_Game g ON p.GameID = g.GameID
      LEFT JOIN FCT_Species sp ON p.SpeciesID = sp.SpeciesID
      LEFT JOIN DIM_PopPoliticalStatus ps ON p.PoliticalStatus = ps.StatusID
      WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
    `)
    return rows.map((r) => ({
      populationId: r.PopulationID,
      systemBodyId: r.SystemBodyID,
      constructionProduction: r.ConstructionProduction,
      ordnanceProduction: r.OrdnanceProduction,
      fighterProduction: r.FighterProduction,
      shipBuilding: r.ShipBuilding,
      research: r.Research,
      groundFormationConstructionRate: r.GroundFormationConstructionRate,
      economicProdModifier: r.EconomicProdModifier ?? 1,
      productionRateModifier: r.ProductionRateModifier ?? 1,
      researchRateModifier: r.ResearchRateModifier ?? 1,
      researchSpeed: r.ResearchSpeed ?? 1,
      efficiency: r.Efficiency ?? 1,
      politicalStability: r.PoliticalStability ?? 1,
      productionMod: r.ProductionMod ?? 1,
      minConstructionPeriod: r.MinConstructionPeriod ?? 430000,
      shipyardOperations: r.ShipyardOperations ?? 1,
    }))
  }

  async getInstallationPower(): Promise<InstallationPower[]> {
    const rows = await this.query<{
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
      WHERE pi.GameID = ${this.gameId}
      GROUP BY pi.PopID
    `)
    return rows.map((r) => ({
      popId: r.PopID,
      constructionPower: r.ConstructionPower || 0,
      ordnancePower: r.OrdnancePower || 0,
      fighterPower: r.FighterPower || 0,
    }))
  }

  async getEngineerPower(): Promise<EngineerPower[]> {
    try {
      const rows = await this.query<{ PopulationID: number; GroundConstructionPower: number }>(`
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
          AND c.CommanderType IN (1, 4) AND c.CommandType = 5 AND c.GameID = ${this.gameId}
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 5
        WHERE guf.GameID = ${this.gameId} AND guf.RaceID = ${this.raceId}
        GROUP BY guf.PopulationID
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        groundConstructionPower: r.GroundConstructionPower || 0,
      }))
    } catch {
      return []
    }
  }

  async getGovernorBonuses(): Promise<GovernorBonus[]> {
    // Single JOIN with CASE WHEN + GROUP BY — avoids triple-self-join bug on bridge
    try {
      const rows = await this.query<{
        PopID: number
        ConstructionBonus: number | null
        ShipbuildingBonus: number | null
        TrainingBonus: number | null
      }>(`
        SELECT c.CommandID as PopID,
          MAX(CASE WHEN cb.BonusID = 5 THEN cb.BonusValue END) as ConstructionBonus,
          MAX(CASE WHEN cb.BonusID = 4 THEN cb.BonusValue END) as ShipbuildingBonus,
          MAX(CASE WHEN cb.BonusID = 11 THEN cb.BonusValue END) as TrainingBonus
        FROM FCT_Commander c
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID IN (4, 5, 11)
        WHERE c.GameID = ${this.gameId} AND c.CommandType = 3 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
        GROUP BY c.CommandID
      `)
      return rows.map((r) => ({
        populationId: r.PopID,
        construction: r.ConstructionBonus ?? 1,
        shipbuilding: r.ShipbuildingBonus ?? 1,
        training: r.TrainingBonus ?? 1,
      }))
    } catch {
      return []
    }
  }

  async getSectorBonuses(): Promise<SectorBonus[]> {
    // Single JOIN with CASE WHEN + GROUP BY — same pattern as governor
    try {
      const rows = await this.query<{
        PopID: number
        SectorConstruction: number | null
        SectorShipbuilding: number | null
        SectorTraining: number | null
        SectorTerraform: number | null
      }>(`
        SELECT pop.PopulationID as PopID,
          1 + (MAX(CASE WHEN cb.BonusID = 5 THEN cb.BonusValue END) - 1) * 0.25 as SectorConstruction,
          1 + (MAX(CASE WHEN cb.BonusID = 4 THEN cb.BonusValue END) - 1) * 0.25 as SectorShipbuilding,
          1 + (MAX(CASE WHEN cb.BonusID = 11 THEN cb.BonusValue END) - 1) * 0.25 as SectorTraining,
          1 + (MAX(CASE WHEN cb.BonusID = 9 THEN cb.BonusValue END) - 1) * 0.25 as SectorTerraform
        FROM FCT_Commander c
        INNER JOIN FCT_RaceSysSurvey rss ON c.CommandID = rss.SectorID AND rss.SectorID != 0
        INNER JOIN FCT_Population pop ON rss.SystemID = pop.SystemID
          AND pop.GameID = ${this.gameId} AND pop.RaceID = ${this.raceId}
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID IN (4, 5, 9, 11)
        WHERE c.GameID = ${this.gameId} AND c.CommandType = 4 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
        GROUP BY pop.PopulationID
      `)
      return rows.map((r) => ({
        populationId: r.PopID,
        construction: r.SectorConstruction ?? 1,
        shipbuilding: r.SectorShipbuilding ?? 1,
        training: r.SectorTraining ?? 1,
        terraform: r.SectorTerraform ?? 1,
      }))
    } catch {
      return []
    }
  }

  /**
   * Get body data (Radius, RadiationLevel, etc.) from FCT_SystemBody via SQL.
   *
   * OFFLINE MODE ONLY. In bridge mode, FCT_SystemBody has no save method and
   * the in-memory SQLite table is empty. The handler uses MemoryBodyProvider
   * instead, which reads body data directly from Aurora's RAM via the
   * bridge's `getbodies` WebSocket endpoint.
   *
   * The handler decides which provider to use — see empire-handler.ts getBodies().
   */
  async getBodies(): Promise<Record<number, BodyData>> {
    try {
      const rows = await this.query<{
        SystemBodyID: number
        SystemID: number
        Name: string
        BodyClass: number
        Radius: number
        Gravity: number
        Density: number
        Xcor: number
        Ycor: number
        AtmosPress: number
        SurfaceTemp: number
        HydroExt: number
        HydroID: number
        RadiationLevel: number
        DustLevel: number
      }>(`
        SELECT SystemBodyID, SystemID,
          COALESCE(Name, '') as Name,
          COALESCE(BodyClass, 0) as BodyClass,
          COALESCE(Radius, 0) as Radius,
          COALESCE(Gravity, 0) as Gravity,
          COALESCE(Density, 0) as Density,
          COALESCE(Xcor, 0) as Xcor,
          COALESCE(Ycor, 0) as Ycor,
          COALESCE(AtmosPress, 0) as AtmosPress,
          COALESCE(SurfaceTemp, 0) as SurfaceTemp,
          COALESCE(HydroExt, 0) as HydroExt,
          COALESCE(HydroID, 0) as HydroID,
          COALESCE(RadiationLevel, 0) as RadiationLevel,
          COALESCE(DustLevel, 0) as DustLevel
        FROM FCT_SystemBody
        WHERE GameID = ${this.gameId}
      `)
      const map: Record<number, BodyData> = {}
      for (const r of rows) {
        map[r.SystemBodyID] = {
          systemBodyId: r.SystemBodyID,
          systemId: r.SystemID,
          name: r.Name,
          bodyClass: r.BodyClass,
          radius: r.Radius,
          gravity: r.Gravity,
          density: r.Density,
          xcor: r.Xcor,
          ycor: r.Ycor,
          atmosPress: r.AtmosPress,
          surfaceTemp: r.SurfaceTemp,
          hydroExt: r.HydroExt,
          hydroId: r.HydroID,
          radiationLevel: r.RadiationLevel,
          dustLevel: r.DustLevel,
        }
      }
      return map
    } catch {
      return {}
    }
  }

  async getResearchProjects(): Promise<ResearchProject[]> {
    try {
      const rows = await this.query<{
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
        LEFT JOIN FCT_Population p ON rp.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_TechSystem ts ON rp.TechID = ts.TechSystemID
        LEFT JOIN FCT_Commander c ON c.CommandID = rp.ProjectID
          AND c.GameID = ${this.gameId} AND c.CommandType = 7
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 3
        LEFT JOIN FCT_AncientConstruct ac ON ac.SystemBodyID = p.SystemBodyID
          AND ac.GameID = ${this.gameId} AND ac.Active = 1
        WHERE rp.GameID = ${this.gameId} AND rp.RaceID = ${this.raceId}
        ORDER BY rp.PopulationID
      `)
      return rows.map((r) => ({
        projectId: r.ProjectID,
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        techName: r.TechName,
        researchPointsRequired: r.ResearchPointsRequired,
        facilities: r.Facilities,
        pause: r.Pause,
        resSpecId: r.ResSpecID,
        commanderBonus: r.CommanderBonus,
        commanderField: r.CommanderField,
        anomalyBonus: r.AnomalyBonus,
        anomalyField: r.AnomalyField,
      }))
    } catch {
      return []
    }
  }

  async getIndustrialProjects(): Promise<IndustrialProject[]> {
    try {
      const rows = await this.query<{
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
        LEFT JOIN FCT_Population p ON ip.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        WHERE ip.GameID = ${this.gameId} AND ip.RaceID = ${this.raceId}
        ORDER BY ip.PopulationID, ip.Queue
      `)
      return rows.map((r) => ({
        projectId: r.ProjectID,
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        description: r.Description || 'Unknown',
        productionType: r.ProductionType,
        amount: r.Amount,
        prodPerUnit: r.ProdPerUnit,
        percentage: r.Percentage,
        queue: r.Queue,
        pause: r.Pause,
      }))
    } catch {
      return []
    }
  }

  async getShipTasks(): Promise<ShipTask[]> {
    try {
      const rows = await this.query<{
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
        JOIN FCT_Shipyard sy ON st.ShipyardID = sy.ShipyardID AND sy.GameID = ${this.gameId}
        LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_ShipClass sc ON st.ClassID = sc.ShipClassID
        WHERE st.GameID = ${this.gameId} AND st.RaceID = ${this.raceId}
      `)
      return rows.map((r) => ({
        taskId: r.TaskID,
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        unitName: r.UnitName,
        className: r.ClassName,
        totalBP: r.TotalBP,
        completedBP: r.CompletedBP,
        paused: r.Paused,
        shipSize: r.ShipSize,
        shipCommercial: r.ShipCommercial,
      }))
    } catch {
      return []
    }
  }

  async getShipyardUpgrades(): Promise<ShipyardUpgrade[]> {
    try {
      const rows = await this.query<{
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
        CapacityTarget: number
        RetoolClassName: string | null
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
        LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_ShipClass sc ON sy.RetoolClassID = sc.ShipClassID
        WHERE sy.GameID = ${this.gameId} AND sy.RaceID = ${this.raceId}
          AND sy.TaskType > 0
      `)
      return rows.map((r) => ({
        shipyardId: r.ShipyardID,
        shipyardName: r.ShipyardName,
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        syType: r.SYType,
        slipways: r.Slipways,
        capacity: r.Capacity,
        taskType: r.TaskType,
        requiredBP: r.RequiredBP,
        completedBP: r.CompletedBP,
        pauseActivity: r.PauseActivity,
        capacityTarget: r.CapacityTarget,
        retoolClassName: r.RetoolClassName,
      }))
    } catch {
      return []
    }
  }

  async getTrainingTasks(): Promise<TrainingTask[]> {
    try {
      const rows = await this.query<{
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
        LEFT JOIN FCT_Population p ON t.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        WHERE t.GameID = ${this.gameId} AND t.RaceID = ${this.raceId}
      `)
      return rows.map((r) => ({
        taskId: r.TaskID,
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        formationName: r.FormationName,
        totalBP: r.TotalBP,
        completedBP: r.CompletedBP,
      }))
    } catch {
      return []
    }
  }

  async getTerraformingData(): Promise<TerraformingData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        SystemBodyID: number
        GasName: string
        GasAtm: number
        MaxAtm: number
        TerraformStatus: number
        TerraformingRate: number
        TerraformingSpeed: number
        Efficiency: number
        Stability: number
        ProdMod: number
        GroundPower: number
      }>(`
        SELECT p.PopulationID, p.PopName, p.SystemBodyID,
          COALESCE(rss.Name, '') as SystemName,
          COALESCE(dg.Name, 'Unknown Gas') as GasName,
          COALESCE(ag.GasAtm, 0) as GasAtm,
          COALESCE(p.MaxAtm, 0) as MaxAtm,
          COALESCE(p.TerraformStatus, 0) as TerraformStatus,
          COALESCE(r.TerraformingRate, 0) as TerraformingRate,
          COALESCE(g.TerraformingSpeed / 100.0, 1) as TerraformingSpeed,
          COALESCE(p.Efficiency, 1) as Efficiency,
          (1.0 - COALESCE(p.UnrestPoints, 0) / 100.0) as Stability,
          COALESCE(ps.ProductionMod, 1) as ProdMod,
          COALESCE(inst.GroundPower, 0) as GroundPower
        FROM FCT_Population p
        JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${this.gameId}
        JOIN FCT_Game g ON p.GameID = g.GameID
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN DIM_PopPoliticalStatus ps ON p.PoliticalStatus = ps.StatusID
        LEFT JOIN DIM_Gases dg ON p.TerraformingGasID = dg.GasID
        LEFT JOIN FCT_AtmosphericGas ag ON ag.SystemBodyID = p.SystemBodyID
          AND ag.AtmosGasID = p.TerraformingGasID AND ag.GameID = ${this.gameId}
        LEFT JOIN (
          SELECT pi.PopID, SUM(di.TerraformValue * pi.Amount) as GroundPower
          FROM FCT_PopulationInstallations pi
          JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
          WHERE pi.GameID = ${this.gameId} AND di.TerraformValue > 0
          GROUP BY pi.PopID
        ) inst ON p.PopulationID = inst.PopID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND p.TerraformingGasID IS NOT NULL AND p.TerraformingGasID > 0
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        systemBodyId: r.SystemBodyID,
        gasName: r.GasName,
        gasAtm: r.GasAtm,
        maxAtm: r.MaxAtm,
        terraformStatus: r.TerraformStatus,
        terraformingRate: r.TerraformingRate,
        terraformingSpeed: r.TerraformingSpeed,
        efficiency: r.Efficiency ?? 1,
        stability: r.Stability ?? 1,
        prodMod: r.ProdMod ?? 1,
        groundPower: r.GroundPower || 0,
      }))
    } catch {
      return []
    }
  }

  async getOrbitalTerraformers(): Promise<OrbitalTerraformer[]> {
    try {
      const rows = await this.query<{ PopulationID: number; OrbitalPower: number }>(`
        SELECT pop.PopulationID,
          SUM(sc.Terraformers * COALESCE(cb.BonusValue, 1)) as OrbitalPower
        FROM FCT_Ship s
        JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        JOIN FCT_Population pop ON f.OrbitBodyID = pop.SystemBodyID AND s.RaceID = pop.RaceID
        LEFT JOIN FCT_Commander c ON s.ShipID = c.CommandID AND c.CommandType = 1
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 9
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND sc.Terraformers > 0
          AND pop.TerraformingGasID IS NOT NULL AND pop.TerraformingGasID > 0
        GROUP BY pop.PopulationID
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        orbitalPower: r.OrbitalPower || 0,
      }))
    } catch {
      return []
    }
  }

  async getGovernorTerraformBonuses(): Promise<GovernorTerraformBonus[]> {
    try {
      const rows = await this.query<{ PopulationID: number; TerraformBonus: number }>(`
        SELECT c.CommandID as PopulationID, COALESCE(cb.BonusValue, 1) as TerraformBonus
        FROM FCT_Commander c
        LEFT JOIN FCT_CommanderBonuses cb ON cb.CommanderID = c.CommanderID AND cb.BonusID = 9
        WHERE c.GameID = ${this.gameId} AND c.CommandType = 3 AND c.CommanderType IN (2, 4) AND c.CommandID != 0
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        terraformBonus: r.TerraformBonus,
      }))
    } catch {
      return []
    }
  }
}
