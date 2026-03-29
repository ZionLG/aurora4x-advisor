import type { QueryFn, GameCtx } from './types'

// DIM tables can't be queried via bridge - hardcode from DIM_AtmosphericGas
const ATMOS_GAS_NAMES: Record<number, string> = {
  1: 'Hydrogen',
  2: 'Helium',
  3: 'Nitrogen',
  4: 'Oxygen',
  5: 'Water Vapour',
  6: 'Carbon Dioxide',
  7: 'Methane',
  8: 'Ammonia',
  9: 'Chlorine',
  10: 'Fluorine',
  11: 'Bromine',
  12: 'Sulphur Dioxide',
  13: 'Nitrogen Dioxide',
  14: 'Hydrogen Sulphide',
  15: 'Carbon Monoxide',
  16: 'Neon',
  17: 'Argon',
  18: 'Aether',
  19: 'Boron',
  20: 'Ozone'
}

// Dangerous levels (atm) from DIM_AtmosphericGas - 0 means no danger
const DANGEROUS_LEVELS: Record<number, number> = {
  1: 0, // Hydrogen
  2: 0, // Helium
  3: 0, // Nitrogen
  4: 0.3, // Oxygen (toxic above 0.3 atm)
  5: 0, // Water Vapour
  6: 0, // Carbon Dioxide (GH gas, not directly toxic in Aurora)
  7: 0, // Methane
  8: 0.001, // Ammonia
  9: 0.001, // Chlorine
  10: 0.001, // Fluorine
  11: 0.001, // Bromine
  12: 0.001, // Sulphur Dioxide
  13: 0.001, // Nitrogen Dioxide
  14: 0.001, // Hydrogen Sulphide
  15: 0.001, // Carbon Monoxide
  16: 0, // Neon
  17: 0, // Argon
  18: 0, // Aether
  19: 0.001, // Boron
  20: 0.001 // Ozone
}

// Gas giant BodyClass values to exclude
const GAS_GIANT_CLASSES = new Set([7, 8, 9, 10])

export interface BodyHabitability {
  systemBodyId: number
  bodyName: string
  systemName: string
  gravity: number
  temperature: number
  pressure: number
  breathableAtmosphere: boolean
  habitabilityScore: number // 0-100
  issues: string[] // what's wrong (too hot, no atmosphere, etc.)
  hasPopulation: boolean
  populationName: string | null
  terraformStatus: number // 0 = not terraforming
}

export interface SpeciesRequirements {
  speciesName: string
  breatheGasId: number
  idealTemperature: number
  temperatureTolerance: number
  idealGravity: number
  gravityTolerance: number
  maxPressure: number
}

export async function getSpeciesRequirements(
  query: QueryFn,
  ctx: GameCtx
): Promise<SpeciesRequirements> {
  const rows = await query<{
    SpeciesName: string
    BreatheID: number
    Temperature: number
    TempDev: number
    Gravity: number
    GravDev: number
    PressMax: number
  }>(
    `SELECT s.SpeciesName, s.BreatheID, s.Temperature, s.TempDev,
      s.Gravity, s.GravDev, s.PressMax
    FROM FCT_Species s
    JOIN FCT_Race r ON s.SpeciesID = r.SpeciesID AND s.GameID = r.GameID
    WHERE s.GameID = ${ctx.gameId} AND r.RaceID = ${ctx.raceId} AND r.NPR = 0`
  )

  if (rows.length === 0) {
    return {
      speciesName: 'Unknown',
      breatheGasId: 4, // Oxygen
      idealTemperature: 14,
      temperatureTolerance: 22,
      idealGravity: 1.0,
      gravityTolerance: 0.5,
      maxPressure: 4.0
    }
  }

  const s = rows[0]
  return {
    speciesName: s.SpeciesName,
    breatheGasId: s.BreatheID,
    idealTemperature: s.Temperature,
    temperatureTolerance: s.TempDev,
    idealGravity: s.Gravity,
    gravityTolerance: s.GravDev,
    maxPressure: s.PressMax
  }
}

export async function getHabitability(
  query: QueryFn,
  ctx: GameCtx
): Promise<BodyHabitability[]> {
  const species = await getSpeciesRequirements(query, ctx)

  // Query bodies in surveyed systems, excluding gas giants
  const bodies = await query<{
    SystemBodyID: number
    SystemID: number
    Name: string
    BodyClass: number
    Gravity: number
    SurfaceTemp: number
    AtmosPress: number
    HydroExt: number
    HydroID: number
  }>(
    `SELECT sb.SystemBodyID, sb.SystemID, sb.Name, sb.BodyClass,
      sb.Gravity, sb.SurfaceTemp, sb.AtmosPress, sb.HydroExt, sb.HydroID
    FROM FCT_SystemBody sb
    JOIN FCT_RaceSysSurvey rss ON sb.SystemID = rss.SystemID
      AND rss.GameID = ${ctx.gameId} AND rss.RaceID = ${ctx.raceId}
    WHERE sb.GameID = ${ctx.gameId}
    ORDER BY sb.SystemID, sb.Name`
  )

  // Get system names
  const systems = await query<{ SystemID: number; Name: string }>(
    `SELECT SystemID, Name FROM FCT_Star
    WHERE GameID = ${ctx.gameId}
    GROUP BY SystemID`
  )
  const systemNames = new Map<number, string>()
  for (const sys of systems) {
    systemNames.set(sys.SystemID, sys.Name)
  }

  // Get atmospheric gases for all bodies in one query
  const gases = await query<{
    SystemBodyID: number
    AtmosGasID: number
    AtmosGasAmount: number
    GasAtm: number
  }>(
    `SELECT ag.SystemBodyID, ag.AtmosGasID, ag.AtmosGasAmount, ag.GasAtm
    FROM FCT_AtmosphericGas ag
    WHERE ag.GameID = ${ctx.gameId}`
  )
  const gasByBody = new Map<number, { gasId: number; amount: number; atm: number }[]>()
  for (const g of gases) {
    if (!gasByBody.has(g.SystemBodyID)) gasByBody.set(g.SystemBodyID, [])
    gasByBody.get(g.SystemBodyID)!.push({
      gasId: g.AtmosGasID,
      amount: g.AtmosGasAmount,
      atm: g.GasAtm
    })
  }

  // Get populations on bodies
  const populations = await query<{
    SystemBodyID: number
    PopName: string
    TerraformStatus: number
  }>(
    `SELECT p.SystemBodyID, p.PopName, p.TerraformStatus
    FROM FCT_Population p
    WHERE p.GameID = ${ctx.gameId} AND p.RaceID = ${ctx.raceId}`
  )
  const popByBody = new Map<number, { name: string; terraformStatus: number }>()
  for (const p of populations) {
    popByBody.set(p.SystemBodyID, { name: p.PopName, terraformStatus: p.TerraformStatus })
  }

  const results: BodyHabitability[] = []

  for (const body of bodies) {
    if (GAS_GIANT_CLASSES.has(body.BodyClass)) continue

    const issues: string[] = []
    let score = 100

    const gravity = body.Gravity
    const temperature = body.SurfaceTemp
    const pressure = body.AtmosPress

    // --- Temperature scoring ---
    const tempMin = species.idealTemperature - species.temperatureTolerance
    const tempMax = species.idealTemperature + species.temperatureTolerance
    if (temperature < tempMin) {
      const diff = tempMin - temperature
      if (diff > 100) {
        score -= 30
        issues.push(`Extremely cold (${Math.round(temperature)}°C, need >${Math.round(tempMin)}°C)`)
      } else if (diff > 30) {
        score -= 20
        issues.push(`Too cold (${Math.round(temperature)}°C, need >${Math.round(tempMin)}°C)`)
      } else {
        score -= 10
        issues.push(`Slightly cold (${Math.round(temperature)}°C, need >${Math.round(tempMin)}°C)`)
      }
    } else if (temperature > tempMax) {
      const diff = temperature - tempMax
      if (diff > 100) {
        score -= 30
        issues.push(`Extremely hot (${Math.round(temperature)}°C, need <${Math.round(tempMax)}°C)`)
      } else if (diff > 30) {
        score -= 20
        issues.push(`Too hot (${Math.round(temperature)}°C, need <${Math.round(tempMax)}°C)`)
      } else {
        score -= 10
        issues.push(`Slightly hot (${Math.round(temperature)}°C, need <${Math.round(tempMax)}°C)`)
      }
    }

    // --- Gravity scoring ---
    const gravMin = species.idealGravity - species.gravityTolerance
    const gravMax = species.idealGravity + species.gravityTolerance
    if (gravity < Math.max(0, gravMin)) {
      const diff = gravMin - gravity
      if (diff > 1.0) {
        score -= 20
        issues.push(`Gravity far too low (${gravity.toFixed(2)}g)`)
      } else {
        score -= 10
        issues.push(`Low gravity (${gravity.toFixed(2)}g, need >${gravMin.toFixed(2)}g)`)
      }
    } else if (gravity > gravMax) {
      const diff = gravity - gravMax
      if (diff > 1.0) {
        score -= 20
        issues.push(`Gravity far too high (${gravity.toFixed(2)}g)`)
      } else {
        score -= 10
        issues.push(`High gravity (${gravity.toFixed(2)}g, need <${gravMax.toFixed(2)}g)`)
      }
    }

    // --- Atmospheric pressure scoring ---
    if (pressure <= 0) {
      score -= 15
      issues.push('No atmosphere')
    } else if (pressure > species.maxPressure) {
      score -= 15
      issues.push(`Pressure too high (${pressure.toFixed(2)} atm, max ${species.maxPressure.toFixed(2)} atm)`)
    }

    // --- Breathable atmosphere check ---
    const bodyGases = gasByBody.get(body.SystemBodyID) || []
    const breatheGas = bodyGases.find((g) => g.gasId === species.breatheGasId)
    let breathableAtmosphere = false

    if (pressure > 0 && breatheGas && breatheGas.atm > 0) {
      breathableAtmosphere = true

      // Check for dangerous gases
      for (const g of bodyGases) {
        const dangerLevel = DANGEROUS_LEVELS[g.gasId]
        if (dangerLevel && dangerLevel > 0 && g.atm > dangerLevel) {
          // The species' own breathe gas can be toxic at high levels too (e.g. O2 > 0.3 atm)
          breathableAtmosphere = false
          const gasName = ATMOS_GAS_NAMES[g.gasId] || `Gas ${g.gasId}`
          issues.push(`Dangerous ${gasName} level (${g.atm.toFixed(3)} atm)`)
          score -= 10
        }
      }
    }

    if (!breathableAtmosphere) {
      if (pressure > 0 && !breatheGas) {
        const breatheGasName = ATMOS_GAS_NAMES[species.breatheGasId] || `Gas ${species.breatheGasId}`
        issues.push(`No ${breatheGasName} in atmosphere`)
      }
      score -= 15
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score))

    const pop = popByBody.get(body.SystemBodyID)
    const systemName = systemNames.get(body.SystemID) || `System ${body.SystemID}`

    results.push({
      systemBodyId: body.SystemBodyID,
      bodyName: body.Name,
      systemName,
      gravity,
      temperature,
      pressure,
      breathableAtmosphere,
      habitabilityScore: score,
      issues,
      hasPopulation: !!pop,
      populationName: pop?.name ?? null,
      terraformStatus: pop?.terraformStatus ?? 0
    })
  }

  // Sort by habitability score descending
  results.sort((a, b) => b.habitabilityScore - a.habitabilityScore)

  return results
}
