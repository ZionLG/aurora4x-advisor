/**
 * Engine/Drive Calculator
 *
 * Pure calculation functions for ship design — no SQL queries needed.
 * Based on Aurora 4X engine mechanics.
 */

export interface EngineParams {
  enginePower: number // EP per engine (from tech)
  fuelConsumption: number // Fuel consumption per EP per hour (from tech)
  powerModifier: number // 0.1 to 3.0 (affects fuel consumption exponentially)
  engineSize: number // HS (1 HS = 50 tons)
  numberOfEngines: number
  shipTonnage: number // Total ship tonnage
  fuelCapacity: number // Total fuel capacity
}

export interface EngineResult {
  totalEnginePower: number
  speed: number // km/s
  fuelConsumptionPerHour: number
  rangeKm: number
  rangeDays: number
  engineTonnage: number // Total engine tonnage
  enginePercentage: number // % of ship that is engines
  modifiedFuelConsumption: number // After power modifier
}

export interface DriveComparison {
  configs: Array<{
    label: string
    params: EngineParams
    result: EngineResult
  }>
}

/**
 * Calculate engine statistics for a ship configuration.
 *
 * Aurora 4X engine formula:
 * - Speed = Total EP / Ship Size (in HS) * 1000 (gives km/s)
 * - Ship Size = tonnage / 50
 * - Modified fuel consumption = base consumption * (power modifier ^ 2.5)
 * - Fuel per hour = modified consumption * total EP
 * - Range hours = fuel capacity / fuel per hour
 * - Range km = speed * range hours * 3600
 */
export function calculateEngineStats(params: EngineParams): EngineResult {
  const { enginePower, fuelConsumption, powerModifier, engineSize, numberOfEngines, shipTonnage, fuelCapacity } = params

  const shipSizeHS = shipTonnage / 50
  const engineTonnage = engineSize * 50 * numberOfEngines
  const enginePercentage = shipTonnage > 0 ? (engineTonnage / shipTonnage) * 100 : 0

  // Apply power modifier to engine output
  const modifiedEP = enginePower * powerModifier
  const totalEP = modifiedEP * numberOfEngines

  // Speed calculation
  const speed = shipSizeHS > 0 ? Math.round((totalEP / shipSizeHS) * 1000) : 0

  // Fuel consumption with power modifier penalty
  // Higher power modifier = exponentially more fuel
  const modifiedFuelConsumption = fuelConsumption * Math.pow(powerModifier, 2.5)
  const fuelPerHour = modifiedFuelConsumption * totalEP

  // Range
  const rangeHours = fuelPerHour > 0 ? fuelCapacity / fuelPerHour : 0
  const rangeDays = rangeHours / 24
  const rangeKm = speed * rangeHours * 3600

  return {
    totalEnginePower: totalEP,
    speed,
    fuelConsumptionPerHour: Math.round(fuelPerHour * 100) / 100,
    rangeKm: Math.round(rangeKm),
    rangeDays: Math.round(rangeDays * 10) / 10,
    engineTonnage,
    enginePercentage: Math.round(enginePercentage * 10) / 10,
    modifiedFuelConsumption: Math.round(modifiedFuelConsumption * 1000) / 1000,
  }
}

/**
 * Compare multiple engine configurations side by side.
 */
export function compareDriveConfigurations(configs: Array<{ label: string; params: EngineParams }>): DriveComparison {
  return {
    configs: configs.map(({ label, params }) => ({
      label,
      params,
      result: calculateEngineStats(params),
    })),
  }
}

/**
 * Find optimal engine count for a target speed given constraints.
 */
export function findOptimalEngineCount(
  targetSpeed: number,
  enginePower: number,
  powerModifier: number,
  engineSizeHS: number,
  baseTonnage: number, // ship tonnage without engines
  fuelCapacity: number,
  fuelConsumption: number,
  maxEngines: number = 20
): { engines: number; result: EngineResult } | null {
  for (let n = 1; n <= maxEngines; n++) {
    const totalTonnage = baseTonnage + n * engineSizeHS * 50
    const result = calculateEngineStats({
      enginePower,
      fuelConsumption,
      powerModifier,
      engineSize: engineSizeHS,
      numberOfEngines: n,
      shipTonnage: totalTonnage,
      fuelCapacity,
    })
    if (result.speed >= targetSpeed) {
      return { engines: n, result }
    }
  }
  return null
}
