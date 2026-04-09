import type { QueryFn } from '../compute/types'
import type { SpeciesRequirements, AtmosphericGas, BodyHabitability, HabitabilityData } from './types'
import { makeTerraformPlan } from './terraform'

const EARTH_SURFACE_AREA = 510064472
const BASE_MAX_POP = 10000 // millions

export async function fetchHabitability(
  query: QueryFn,
  gameId: number,
  raceId: number,
  speciesId: number,
  terraformers = 10
): Promise<HabitabilityData> {
  const species = await fetchSpecies(query, gameId, raceId)
  if (speciesId <= 0) return { species, bodies: [] }
  const bodies = await fetchBodies(query, gameId, raceId, speciesId, species, terraformers)
  return { species, bodies }
}

async function fetchSpecies(query: QueryFn, gameId: number, raceId: number): Promise<SpeciesRequirements[]> {
  const rows = await query<{
    SpeciesID: number
    SpeciesName: string
    TerraformingRate: number
    BreatheID: number
    BreatheName: string
    IdealBreathePressure: number
    BreathePressureDeviation: number
    MaximumPressure: number
    IdealTemperature: number
    TemperatureDeviation: number
    IdealGravity: number
    GravityDeviation: number
    PopulationDensityModifier: number
    ColonizationSkill: number
    TotalPopulation: number
  }>(`
    SELECT p.SpeciesID, s.SpeciesName,
      r.TerraformingRate, COALESCE(r.ColonizationSkill, 1) as ColonizationSkill,
      s.BreatheID, COALESCE(g.Name, '') as BreatheName,
      s.Oxygen as IdealBreathePressure, s.OxyDev as BreathePressureDeviation,
      s.PressMax as MaximumPressure,
      s.Temperature as IdealTemperature, s.TempDev as TemperatureDeviation,
      s.Gravity as IdealGravity, s.GravDev as GravityDeviation,
      s.PopulationDensityModifier,
      SUM(p.Population) as TotalPopulation
    FROM FCT_Population p
    JOIN FCT_Race r ON p.RaceID = r.RaceID AND r.GameID = ${gameId}
    JOIN FCT_Species s ON p.SpeciesID = s.SpeciesID
    LEFT JOIN DIM_Gases g ON s.BreatheID = g.GasID
    WHERE p.GameID = ${gameId} AND p.RaceID = ${raceId}
    GROUP BY p.SpeciesID
  `)
  return rows.map((r) => ({
    speciesId: r.SpeciesID,
    speciesName: r.SpeciesName,
    breatheGasId: r.BreatheID,
    breatheGasName: r.BreatheName,
    idealPressure: r.IdealBreathePressure,
    pressureDeviation: r.BreathePressureDeviation,
    maxPressure: r.MaximumPressure,
    idealTemperature: r.IdealTemperature,
    temperatureDeviation: r.TemperatureDeviation,
    idealGravity: r.IdealGravity,
    gravityDeviation: r.GravityDeviation,
    populationDensityModifier: r.PopulationDensityModifier,
    terraformingRate: r.TerraformingRate,
    colonizationSkill: r.ColonizationSkill ?? 1,
    totalPopulation: r.TotalPopulation ?? 0,
  }))
}

async function fetchBodies(
  query: QueryFn,
  gameId: number,
  raceId: number,
  speciesId: number,
  speciesList: SpeciesRequirements[],
  terraformers: number
): Promise<BodyHabitability[]> {
  const bodyRows = await query<{
    SystemBodyID: number
    SystemName: string
    SystemBodyName: string
    BodyClass: number
    PlanetNumber: number
    OrbitNumber: number
    Component: number
    Radius: number
    Gravity: number
    BaseTemp: number
    SurfaceTemp: number
    AtmosPress: number
    HydroID: number
    HydroExt: number
    Albedo: number
    TidalLock: number
    RadiationLevel: number
    DustLevel: number
    GroundMineralSurvey: number
    OrbitalDistance: number
    Eccentricity: number
    ParentOrbitalDistance: number
    ParentEccentricity: number
    BodySurveyed: number
    PopulationID: number | null
    Population: number | null
  }>(`
    SELECT sb.SystemBodyID,
      COALESCE(rss.Name, '') as SystemName,
      COALESCE(sbn.Name, '') as SystemBodyName,
      sb.BodyClass, sb.PlanetNumber, sb.OrbitNumber,
      COALESCE(st.Component, 0) as Component,
      sb.Radius, sb.Gravity, sb.BaseTemp, sb.SurfaceTemp,
      COALESCE(sb.AtmosPress, 0) as AtmosPress,
      sb.HydroID, COALESCE(sb.HydroExt, 0) as HydroExt,
      COALESCE(sb.Albedo, 1) as Albedo,
      COALESCE(sb.TidalLock, 0) as TidalLock,
      COALESCE(sb.RadiationLevel, 0) as RadiationLevel,
      COALESCE(sb.DustLevel, 0) as DustLevel,
      COALESCE(sb.GroundMineralSurvey, 0) as GroundMineralSurvey,
      COALESCE(sb.OrbitalDistance, 0) as OrbitalDistance,
      COALESCE(sb.Eccentricity, 0) as Eccentricity,
      COALESCE(pb.OrbitalDistance, 0) as ParentOrbitalDistance,
      COALESCE(pb.Eccentricity, 0) as ParentEccentricity,
      CASE WHEN sbs.SystemBodyID IS NOT NULL THEN 1 ELSE 0 END as BodySurveyed,
      p.PopulationID, p.Population
    FROM FCT_SystemBody sb
    LEFT JOIN FCT_SystemBodyName sbn ON sb.SystemBodyID = sbn.SystemBodyID AND sbn.RaceID = ${raceId}
    LEFT JOIN FCT_RaceSysSurvey rss ON sb.SystemID = rss.SystemID AND rss.RaceID = ${raceId} AND rss.GameID = ${gameId}
    LEFT JOIN FCT_Star st ON sb.StarID = st.StarID
    LEFT JOIN FCT_SystemBodySurveys sbs ON sb.SystemBodyID = sbs.SystemBodyID AND sbs.RaceID = ${raceId} AND sbs.GameID = ${gameId}
    LEFT JOIN FCT_Population p ON sb.SystemBodyID = p.SystemBodyID AND p.GameID = ${gameId} AND p.RaceID = ${raceId}
    LEFT JOIN FCT_SystemBody pb ON sb.ParentBodyID = pb.SystemBodyID AND sb.ParentBodyType = 1
    WHERE sb.BodyClass IN (1, 2, 3, 5)
      AND sb.BodyTypeID NOT IN (0, 4, 5)
      AND sb.GameID = ${gameId}
      AND rss.RaceID = ${raceId}
    ORDER BY rss.Name, sb.PlanetNumber, sb.OrbitNumber
  `)

  // Fetch atmospheric gases for all bodies
  const gasRows = await query<{
    SystemBodyID: number
    AtmosGasID: number
    GasName: string
    AtmosGasAmount: number
    GasAtm: number
    FrozenOut: number
    BoilingPoint: number
    GHGas: number
    AntiGHGas: number
    Dangerous: number
    DangerousLevel: number
  }>(`
    SELECT ag.SystemBodyID, ag.AtmosGasID,
      COALESCE(g.Name, '') as GasName,
      ag.AtmosGasAmount, ag.GasAtm,
      COALESCE(ag.FrozenOut, 0) as FrozenOut,
      COALESCE(g.BoilingPoint, 0) as BoilingPoint,
      COALESCE(g.GHGas, 0) as GHGas,
      COALESCE(g.AntiGHGas, 0) as AntiGHGas,
      COALESCE(g.Dangerous, 0) as Dangerous,
      COALESCE(g.DangerousLevel, 0) as DangerousLevel
    FROM FCT_AtmosphericGas ag
    LEFT JOIN DIM_Gases g ON ag.AtmosGasID = g.GasID
    WHERE ag.SystemBodyID IN (
      SELECT sb2.SystemBodyID FROM FCT_SystemBody sb2
      JOIN FCT_RaceSysSurvey rss2 ON sb2.SystemID = rss2.SystemID AND rss2.RaceID = ${raceId} AND rss2.GameID = ${gameId}
      WHERE sb2.BodyClass IN (1, 2, 3, 5) AND sb2.BodyTypeID NOT IN (0, 4, 5) AND sb2.GameID = ${gameId}
    )
    AND ag.GameID = ${gameId}
  `)

  // Fetch mineral data for mining potential
  const mineralRows = await query<{
    SystemBodyID: number
    Amount: number
    Accessibility: number
  }>(`
    SELECT md.SystemBodyID, md.Amount, md.Accessibility
    FROM FCT_MineralDeposit md
    WHERE md.GameID = ${gameId}
  `)

  // Group gases by body
  const gasMap = new Map<number, AtmosphericGas[]>()
  for (const g of gasRows) {
    const gases = gasMap.get(g.SystemBodyID) ?? []
    gases.push({
      gasId: g.AtmosGasID,
      gasName: g.GasName,
      amount: g.AtmosGasAmount,
      atm: g.GasAtm,
      frozenOut: g.FrozenOut === 1,
      boilingPoint: g.BoilingPoint,
      isGreenhouse: g.GHGas === 1,
      isAntiGreenhouse: g.AntiGHGas === 1,
      isDangerous: g.Dangerous > 0,
      dangerousRating: g.Dangerous,
      dangerousLevel: g.DangerousLevel,
    })
    gasMap.set(g.SystemBodyID, gases)
  }

  // Group minerals by body for potential calc
  const mineralMap = new Map<number, Array<{ amount: number; accessibility: number }>>()
  for (const m of mineralRows) {
    const minerals = mineralMap.get(m.SystemBodyID) ?? []
    minerals.push({ amount: m.Amount, accessibility: m.Accessibility })
    mineralMap.set(m.SystemBodyID, minerals)
  }

  // Get species for colony cost calc
  const speciesRows = await query<{
    BreatheID: number
    Oxygen: number
    OxyDev: number
    PressMax: number
    Temperature: number
    TempDev: number
    Gravity: number
    GravDev: number
    PopulationDensityModifier: number
  }>(`SELECT BreatheID, Oxygen, OxyDev, PressMax, Temperature, TempDev, Gravity, GravDev, PopulationDensityModifier FROM FCT_Species WHERE SpeciesID = ${speciesId}`)

  const sp = speciesRows[0]
  const selectedSp = speciesList.find((s) => s.speciesId === speciesId)

  const maxGravity = sp ? sp.Gravity + sp.GravDev : Infinity

  return bodyRows.filter((row) => row.Gravity <= maxGravity).map((row) => {
    const gases = gasMap.get(row.SystemBodyID) ?? []
    const minerals = mineralMap.get(row.SystemBodyID) ?? []

    const colonizationSkill = selectedSp?.colonizationSkill ?? 1
    const colonyCost = sp ? calculateColonyCost(row, gases, sp) * colonizationSkill : 0
    const maxPop = sp ? calculateMaxPop(row, sp.PopulationDensityModifier) : 0

    let potential = 0
    let totalMinerals = 0
    for (const { amount, accessibility } of minerals) {
      const exponent = Math.cos((Math.PI / 2) * accessibility - Math.PI / 2)
      const weight = 0.5 - Math.cos(Math.PI * accessibility) / 2
      potential += Math.atan(Math.pow(amount / 20000, exponent) * weight)
      totalMinerals += amount
    }
    const miningPotential = minerals.length > 0
      ? (potential * 10) / ((Math.PI / 2) * minerals.length)
      : 0

    // Terraforming plan
    const isMoon = row.BodyClass === 3
    let tfTime = -1
    let terraformable = 'No'
    let terraformPlan: BodyHabitability['terraformPlan'] = null

    if (colonyCost === 0) {
      terraformable = 'Done'
      tfTime = 0
    } else if (selectedSp) {
      const plan = makeTerraformPlan(
        {
          radius: row.Radius,
          bodyClass: row.BodyClass,
          baseTemp: row.BaseTemp,
          surfaceTemp: row.SurfaceTemp,
          atmosPress: row.AtmosPress,
          hydroId: row.HydroID,
          hydroExt: row.HydroExt,
          albedo: row.Albedo,
          dustLevel: row.DustLevel,
          gases,
          orbitalDistance: isMoon ? row.ParentOrbitalDistance : row.OrbitalDistance,
          eccentricity: isMoon ? row.ParentEccentricity : row.Eccentricity,
        },
        {
          breatheGasId: selectedSp.breatheGasId,
          breatheGasName: selectedSp.breatheGasName,
          idealPressure: selectedSp.idealPressure,
          pressureDeviation: selectedSp.pressureDeviation,
          maxPressure: selectedSp.maxPressure,
          idealTemperature: selectedSp.idealTemperature,
          temperatureDeviation: selectedSp.temperatureDeviation,
        },
        terraformers,
        selectedSp.terraformingRate
      )

      if (plan) {
        tfTime = Number.isFinite(plan.totalTime) ? plan.totalTime : -1
        const gravityLow = sp ? row.Gravity < (sp.Gravity - sp.GravDev) : false
        const gravityNegligible = row.Gravity < 0.1

        // Determine base status from planned colony cost
        // In full implementation this would check periapsis/apoapsis costs too
        const plannedCost = colonyCost // simplified - ideally recalc with plan targets
        if (plannedCost === 0 && !gravityLow) {
          terraformable = 'Yes'
        } else if (plannedCost === 0) {
          terraformable = 'Partial'
        } else if (plannedCost < 2) {
          terraformable = 'Near'
        } else if (plannedCost < 4) {
          terraformable = 'Limited'
        } else {
          terraformable = 'Insufficient'
        }

        // Gravity overrides
        if (gravityNegligible) {
          terraformable = 'No (LG)'
          tfTime = -1
        } else if (gravityLow) {
          if (terraformable === 'Yes') terraformable = 'Partial'
          terraformable = `${terraformable} (LG)`
        }
        terraformPlan = {
          breathableTime: plan.breathableTime,
          breathableTarget: plan.breathableTarget,
          breathableName: selectedSp.breatheGasName,
          toxicTime: plan.toxicTime,
          toxics: plan.toxicDetails,
          greenhouseTime: plan.greenhouseTime,
          greenhouseTarget: plan.greenhouseTarget,
          greenhouseName: plan.greenhouseName,
          antiGreenhouseTime: plan.antiGreenhouseTime,
          antiGreenhouseTarget: plan.antiGreenhouseTarget,
          antiGreenhouseName: plan.antiGreenhouseName,
          neutralTime: plan.neutralTime,
          neutralTarget: plan.neutralTarget,
          neutralName: plan.neutralName,
          waterVapourTime: plan.waterVapourTime,
          waterVapourTarget: plan.waterVapourTarget,
          hydroExtTime: plan.hydroExtTime,
          targetTemp: plan.targetTemp,
          targetPressure: plan.targetPressure,
          targetHydroExt: plan.targetHydroExt,
          isPartial: plan.isPartial,
          colonyCost: 0, // TODO: recalculate with target state
        }
      }
    }

    return {
      systemBodyId: row.SystemBodyID,
      systemName: row.SystemName || '',
      bodyName: row.SystemBodyName || '',
      bodyClass: row.BodyClass,
      planetNumber: row.PlanetNumber,
      orbitNumber: row.OrbitNumber,
      starComponent: row.Component,
      radius: row.Radius,
      gravity: row.Gravity,
      baseTemp: row.BaseTemp,
      surfaceTemp: row.SurfaceTemp,
      atmosPress: row.AtmosPress,
      hydroId: row.HydroID,
      hydroExt: row.HydroExt,
      tidalLock: row.TidalLock === 1,
      radiationLevel: row.RadiationLevel,
      dustLevel: row.DustLevel,
      groundSurvey: row.GroundMineralSurvey,
      surveyed: row.BodySurveyed === 1,
      colonyCost,
      lowGravity: sp ? row.Gravity < (sp.Gravity - sp.GravDev) : false,
      maxPopulation: maxPop,
      terraformable,
      terraformTime: tfTime,
      miningPotential,
      totalMinerals,
      hasColony: row.PopulationID !== null,
      population: row.Population ?? 0,
      gases,
      terraformPlan,
    }
  })
}

/**
 * Colony cost calculation — ported exactly from Electrons' colonyCosts().
 * Each factor sets a MINIMUM floor (not additive). Final cost is the highest factor.
 */
function calculateColonyCost(
  body: { SurfaceTemp: number; AtmosPress: number; Gravity: number; HydroExt: number; TidalLock: number; BodyClass: number },
  gases: AtmosphericGas[],
  species: { BreatheID: number; Oxygen: number; OxyDev: number; PressMax: number; Temperature: number; TempDev: number; Gravity: number; GravDev: number }
): number {
  const tempMin = species.Temperature - species.TempDev
  const tempMax = species.Temperature + species.TempDev

  // Dangerous gas: take the max danger rating among active dangerous gases
  let maxDangerousRating = 0
  for (const gas of gases) {
    const isFrozenOut = gas.frozenOut || (Number.isFinite(gas.boilingPoint) && body.SurfaceTemp < gas.boilingPoint)
    if (gas.dangerousRating > maxDangerousRating && gas.gasId !== species.BreatheID && !isFrozenOut) {
      const requiredPressure = gas.dangerousLevel / 10000
      if (gas.amount > requiredPressure) {
        maxDangerousRating = gas.dangerousRating
      }
    }
  }
  let cost = maxDangerousRating

  // Temperature: minimum floor
  let tempCost = 0
  if (body.SurfaceTemp < tempMin) {
    tempCost = Math.abs(tempMin - body.SurfaceTemp) / species.TempDev
  } else if (body.SurfaceTemp > tempMax) {
    tempCost = Math.abs(tempMax - body.SurfaceTemp) / species.TempDev
  }
  if (body.TidalLock && body.BodyClass !== 3) {
    tempCost /= 5
  }
  if (cost < tempCost) cost = tempCost

  // Pressure: minimum floor
  let pressureCost = 0
  if (body.AtmosPress > species.PressMax) {
    pressureCost = body.AtmosPress / species.PressMax
    if (pressureCost < 2) pressureCost = 2
  }
  if (cost < pressureCost) cost = pressureCost

  // Breathable gas: only checked if cost < 2
  if (Math.round(cost * 10000) / 10000 < 2) {
    let breathablePressure = 0
    let breathableAmount = 0
    for (const gas of gases) {
      if (gas.gasId === species.BreatheID) {
        const isFrozenOut = gas.frozenOut || (Number.isFinite(gas.boilingPoint) && body.SurfaceTemp < gas.boilingPoint)
        if (!isFrozenOut) {
          breathablePressure += gas.atm
          breathableAmount += gas.amount
        }
      }
    }
    const minBreathable = species.Oxygen - species.OxyDev
    const maxBreathable = species.Oxygen + species.OxyDev
    if (breathablePressure < minBreathable || breathablePressure > maxBreathable) {
      cost = 2
    } else if (breathableAmount > 30) {
      cost = 2
    }
  }

  // Hydrosphere: minimum floor
  if (body.HydroExt < 20) {
    const hydroCost = (20 - body.HydroExt) / 10
    if (cost < hydroCost) cost = hydroCost
  }

  // Gravity: minimum floor of 1
  const gravMin = species.Gravity - species.GravDev
  if (body.Gravity < gravMin && cost < 1) {
    cost = 1
  }

  return Math.round(cost * 10000) / 10000
}

function calculateMaxPop(
  body: { Radius: number; HydroExt: number; TidalLock: number; BodyClass: number },
  densityModifier: number
): number {
  const surfaceArea = 4 * Math.PI * body.Radius * body.Radius
  const tidalMod = body.TidalLock && body.BodyClass !== 3 ? 5 : 1
  const hydroMod = body.HydroExt > 75 ? Math.max((100 - body.HydroExt) / 25, 0.01) : 1
  const maxPop = (surfaceArea / EARTH_SURFACE_AREA) * BASE_MAX_POP * densityModifier
  return Math.max((maxPop * hydroMod) / tidalMod, 0.05)
}
