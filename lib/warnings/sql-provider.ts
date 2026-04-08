/**
 * SQL-based data provider for warnings.
 * Same pattern as recap: SQL queries → typed data objects.
 */

import type { QueryFn } from '../compute/types'
import type {
  WarningsDataProvider,
  StockpilingCivilianMineralsData,
  SelfSustainingDestinationData,
  FreeLabData,
  FreeCapacityData,
  DeadResearchData,
  LowEfficiencyData,
  GovernorlessData,
  MismatchedResearchData,
  WastedMiningData,
  WastedTerraformData,
  ObsoleteShipyardData,
  DamagedShipData,
  ArmorDamagedShipData,
  LowMoraleShipData,
  LowMaintenanceShipData,
  MisconfiguredSupplyClassData,
  MisconfiguredTankerClassData,
  ObsoleteShipData,
  FullyTrainedShipData,
  ActiveFireControlData,
  TransportNoShuttleData,
  CommanderlessAdminData,
  CommanderlessSectorData,
  ActiveLifepodData,
  KnownWreckData,
  UnexploitedConstructData,
  DangerousRiftData,
  IntruderData,
} from './types'

export class SqlWarningsProvider implements WarningsDataProvider {
  constructor(
    private query: QueryFn,
    private gameId: number,
    private raceId: number
  ) {}

  // PurchaseCivilianMinerals=1, MassDriverDest=0, sum all 11 minerals
  async getStockpilingCivilianMinerals(): Promise<StockpilingCivilianMineralsData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        TotalStockpile: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          p.Duranium + p.Neutronium + p.Corbomite + p.Tritanium + p.Boronide
            + p.Mercassium + p.Vendarite + p.Sorium + p.Uridium + p.Corundium
            + p.Gallicite as TotalStockpile
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND p.PurchaseCivilianMinerals = 1
          AND p.MassDriverDest = 0
        ORDER BY TotalStockpile DESC
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        totalStockpile: r.TotalStockpile || 0,
      }))
    } catch {
      return []
    }
  }

  // Efficiency=1, Population>10, Capital=0, ColonistDestination=0
  async getSelfSustainingDestinations(): Promise<SelfSustainingDestinationData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        Population: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          p.Population
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND p.Efficiency = 1
          AND p.Population > 10
          AND p.Capital = 0
          AND p.ColonistDestination = 0
        ORDER BY p.Population DESC
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        population: r.Population,
      }))
    } catch {
      return []
    }
  }

  async getFreeLabs(): Promise<FreeLabData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        TotalLabs: number
        AssignedLabs: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          COALESCE(labs.TotalLabs, 0) as TotalLabs,
          COALESCE(assigned.AssignedLabs, 0) as AssignedLabs
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN (
          SELECT pi.PopID, SUM(pi.Amount * di.ResearchValue) as TotalLabs
          FROM FCT_PopulationInstallations pi
          JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
          WHERE pi.GameID = ${this.gameId} AND di.ResearchValue > 0
          GROUP BY pi.PopID
        ) labs ON p.PopulationID = labs.PopID
        LEFT JOIN (
          SELECT rp.PopulationID, SUM(rp.Facilities) as AssignedLabs
          FROM FCT_ResearchProject rp
          WHERE rp.GameID = ${this.gameId} AND rp.RaceID = ${this.raceId}
          GROUP BY rp.PopulationID
        ) assigned ON p.PopulationID = assigned.PopulationID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND COALESCE(labs.TotalLabs, 0) > COALESCE(assigned.AssignedLabs, 0)
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        totalLabs: r.TotalLabs || 0,
        assignedLabs: r.AssignedLabs || 0,
        freeLabs: (r.TotalLabs || 0) - (r.AssignedLabs || 0),
      }))
    } catch {
      return []
    }
  }

  async getFreeCapacity(): Promise<FreeCapacityData[]> {
    const results: FreeCapacityData[] = []
    const types: Array<{ capacityType: 'construction' | 'ordnance' | 'fighter'; installCol: string; prodTypes: string }> = [
      { capacityType: 'construction', installCol: 'ConstructionValue', prodTypes: '0, 3, 4' },
      { capacityType: 'ordnance', installCol: 'OrdnanceProductionValue', prodTypes: '1' },
      { capacityType: 'fighter', installCol: 'FighterProductionValue', prodTypes: '2' },
    ]

    for (const { capacityType, installCol, prodTypes } of types) {
      try {
        const rows = await this.query<{
          PopulationID: number
          PopName: string
          SystemName: string
          FreePercent: number
        }>(`
          SELECT cp.PopulationID, cp.PopName, cp.SystemName,
            100 - COALESCE(used.UsedPercent, 0) as FreePercent
          FROM (
            SELECT p.PopulationID, p.PopName, COALESCE(rss.Name, '') as SystemName
            FROM FCT_Population p
            LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
            JOIN FCT_PopulationInstallations pi ON p.PopulationID = pi.PopID AND pi.GameID = ${this.gameId}
            JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
            WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
              AND di.${installCol} > 0
            GROUP BY p.PopulationID
          ) cp
          LEFT JOIN (
            SELECT ip.PopulationID, SUM(ip.Percentage) as UsedPercent
            FROM FCT_IndustrialProjects ip
            WHERE ip.GameID = ${this.gameId} AND ip.RaceID = ${this.raceId}
              AND ip.ProductionType IN (${prodTypes})
            GROUP BY ip.PopulationID
          ) used ON cp.PopulationID = used.PopulationID
          WHERE 100 - COALESCE(used.UsedPercent, 0) > 0.01
        `)
        for (const r of rows) {
          results.push({
            populationId: r.PopulationID,
            popName: r.PopName || 'Unknown',
            systemName: r.SystemName || '',
            freePercent: Math.round((r.FreePercent || 0) * 10) / 10,
            capacityType,
          })
        }
      } catch {
        // Skip this type
      }
    }
    return results
  }

  async getDeadResearch(): Promise<DeadResearchData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        LabCount: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          COALESCE(labs.LabCount, 0) as LabCount
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        JOIN (
          SELECT pi.PopID, SUM(pi.Amount) as LabCount
          FROM FCT_PopulationInstallations pi
          JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
          WHERE pi.GameID = ${this.gameId} AND di.ResearchValue > 0
          GROUP BY pi.PopID
        ) labs ON p.PopulationID = labs.PopID
        LEFT JOIN FCT_ResearchProject rp ON rp.PopulationID = p.PopulationID
          AND rp.GameID = ${this.gameId} AND rp.RaceID = ${this.raceId}
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND rp.ProjectID IS NULL
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        labCount: r.LabCount || 0,
      }))
    } catch {
      return []
    }
  }

  async getLowEfficiency(): Promise<LowEfficiencyData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        Efficiency: number
        Population: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          p.Efficiency, p.Population
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND p.Efficiency < 1 AND p.Population > 0
        ORDER BY p.Efficiency ASC, p.Population DESC
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        efficiency: r.Efficiency,
        population: r.Population,
      }))
    } catch {
      return []
    }
  }

  async getGovernorless(): Promise<GovernorlessData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        Population: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          p.Population
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_Commander c ON c.CommandID = p.PopulationID
          AND c.GameID = ${this.gameId} AND c.CommandType = 3 AND c.CommanderType IN (2, 4)
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND p.Population > 0
          AND c.CommanderID IS NULL
        ORDER BY p.Population DESC
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        population: r.Population,
      }))
    } catch {
      return []
    }
  }

  async getMismatchedResearch(): Promise<MismatchedResearchData[]> {
    try {
      const rows = await this.query<{
        ProjectID: number
        PopName: string
        SystemName: string
        TechName: string
        CommanderName: string
        CommanderField: string
        ProjectField: string
      }>(`
        SELECT rp.ProjectID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          COALESCE(ts.Name, 'Unknown') as TechName,
          c.Name as CommanderName,
          COALESCE(df_cmd.Name, 'Unknown') as CommanderField,
          COALESCE(df_proj.Name, 'Unknown') as ProjectField
        FROM FCT_ResearchProject rp
        JOIN FCT_Population p ON rp.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_TechSystem ts ON rp.TechID = ts.TechSystemID
        JOIN FCT_Commander c ON c.CommandID = rp.ProjectID
          AND c.GameID = ${this.gameId} AND c.CommandType = 7
        LEFT JOIN DIM_ResearchField df_cmd ON c.ResSpecID = df_cmd.ResearchFieldID
        LEFT JOIN DIM_ResearchField df_proj ON rp.ResSpecID = df_proj.ResearchFieldID
        WHERE rp.GameID = ${this.gameId} AND rp.RaceID = ${this.raceId}
          AND c.ResSpecID != rp.ResSpecID
      `)
      return rows.map((r) => ({
        projectId: r.ProjectID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        techName: r.TechName,
        scientistName: r.CommanderName || 'Unknown',
        scientistField: r.CommanderField,
        projectField: r.ProjectField,
      }))
    } catch {
      return []
    }
  }

  async getWastedMining(): Promise<WastedMiningData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        MiningInstallations: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          SUM(pi.Amount) as MiningInstallations
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        JOIN FCT_PopulationInstallations pi ON p.PopulationID = pi.PopID AND pi.GameID = ${this.gameId}
        JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
        LEFT JOIN FCT_MineralDeposit md ON p.SystemBodyID = md.SystemBodyID AND md.GameID = ${this.gameId}
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND di.MiningProductionValue > 0
          AND md.MaterialID IS NULL
        GROUP BY p.PopulationID
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        miningInstallations: r.MiningInstallations || 0,
      }))
    } catch {
      return []
    }
  }

  async getWastedTerraform(): Promise<WastedTerraformData[]> {
    try {
      const rows = await this.query<{
        PopulationID: number
        PopName: string
        SystemName: string
        TerraformInstallations: number
      }>(`
        SELECT p.PopulationID, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          SUM(pi.Amount) as TerraformInstallations
        FROM FCT_Population p
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        JOIN FCT_PopulationInstallations pi ON p.PopulationID = pi.PopID AND pi.GameID = ${this.gameId}
        JOIN DIM_PlanetaryInstallation di ON pi.PlanetaryInstallationID = di.PlanetaryInstallationID
        WHERE p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId}
          AND di.TerraformValue > 0
          AND (p.TerraformingGasID IS NULL OR p.TerraformingGasID = 0)
        GROUP BY p.PopulationID
      `)
      return rows.map((r) => ({
        populationId: r.PopulationID,
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        terraformInstallations: r.TerraformInstallations || 0,
      }))
    } catch {
      return []
    }
  }

  async getObsoleteShipyards(): Promise<ObsoleteShipyardData[]> {
    try {
      const rows = await this.query<{
        ShipyardID: number
        ShipyardName: string
        PopName: string
        SystemName: string
        ClassName: string
        Capacity: number
        Slipways: number
      }>(`
        SELECT sy.ShipyardID, sy.ShipyardName, p.PopName,
          COALESCE(rss.Name, '') as SystemName,
          sc.ClassName, sy.Capacity, sy.Slipways
        FROM FCT_Shipyard sy
        LEFT JOIN FCT_Population p ON sy.PopulationID = p.PopulationID AND p.GameID = ${this.gameId}
        LEFT JOIN FCT_RaceSysSurvey rss ON p.SystemID = rss.SystemID AND p.RaceID = rss.RaceID
        LEFT JOIN FCT_ShipClass sc ON sy.BuildClassID = sc.ShipClassID
        WHERE sy.GameID = ${this.gameId} AND sy.RaceID = ${this.raceId}
          AND sc.Obsolete = 1
        ORDER BY sy.Capacity DESC
      `)
      return rows.map((r) => ({
        shipyardId: r.ShipyardID,
        shipyardName: r.ShipyardName || 'Unknown',
        popName: r.PopName || 'Unknown',
        systemName: r.SystemName || '',
        className: r.ClassName || 'Unknown',
        capacity: r.Capacity,
        slipways: r.Slipways,
      }))
    } catch {
      return []
    }
  }

  // ── Ship warnings ──────────────────────────────────────────────────

  async getDamagedShips(): Promise<DamagedShipData[]> {
    try {
      // join DamagedComponent → ShipDesignComponents, sum ComponentCost per ship
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        ComponentName: string
        ComponentCost: number
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName,
          sdc.Name as ComponentName, sdc.Cost as ComponentCost
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        JOIN FCT_DamagedComponent dc ON s.ShipID = dc.ShipID
        JOIN FCT_ShipDesignComponents sdc ON dc.ComponentID = sdc.SDComponentID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND s.ShippingLineID = 0
      `)
      // Group by ship (same as Electrons reduce pattern)
      const map = new Map<number, { shipName: string; fleetName: string; components: string[]; totalCost: number }>()
      for (const r of rows) {
        const existing = map.get(r.ShipID)
        if (existing) {
          existing.components.push(r.ComponentName)
          existing.totalCost += r.ComponentCost
        } else {
          map.set(r.ShipID, {
            shipName: r.ShipName,
            fleetName: r.FleetName,
            components: [r.ComponentName],
            totalCost: r.ComponentCost,
          })
        }
      }
      return Array.from(map.entries())
        .map(([shipId, d]) => ({
          shipId,
          shipName: d.shipName,
          fleetName: d.fleetName,
          damagedComponents: d.components.join(', '),
          repairCost: d.totalCost,
        }))
        .sort((a, b) => b.repairCost - a.repairCost)
    } catch {
      return []
    }
  }

  async getArmorDamagedShips(): Promise<ArmorDamagedShipData[]> {
    try {
      // ThinnestLayer = MIN(ArmourThickness - Damage)
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        ArmorDamage: number
        ArmourThickness: number
        ThinnestLayer: number
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName,
          SUM(ad.Damage) as ArmorDamage,
          sc.ArmourThickness,
          MIN(sc.ArmourThickness - ad.Damage) as ThinnestLayer
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        LEFT JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        JOIN FCT_ArmourDamage ad ON s.ShipID = ad.ShipID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND s.ShippingLineID = 0
        GROUP BY s.ShipID
        HAVING SUM(ad.Damage) > 0
        ORDER BY ArmorDamage DESC
      `)
      return rows.map((r) => ({
        shipId: r.ShipID,
        shipName: r.ShipName,
        fleetName: r.FleetName,
        armorDamage: r.ArmorDamage,
        armorThickness: r.ArmourThickness,
        thinnestLayer: r.ThinnestLayer,
      }))
    } catch {
      return []
    }
  }

  async getLowMoraleShips(): Promise<LowMoraleShipData[]> {
    try {
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        CrewMorale: number
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName, s.CrewMorale
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND s.ShippingLineID = 0
          AND s.CrewMorale < 1
        ORDER BY s.CrewMorale ASC
      `)
      return rows.map((r) => ({
        shipId: r.ShipID,
        shipName: r.ShipName,
        fleetName: r.FleetName,
        morale: r.CrewMorale,
      }))
    } catch {
      return []
    }
  }

  async getLowMaintenanceShips(): Promise<LowMaintenanceShipData[]> {
    try {
      // CASE WHEN for supply level calculation in SQL
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        CurrentMaintSupplies: number
        MaintSupplies: number
        MinimumSupplies: number
        SupplyLevel: number
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName,
          s.CurrentMaintSupplies, sc.MaintSupplies, sc.MinimumSupplies,
          CASE
            WHEN sc.SupplyShip = 1 AND sc.MinimumSupplies > 0
            THEN MIN(1.0, CAST(s.CurrentMaintSupplies AS REAL) / sc.MinimumSupplies)
            WHEN sc.MaintSupplies > 0
            THEN MIN(1.0, CAST(s.CurrentMaintSupplies AS REAL) / sc.MaintSupplies)
            ELSE 0.0
          END as SupplyLevel
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        LEFT JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND s.ShippingLineID = 0
          AND sc.MaintSupplies > 0
          AND SupplyLevel < 1
        ORDER BY SupplyLevel ASC
      `)
      return rows.map((r) => ({
        shipId: r.ShipID,
        shipName: r.ShipName,
        fleetName: r.FleetName,
        currentSupplies: r.CurrentMaintSupplies,
        requiredSupplies: r.MaintSupplies,
        supplyLevel: r.SupplyLevel,
      }))
    } catch {
      return []
    }
  }

  async getMisconfiguredSupplyClasses(): Promise<MisconfiguredSupplyClassData[]> {
    try {
      const rows = await this.query<{
        ShipClassID: number
        ClassName: string
      }>(`
        SELECT sc.ShipClassID, sc.ClassName
        FROM FCT_ShipClass sc
        WHERE sc.GameID = ${this.gameId} AND sc.RaceID = ${this.raceId}
          AND sc.SupplyShip = 1
          AND sc.MaintSupplies > 0
          AND sc.MinimumSupplies = 0
          AND sc.ClassShippingLineID = 0
      `)
      return rows.map((r) => ({
        shipClassId: r.ShipClassID,
        className: r.ClassName,
      }))
    } catch {
      return []
    }
  }

  async getMisconfiguredTankerClasses(): Promise<MisconfiguredTankerClassData[]> {
    try {
      const rows = await this.query<{
        ShipClassID: number
        ClassName: string
      }>(`
        SELECT sc.ShipClassID, sc.ClassName
        FROM FCT_ShipClass sc
        WHERE sc.GameID = ${this.gameId} AND sc.RaceID = ${this.raceId}
          AND sc.ClassShippingLineID = 0
          AND sc.FuelTanker = 1
          AND sc.FuelCapacity > 0
          AND sc.MinimumFuel = 0
          AND sc.EnginePower > 0
      `)
      return rows.map((r) => ({
        shipClassId: r.ShipClassID,
        className: r.ClassName,
      }))
    } catch {
      return []
    }
  }

  async getObsoleteShips(): Promise<ObsoleteShipData[]> {
    try {
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        ClassName: string
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName, sc.ClassName
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        LEFT JOIN FCT_ShipClass sc ON s.ShipClassID = sc.ShipClassID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND s.ShippingLineID = 0
          AND sc.Obsolete = 1
        ORDER BY sc.ClassName ASC
      `)
      return rows.map((r) => ({
        shipId: r.ShipID,
        shipName: r.ShipName,
        fleetName: r.FleetName,
        className: r.ClassName,
      }))
    } catch {
      return []
    }
  }

  async getFullyTrainedShips(): Promise<FullyTrainedShipData[]> {
    try {
      // join through DIM_NavalAdminCommandType.Description = 'Training'
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName
        FROM FCT_Ship s
        LEFT JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        LEFT JOIN FCT_NavalAdminCommand nac ON f.ParentCommandID = nac.NavalAdminCommandID
        LEFT JOIN DIM_NavalAdminCommandType nact ON nac.AdminCommandTypeID = nact.CommandTypeID
        WHERE s.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND nact.Description = 'Training'
          AND s.TFPoints = 500
        ORDER BY f.FleetName ASC
      `)
      return rows.map((r) => ({
        shipId: r.ShipID,
        shipName: r.ShipName,
        fleetName: r.FleetName,
      }))
    } catch {
      return []
    }
  }

  async getActiveFireControls(): Promise<ActiveFireControlData[]> {
    try {
      const rows = await this.query<{
        ShipID: number
        ShipName: string
        FleetName: string
        FCName: string
      }>(`
        SELECT s.ShipID, s.ShipName, f.FleetName,
          COALESCE(sdc.Name, 'Fire Control #' || fca.FCNum) as FCName
        FROM FCT_FireControlAssignment fca
        JOIN FCT_Ship s ON fca.ShipID = s.ShipID
        JOIN FCT_Fleet f ON s.FleetID = f.FleetID
        LEFT JOIN FCT_ShipDesignComponents sdc ON fca.FCTypeID = sdc.SDComponentID
        WHERE fca.GameID = ${this.gameId} AND s.RaceID = ${this.raceId}
          AND fca.OpenFire = 1
        ORDER BY s.ShipName
      `)
      // Group fire controls by ship
      const map = new Map<number, { shipName: string; fleetName: string; fireControls: string[] }>()
      for (const r of rows) {
        const existing = map.get(r.ShipID)
        if (existing) {
          existing.fireControls.push(r.FCName)
        } else {
          map.set(r.ShipID, { shipName: r.ShipName, fleetName: r.FleetName, fireControls: [r.FCName] })
        }
      }
      return Array.from(map.entries()).map(([shipId, data]) => ({
        shipId,
        shipName: data.shipName,
        fleetName: data.fleetName,
        fireControls: data.fireControls,
      }))
    } catch {
      return []
    }
  }

  async getTransportNoShuttleClasses(): Promise<TransportNoShuttleData[]> {
    try {
      const rows = await this.query<{
        ShipClassID: number
        ClassName: string
        CargoCapacity: number
        ColonistCapacity: number
        TroopCapacity: number
      }>(`
        SELECT sc.ShipClassID, sc.ClassName,
          sc.CargoCapacity, sc.ColonistCapacity, sc.TroopCapacity
        FROM FCT_ShipClass sc
        WHERE sc.GameID = ${this.gameId} AND sc.RaceID = ${this.raceId}
          AND sc.Size > 10
          AND (sc.CargoCapacity > 0 OR sc.ColonistCapacity > 0)
          AND sc.CargoShuttleStrength = 0
          AND sc.Obsolete != 1
        ORDER BY sc.ClassName ASC
      `)
      return rows.map((r) => ({
        shipClassId: r.ShipClassID,
        className: r.ClassName,
        cargoCapacity: r.CargoCapacity,
        colonistCapacity: r.ColonistCapacity,
        troopCapacity: r.TroopCapacity,
      }))
    } catch {
      return []
    }
  }

  // ── Admin warnings ─────────────────────────────────────────────────

  async getCommanderlessAdmins(): Promise<CommanderlessAdminData[]> {
    try {
      // no CommandType filter, includes PopName
      const rows = await this.query<{
        NavalAdminCommandID: number
        AdminCommandName: string
        PopName: string
      }>(`
        SELECT nac.NavalAdminCommandID, nac.AdminCommandName, p.PopName
        FROM FCT_NavalAdminCommand nac
        LEFT JOIN FCT_Commander c ON nac.NavalAdminCommandID = c.CommandID
        LEFT JOIN FCT_Population p ON nac.PopulationID = p.PopulationID
        WHERE nac.GameID = ${this.gameId} AND nac.RaceID = ${this.raceId}
          AND c.CommanderID IS NULL
      `)
      return rows.map((r) => ({
        adminId: r.NavalAdminCommandID,
        adminName: r.AdminCommandName || 'Unknown',
        popName: r.PopName || '',
      }))
    } catch {
      return []
    }
  }

  async getCommanderlessSectors(): Promise<CommanderlessSectorData[]> {
    try {
      // no CommandType filter, includes PopName
      const rows = await this.query<{
        SectorCommandID: number
        SectorName: string
        PopName: string
      }>(`
        SELECT sec.SectorCommandID, sec.SectorName, p.PopName
        FROM FCT_SectorCommand sec
        LEFT JOIN FCT_Commander c ON sec.SectorCommandID = c.CommandID
        LEFT JOIN FCT_Population p ON sec.PopulationID = p.PopulationID
        WHERE sec.GameID = ${this.gameId} AND sec.RaceID = ${this.raceId}
          AND c.CommanderID IS NULL
      `)
      return rows.map((r) => ({
        sectorId: r.SectorCommandID,
        sectorName: r.SectorName || 'Unknown',
        popName: r.PopName || '',
      }))
    } catch {
      return []
    }
  }

  // ── Exploration / Contacts ──────────────────────────────────────────

  // lifepods ordered by creation time
  async getActiveLifepods(): Promise<ActiveLifepodData[]> {
    try {
      const rows = await this.query<{
        LifepodID: number
        ShipName: string
        Crew: number
        SystemName: string
        CreationTime: number
      }>(`
        SELECT lp.LifepodID, lp.ShipName, lp.Crew,
          COALESCE(rss.Name, '') as SystemName,
          lp.CreationTime
        FROM FCT_Lifepods lp
        LEFT JOIN FCT_RaceSysSurvey rss ON lp.SystemID = rss.SystemID AND lp.RaceID = rss.RaceID
        WHERE lp.GameID = ${this.gameId} AND lp.RaceID = ${this.raceId}
        ORDER BY lp.CreationTime ASC, lp.Crew DESC
      `)
      return rows.map((r) => ({
        lifepodId: r.LifepodID,
        shipName: r.ShipName || 'Unknown',
        crew: r.Crew,
        systemName: r.SystemName || '',
        creationTime: r.CreationTime,
      }))
    } catch {
      return []
    }
  }

  // wrecks in explored (surveyed) systems
  async getKnownWrecks(): Promise<KnownWreckData[]> {
    try {
      const rows = await this.query<{
        WreckID: number
        ClassName: string
        Size: number
        SystemName: string
        Owned: number
      }>(`
        SELECT w.WreckID, COALESCE(sc.ClassName, '') as ClassName, w.Size,
          rss.Name as SystemName,
          CASE WHEN w.RaceID = ${this.raceId} THEN 1 ELSE 0 END as Owned
        FROM FCT_Wrecks w
        JOIN FCT_RaceSysSurvey rss ON w.SystemID = rss.SystemID AND rss.RaceID = ${this.raceId}
        LEFT JOIN FCT_ShipClass sc ON w.ClassID = sc.ShipClassID
        WHERE w.GameID = ${this.gameId}
      `)
      return rows.map((r) => ({
        wreckId: r.WreckID,
        className: r.ClassName || 'Unknown',
        size: r.Size,
        systemName: r.SystemName || '',
        owned: r.Owned === 1,
      }))
    } catch {
      return []
    }
  }

  // Simplified from Electrons ORM: ancient constructs needing attention
  async getUnexploitedConstructs(): Promise<UnexploitedConstructData[]> {
    try {
      const rows = await this.query<{
        AncientConstructID: number
        SystemBodyName: string
        SystemName: string
        ResearchFieldName: string
        ResearchBonus: number
        Active: number
        HasPop: number
      }>(`
        SELECT ac.AncientConstructID,
          COALESCE(sbn.Name, 'Body ' || sb.SystemBodyID) as SystemBodyName,
          COALESCE(rss.Name, '') as SystemName,
          COALESCE(rf.Name, '') as ResearchFieldName,
          ac.ResearchBonus, ac.Active,
          CASE WHEN p.PopulationID IS NOT NULL AND p.Population > 10 THEN 1 ELSE 0 END as HasPop
        FROM FCT_AncientConstruct ac
        LEFT JOIN FCT_SystemBody sb ON ac.SystemBodyID = sb.SystemBodyID
        LEFT JOIN FCT_SystemBodyName sbn ON sb.SystemBodyID = sbn.SystemBodyID AND sbn.RaceID = ${this.raceId}
        LEFT JOIN FCT_RaceSysSurvey rss ON sb.SystemID = rss.SystemID AND rss.RaceID = ${this.raceId}
        LEFT JOIN DIM_ResearchField rf ON ac.ResearchField = rf.ResearchFieldID
        LEFT JOIN FCT_Population p ON ac.SystemBodyID = p.SystemBodyID
          AND p.GameID = ${this.gameId} AND p.RaceID = ${this.raceId} AND p.Population > 10
        WHERE ac.GameID = ${this.gameId}
          AND (ac.Active = 0 OR p.PopulationID IS NULL)
      `)
      return rows.map((r) => ({
        constructId: r.AncientConstructID,
        systemBodyName: r.SystemBodyName || '',
        systemName: r.SystemName || '',
        researchField: r.ResearchFieldName || '',
        researchBonus: r.ResearchBonus,
        active: r.Active === 1,
        hasPopulation: r.HasPop === 1,
      }))
    } catch {
      return []
    }
  }

  // rifts in systems with our fleets or populations
  async getDangerousRifts(): Promise<DangerousRiftData[]> {
    try {
      const rows = await this.query<{
        SystemName: string
        Diameter: number
        FleetCount: number
        PopCount: number
      }>(`
        SELECT rss.Name as SystemName, ar.Diameter,
          COALESCE(fc.FleetCount, 0) as FleetCount,
          COALESCE(pc.PopCount, 0) as PopCount
        FROM FCT_AetherRift ar
        JOIN FCT_RaceSysSurvey rss ON ar.SystemID = rss.SystemID AND rss.RaceID = ${this.raceId}
        LEFT JOIN (
          SELECT SystemID, COUNT(*) as FleetCount
          FROM FCT_Fleet
          WHERE GameID = ${this.gameId} AND RaceID = ${this.raceId}
          GROUP BY SystemID
        ) fc ON ar.SystemID = fc.SystemID
        LEFT JOIN (
          SELECT SystemID, COUNT(*) as PopCount
          FROM FCT_Population
          WHERE GameID = ${this.gameId} AND RaceID = ${this.raceId} AND Population > 0
          GROUP BY SystemID
        ) pc ON ar.SystemID = pc.SystemID
        WHERE ar.GameID = ${this.gameId}
          AND (COALESCE(fc.FleetCount, 0) > 0 OR COALESCE(pc.PopCount, 0) > 0)
        ORDER BY ar.Diameter DESC
      `)
      return rows.map((r) => ({
        systemName: r.SystemName || '',
        diameter: r.Diameter,
        fleetCount: r.FleetCount,
        populationCount: r.PopCount,
      }))
    } catch {
      return []
    }
  }

  // contacts grouped by system and race
  // ContactType: 1=Ship, 3=Salvo, 4=Population, 12=GroundUnit, 14=GroundUnit, 16=Shipyard
  async getIntruders(): Promise<IntruderData[]> {
    try {
      const rows = await this.query<{
        SystemName: string
        AlienRaceName: string
        ContactType: number
        ContactCount: number
        ContactStatus: number
      }>(`
        SELECT rss.Name as SystemName,
          COALESCE(ar.AlienRaceName, 'Unknown') as AlienRaceName,
          c.ContactType, COUNT(*) as ContactCount,
          COALESCE(ar.ContactStatus, 0) as ContactStatus
        FROM FCT_Contacts c
        JOIN FCT_RaceSysSurvey rss ON c.SystemID = rss.SystemID AND rss.RaceID = ${this.raceId}
        LEFT JOIN FCT_AlienRace ar ON c.ContactRaceID = ar.RaceID
          AND ar.ViewRaceID = ${this.raceId} AND ar.GameID = ${this.gameId}
        WHERE c.GameID = ${this.gameId} AND c.DetectRaceID = ${this.raceId}
          AND c.ContactType IN (1, 3, 4, 12, 14, 16)
          AND COALESCE(ar.ContactStatus, 0) NOT IN (2, 3)
        GROUP BY c.SystemID, c.ContactRaceID, c.ContactType
        ORDER BY rss.Name
      `)
      const typeNames: Record<number, string> = {
        1: 'Ship', 3: 'Salvo', 4: 'Population', 12: 'Ground Unit', 14: 'Ground Unit', 16: 'Shipyard',
      }
      return rows.map((r) => ({
        systemName: r.SystemName || '',
        raceName: r.AlienRaceName,
        contactType: typeNames[r.ContactType] ?? 'Other',
        count: r.ContactCount,
        hostile: r.ContactStatus === 0,
      }))
    } catch {
      return []
    }
  }
}
