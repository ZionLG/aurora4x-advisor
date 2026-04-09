/**
 * Terraforming plan solver — ported from Aurora Electrons habitability.vue
 * Calculates what atmospheric changes are needed to make a body habitable,
 * and estimates the time required.
 */

import type { AtmosphericGas } from './types'

const EARTH_SURFACE_AREA = 511187128
const TOLERANCE = 1e-4

interface TerraformSpecies {
  breatheGasId: number
  breatheGasName: string
  idealPressure: number
  pressureDeviation: number
  maxPressure: number
  idealTemperature: number
  temperatureDeviation: number
}

interface TerraformBody {
  radius: number
  bodyClass: number
  baseTemp: number
  surfaceTemp: number
  atmosPress: number
  hydroId: number
  hydroExt: number
  albedo: number
  dustLevel: number
  gases: AtmosphericGas[]
  orbitalDistance: number
  eccentricity: number
}

export interface TerraformPlan {
  totalTime: number
  breathableTime: number
  breathableTarget: number
  toxicTime: number
  greenhouseTime: number
  greenhouseTarget: number
  greenhouseName: string
  antiGreenhouseTime: number
  antiGreenhouseTarget: number
  antiGreenhouseName: string
  neutralTime: number
  neutralTarget: number
  neutralName: string
  waterVapourTime: number
  waterVapourTarget: number
  hydroExtTime: number
  targetTemp: number
  targetPressure: number
  targetHydroExt: number
  isPartial: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function determineHydrosphere(surfaceTemp: number, totalPressure: number): number {
  if (!Number.isFinite(totalPressure) || totalPressure <= 0) return 1
  if (totalPressure < 0.006 && surfaceTemp > 245) return 1
  if (surfaceTemp > 369) return 2
  if (surfaceTemp > 245) return 3
  return 4
}

function targetWaterForState(hydroId: number, hydroExtent: number, totalPressure: number): number {
  if (!Number.isFinite(hydroExtent) || hydroExtent < 0) return 0
  if (hydroId === 3) return Math.max(totalPressure, 0) * (hydroExtent / 100) * 0.01
  return 0
}

function calculateTargetHydroExt(currentHydroExt: number, projectedHydroId: number): number {
  if (currentHydroExt < 20) return 20
  if (projectedHydroId === 3) {
    if (currentHydroExt < 50) return Math.min(60, Math.max(20, currentHydroExt + 10))
    if (currentHydroExt > 75) return 75
    return clamp(currentHydroExt, 50, 75)
  }
  if (projectedHydroId === 4) return Math.max(currentHydroExt, 20)
  if (projectedHydroId === 2) return Math.min(100, Math.max(20, currentHydroExt + 10))
  return Math.max(currentHydroExt, 20)
}

function adjustAlbedoForHydrosphere(baseAlbedo: number, previousHydroId: number, predictedHydroId: number, hydroExtent: number): number {
  if (predictedHydroId === previousHydroId) return baseAlbedo
  let adjusted = baseAlbedo
  if (previousHydroId !== 4) {
    if (predictedHydroId === 4) adjusted -= hydroExtent * 0.0015
  } else {
    adjusted += hydroExtent * 0.0015
  }
  if (!Number.isFinite(adjusted) || adjusted <= 0) return baseAlbedo
  return adjusted
}

function computeAtmosphereMultipliers(totalPressure: number, greenhousePressure: number, antiPressure: number, dustTerm: number) {
  const safeTotal = Math.max(totalPressure, 0)
  let greenhouseMultiplier = 1 + safeTotal / 10 + Math.max(greenhousePressure, 0)
  if (greenhouseMultiplier > 3) greenhouseMultiplier = 3
  let antiMultiplier = 1 + Math.max(dustTerm, 0) + Math.max(antiPressure, 0)
  if (antiMultiplier > 3) antiMultiplier = 3
  return { greenhouseMultiplier, antiMultiplier }
}

function computeSwingRatios(distance: number, eccentricity: number) {
  let low = 1
  let high = 1
  if (Number.isFinite(distance) && distance > 0 && Number.isFinite(eccentricity) && eccentricity > 0) {
    const apoDistance = distance * (1 + eccentricity)
    if (apoDistance > 0) low = Math.min(1, Math.sqrt(distance / apoDistance))
    const periDistance = distance * (1 - eccentricity)
    if (periDistance > 0) high = Math.max(1, Math.sqrt(distance / periDistance))
  }
  return { low, high }
}

function computeTerraformingTime(delta: number, rate: number, fallback = 0): number {
  const magnitude = Math.abs(delta)
  if (magnitude < TOLERANCE) return 0
  const effectiveRate = rate > 0 ? rate : fallback
  if (!effectiveRate || !Number.isFinite(effectiveRate)) return Infinity
  return magnitude / effectiveRate
}

export function makeTerraformPlan(
  body: TerraformBody,
  species: TerraformSpecies,
  terraformers: number,
  terraformingRate: number
): TerraformPlan | null {
  if (!body.gases) return null

  const localSurfaceArea = 4 * Math.PI * body.radius * body.radius
  const rawPower = terraformingRate * terraformers
  const localTerraformingPower = localSurfaceArea > 0 ? (EARTH_SURFACE_AREA / localSurfaceArea) * rawPower : 0
  if (!Number.isFinite(localTerraformingPower) || localTerraformingPower <= 0) return null

  const { low: lowSwingRatio, high: highSwingRatio } = computeSwingRatios(body.orbitalDistance, body.eccentricity)

  // Categorize atmospheric gases
  const summary = {
    breathablePressure: 0,
    toxicPressure: 0,
    greenhousePressure: 0,
    antiGreenhousePressure: 0,
    waterVapourPressure: 0,
    neutralPressure: 0,
    totalPressure: 0,
    greenhouses: [] as AtmosphericGas[],
    antiGreenhouses: [] as AtmosphericGas[],
    neutrals: [] as AtmosphericGas[],
    toxics: [] as AtmosphericGas[],
  }

  for (const gas of body.gases) {
    const pressure = Number.isFinite(gas.atm) ? gas.atm : 0
    summary.totalPressure += pressure
    if (gas.gasId === species.breatheGasId) {
      summary.breathablePressure += pressure
    } else if (gas.isDangerous) {
      summary.toxicPressure += pressure
      summary.toxics.push(gas)
    } else if (gas.gasId === 5) { // Water vapour
      summary.waterVapourPressure += pressure
    } else if (gas.isGreenhouse) {
      summary.greenhousePressure += pressure
      summary.greenhouses.push(gas)
    } else if (gas.isAntiGreenhouse) {
      summary.antiGreenhousePressure += pressure
      summary.antiGreenhouses.push(gas)
    } else {
      summary.neutralPressure += pressure
      summary.neutrals.push(gas)
    }
  }

  const greenhouseSideContributions = summary.greenhouses.slice(1).reduce((t, g) => t + (g.atm || 0), 0)
  const antiGreenhouseSideContributions = summary.antiGreenhouses.slice(1).reduce((t, g) => t + (g.atm || 0), 0)
  const neutralSideContributions = summary.neutrals.slice(1).reduce((t, g) => t + (g.atm || 0), 0)

  // Target breathable pressure
  const breathableRangeMin = Math.max(0, species.idealPressure - species.pressureDeviation)
  const breathableRangeMax = species.idealPressure + species.pressureDeviation
  const currentBreathable = Math.max(summary.breathablePressure, 0)
  let targetBreathable: number
  if (currentBreathable >= breathableRangeMin - TOLERANCE && currentBreathable <= breathableRangeMax + TOLERANCE) {
    targetBreathable = clamp(currentBreathable, breathableRangeMin, breathableRangeMax)
  } else {
    const distMin = Math.abs(currentBreathable - breathableRangeMin)
    const distMax = Math.abs(currentBreathable - breathableRangeMax)
    targetBreathable = distMin <= distMax ? breathableRangeMin : breathableRangeMax
  }
  targetBreathable = clamp(targetBreathable, breathableRangeMin, breathableRangeMax)

  // Temperature constraints
  const speciesMinTemp = species.idealTemperature - species.temperatureDeviation
  const speciesMaxTemp = species.idealTemperature + species.temperatureDeviation
  const minAllowedMean = speciesMinTemp / (lowSwingRatio || 1)
  const maxAllowedMean = speciesMaxTemp / (highSwingRatio || 1)

  let targetMeanTemp: number
  let isPartial = false
  if (minAllowedMean > maxAllowedMean) {
    targetMeanTemp = (minAllowedMean + maxAllowedMean) / 2
    isPartial = true
  } else {
    targetMeanTemp = clamp(species.idealTemperature, minAllowedMean, maxAllowedMean)
  }

  const dustTerm = Math.max(Number.isFinite(body.dustLevel) ? body.dustLevel : 0, 0) / 20000

  const computeRatio = (totalP: number, ghP: number, aghP: number) => {
    const { greenhouseMultiplier, antiMultiplier } = computeAtmosphereMultipliers(totalP, ghP, aghP, dustTerm)
    return greenhouseMultiplier / (antiMultiplier || 1)
  }

  const solveForAlbedo = (albedo: number) => {
    const baseRef = Math.max(body.baseTemp * albedo, 1)
    if (!Number.isFinite(baseRef) || baseRef <= 0) return null

    const targetRatio = targetMeanTemp / baseRef
    let finalWater = Math.min(Math.max(summary.waterVapourPressure, 0), species.maxPressure)
    let finalNeutralMain = Math.min(Math.max(summary.neutralPressure - neutralSideContributions, 0), Math.max(species.maxPressure - neutralSideContributions, 0))
    if (!Number.isFinite(finalNeutralMain) || finalNeutralMain < 0) finalNeutralMain = 0
    let totalNeutral = finalNeutralMain + neutralSideContributions
    let finalGreenhouse = Math.max(summary.greenhousePressure, greenhouseSideContributions)
    let finalAnti = Math.max(summary.antiGreenhousePressure, antiGreenhouseSideContributions)
    let finalTotal = Math.max(summary.totalPressure, 0)
    let finalRatio = targetRatio
    let finalSurfaceTemp = targetMeanTemp
    let projectedHydroId = body.hydroId
    let targetHydroExt = body.hydroExt

    for (let iter = 0; iter < 32; iter++) {
      const prevNeutral = finalNeutralMain
      const prevWater = finalWater

      const nonNeutral = targetBreathable + finalWater + finalGreenhouse + finalAnti
      const minNeutralTotal = Math.max(neutralSideContributions, targetBreathable > 0 ? targetBreathable / 0.3 - nonNeutral : neutralSideContributions)
      const maxNeutralTotal = Math.max(neutralSideContributions, species.maxPressure - nonNeutral)
      if (minNeutralTotal > maxNeutralTotal + TOLERANCE) return null

      const minNeutralMain = Math.max(0, minNeutralTotal - neutralSideContributions)
      const maxNeutralMain = Math.max(0, maxNeutralTotal - neutralSideContributions)
      finalNeutralMain = clamp(minNeutralMain, 0, maxNeutralMain)
      totalNeutral = finalNeutralMain + neutralSideContributions

      finalTotal = nonNeutral + totalNeutral
      finalRatio = computeRatio(finalTotal, finalGreenhouse, finalAnti)
      finalSurfaceTemp = finalRatio * baseRef
      projectedHydroId = determineHydrosphere(finalSurfaceTemp, finalTotal)
      targetHydroExt = calculateTargetHydroExt(body.hydroExt, projectedHydroId)

      const desiredWater = targetWaterForState(projectedHydroId, targetHydroExt, finalTotal)
      finalWater = Math.min(Math.max(desiredWater, 0), species.maxPressure)

      const ratioError = finalRatio - targetRatio
      if (Math.abs(ratioError) < TOLERANCE && Math.abs(finalNeutralMain - prevNeutral) < TOLERANCE && Math.abs(finalWater - prevWater) < TOLERANCE) break

      if (Math.abs(ratioError) >= TOLERANCE) {
        if (ratioError > 0) {
          const ghAdj = Math.max(finalGreenhouse - greenhouseSideContributions, 0)
          if (ghAdj > TOLERANCE) {
            const scale = targetRatio / finalRatio
            const maxGhAtm = Math.max(0, 2 - finalTotal / 10)
            finalGreenhouse = Math.min(greenhouseSideContributions + ghAdj * scale, maxGhAtm)
          } else {
            const cap = Math.max(0, species.maxPressure - finalTotal)
            if (cap <= TOLERANCE) return null
            const maxAghAtm = Math.max(0, 2 - dustTerm)
            const delta = Math.min(Math.max(ratioError, TOLERANCE), cap)
            const constrained = Math.min(delta, maxAghAtm - finalAnti)
            if (constrained > 0) finalAnti += constrained
          }
        } else {
          const aghAdj = Math.max(finalAnti - antiGreenhouseSideContributions, 0)
          if (aghAdj > TOLERANCE) {
            const scale = targetRatio / finalRatio
            const maxAghAtm = Math.max(0, 2 - dustTerm)
            finalAnti = Math.min(antiGreenhouseSideContributions + aghAdj * scale, maxAghAtm)
          } else {
            const cap = Math.max(0, species.maxPressure - finalTotal)
            if (cap <= TOLERANCE) return null
            const maxGhAtm = Math.max(0, 2 - finalTotal / 10)
            const delta = Math.min(Math.max(-ratioError, TOLERANCE), cap)
            const constrained = Math.min(delta, maxGhAtm - finalGreenhouse)
            if (constrained > 0) finalGreenhouse += constrained
          }
        }
      }
    }

    // Final recalculation
    const nonNeutral = targetBreathable + finalWater + finalGreenhouse + finalAnti
    const minNT = Math.max(neutralSideContributions, targetBreathable > 0 ? targetBreathable / 0.3 - nonNeutral : neutralSideContributions)
    const maxNT = Math.max(neutralSideContributions, species.maxPressure - nonNeutral)
    if (minNT > maxNT + TOLERANCE) return null
    finalNeutralMain = clamp(Math.max(0, minNT - neutralSideContributions), 0, Math.max(0, maxNT - neutralSideContributions))
    totalNeutral = finalNeutralMain + neutralSideContributions
    finalTotal = nonNeutral + totalNeutral
    finalRatio = computeRatio(finalTotal, finalGreenhouse, finalAnti)
    finalSurfaceTemp = finalRatio * baseRef
    projectedHydroId = determineHydrosphere(finalSurfaceTemp, finalTotal)
    targetHydroExt = calculateTargetHydroExt(body.hydroExt, projectedHydroId)

    const eqWater = targetWaterForState(projectedHydroId, targetHydroExt, finalTotal)
    const hydroIncrease = targetHydroExt - body.hydroExt
    let targetWater = eqWater
    if (hydroIncrease > 0) targetWater = eqWater + hydroIncrease / 40
    if (targetWater >= 0 && targetWater <= species.maxPressure) {
      const newTotal = targetBreathable + targetWater + finalGreenhouse + finalAnti + totalNeutral
      if (newTotal <= species.maxPressure + TOLERANCE) finalWater = targetWater
    }

    const finalTempLow = finalSurfaceTemp * (lowSwingRatio || 1)
    const finalTempHigh = finalSurfaceTemp * (highSwingRatio || 1)
    const tempOutOfRange = finalTempLow < speciesMinTemp - 0.5 || finalTempHigh > speciesMaxTemp + 0.5
    if (tempOutOfRange && !isPartial) isPartial = true
    if (!isPartial && tempOutOfRange) return null

    // Calculate times
    const waterDelta = finalWater - summary.waterVapourPressure
    const breathableDelta = targetBreathable - summary.breathablePressure
    const ghDelta = finalGreenhouse - summary.greenhousePressure
    const aghDelta = finalAnti - summary.antiGreenhousePressure
    const neutralDelta = totalNeutral - summary.neutralPressure

    const waterTime = computeTerraformingTime(waterDelta, localTerraformingPower, 0.1)
    const breathableTime = computeTerraformingTime(breathableDelta, localTerraformingPower)
    const toxicTime = computeTerraformingTime(summary.toxicPressure, localTerraformingPower)
    const toxicDetails = summary.toxics.map((gas) => ({
      gasName: gas.gasName,
      atm: gas.atm,
      time: computeTerraformingTime(gas.atm, localTerraformingPower),
    }))
    const ghTime = computeTerraformingTime(ghDelta, localTerraformingPower)
    const aghTime = computeTerraformingTime(aghDelta, localTerraformingPower)
    const neutralTime = computeTerraformingTime(neutralDelta, localTerraformingPower)

    const hydroExtChange = targetHydroExt - body.hydroExt
    let hydroExtTime = 0
    if (Math.abs(hydroExtChange) > 0.1) {
      if (hydroExtChange > 0) {
        const waterToCondense = finalWater - eqWater
        if (waterToCondense > TOLERANCE) hydroExtTime = waterToCondense / 0.1
      } else {
        const waterToEvaporate = Math.abs(hydroExtChange) / 40
        if (waterToEvaporate > TOLERANCE) hydroExtTime = waterToEvaporate / 4.0
      }
    }

    const totalTime = waterTime + breathableTime + toxicTime + ghTime + aghTime + neutralTime

    // Determine gas names
    const ghGas = summary.greenhouses[0]
    const aghGas = summary.antiGreenhouses[0]
    const neutralGas = summary.neutrals[0]

    return {
      totalTime,
      breathableTime,
      breathableTarget: targetBreathable,
      toxicTime,
      toxicDetails,
      greenhouseTime: ghTime,
      greenhouseTarget: finalGreenhouse,
      greenhouseName: ghGas?.gasName ?? 'Aestusium',
      antiGreenhouseTime: aghTime,
      antiGreenhouseTarget: finalAnti,
      antiGreenhouseName: aghGas?.gasName ?? 'Frigusium',
      neutralTime,
      neutralTarget: totalNeutral,
      neutralName: neutralGas?.gasName ?? 'Nitrogen',
      waterVapourTime: waterTime,
      waterVapourTarget: finalWater,
      hydroExtTime,
      targetTemp: finalSurfaceTemp,
      targetPressure: finalTotal,
      targetHydroExt,
      isPartial,
      albedo,
    }
  }

  let effectiveAlbedo = body.albedo
  let solution = solveForAlbedo(effectiveAlbedo)
  if (!solution) return null

  // Albedo adjustment iterations
  for (let attempt = 0; attempt < 2; attempt++) {
    const adjusted = adjustAlbedoForHydrosphere(body.albedo, body.hydroId, determineHydrosphere(solution.targetTemp, solution.targetPressure), body.hydroExt)
    if (Math.abs(adjusted - effectiveAlbedo) < 1e-3) break
    effectiveAlbedo = adjusted
    const recalc = solveForAlbedo(effectiveAlbedo)
    if (!recalc) break
    solution = recalc
  }

  return solution
}
