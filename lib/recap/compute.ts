/**
 * Pure computation functions for the production recap.
 *
 * These functions receive typed data objects and return results.
 * No SQL, no QueryFn, no knowledge of data source.
 * Fully testable with mock data.
 */

import type {
  RecapEntry,
  PopCap,
  BodyData,
  PopulationData,
  InstallationPower,
  EngineerPower,
  GovernorBonus,
  SectorBonus,
  ResearchProject,
  IndustrialProject,
  ShipTask,
  ShipyardUpgrade,
  TrainingTask,
  TerraformingData,
  OrbitalTerraformer,
  GovernorTerraformBonus,
} from './types'

const DAYS_PER_YEAR = 365
const EARTH_SURFACE_AREA = 511187128

function daysFromAnnual(remainingWork: number, annualRate: number): number | null {
  if (annualRate <= 0 || remainingWork <= 0) return null
  return Math.round((remainingWork / annualRate) * DAYS_PER_YEAR * 10) / 10
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString()
}

// ── Population capacities ────────────────────────────────────────────

export function calculatePopCaps(
  populations: PopulationData[],
  installations: InstallationPower[],
  engineers: EngineerPower[],
  governors: GovernorBonus[],
  sectors: SectorBonus[],
  bodies: Record<number, BodyData>
): Map<number, PopCap> {
  const instMap = new Map(installations.map((i) => [i.popId, i]))
  const engMap = new Map(engineers.map((e) => [e.populationId, e.groundConstructionPower]))
  const govMap = new Map(governors.map((g) => [g.populationId, g]))
  const sectorMap = new Map(sectors.map((s) => [s.populationId, s]))

  const caps = new Map<number, PopCap>()

  for (const pop of populations) {
    const inst = instMap.get(pop.populationId) ?? { constructionPower: 0, ordnancePower: 0, fighterPower: 0 }
    const eng = engMap.get(pop.populationId) ?? 0
    const gov = govMap.get(pop.populationId) ?? { construction: 1, shipbuilding: 1, training: 1 }
    const sector = sectorMap.get(pop.populationId) ?? { construction: 1, shipbuilding: 1, training: 1, terraform: 1 }
    const body = bodies[pop.systemBodyId]
    const radMod = 1 - (body?.radiationLevel ?? 0) / 10000

    const baseMod =
      pop.productionRateModifier *
      pop.economicProdModifier *
      pop.efficiency *
      radMod *
      pop.politicalStability *
      pop.productionMod
    const constructMod = baseMod * gov.construction * sector.construction
    const engineerMod = pop.economicProdModifier * radMod

    caps.set(pop.populationId, {
      constructionRate:
        pop.constructionProduction * constructMod * inst.constructionPower +
        pop.constructionProduction * engineerMod * eng,
      ordnanceRate: pop.ordnanceProduction * constructMod * inst.ordnancePower,
      fighterRate: pop.fighterProduction * constructMod * inst.fighterPower,
      shipBuildRate: pop.shipBuilding * baseMod * gov.shipbuilding * sector.shipbuilding,
      researchPerLab:
        pop.research *
        pop.researchRateModifier *
        pop.economicProdModifier *
        pop.efficiency *
        radMod *
        pop.politicalStability *
        pop.productionMod *
        pop.researchSpeed,
      trainingRate: pop.groundFormationConstructionRate * baseMod * gov.training * sector.training,
      minConstructionPeriod: pop.minConstructionPeriod,
      shipyardOperations: pop.shipyardOperations,
    })
  }

  return caps
}

// ── Research ─────────────────────────────────────────────────────────

export function calculateResearchEntries(projects: ResearchProject[], caps: Map<number, PopCap>): RecapEntry[] {
  return projects.map((r) => {
    const cap = caps.get(r.populationId)

    let cmdBonus = 1
    if (r.commanderBonus != null) {
      cmdBonus =
        r.commanderField != null && r.commanderField === r.resSpecId ? r.commanderBonus * 4 - 3 : r.commanderBonus
    }

    let anomalyBonus = 1
    if (r.anomalyBonus != null && r.anomalyField != null && r.anomalyField === r.resSpecId) {
      anomalyBonus = r.anomalyBonus
    }

    const annualRP = cap ? cap.researchPerLab * r.facilities * cmdBonus * anomalyBonus : 0

    return {
      id: `research-${r.projectId}`,
      type: 'research' as const,
      badge: 'Research',
      name: r.techName,
      system: r.systemName,
      colony: r.popName,
      colonyId: r.populationId,
      remainingDays: daysFromAnnual(r.researchPointsRequired, annualRP),
      annualRate: annualRP > 0 ? `${fmt(annualRP)} RP / ${r.facilities} Labs` : `${r.facilities} Labs`,
      annualRateValue: annualRP,
      paused: r.pause !== 0,
      queued: false,
    }
  })
}

// ── Industrial production ────────────────────────────────────────────

const PROD_TYPE_BADGE: Record<number, string> = {
  0: 'Construction',
  1: 'Ordnance',
  2: 'Fighter',
  3: 'Component',
  4: 'Space Station',
}

export function calculateIndustrialEntries(projects: IndustrialProject[], caps: Map<number, PopCap>): RecapEntry[] {
  return projects.map((r) => {
    const cap = caps.get(r.populationId)
    const remainingWork = r.amount * r.prodPerUnit

    let annualCap = 0
    if (cap) {
      if (r.productionType === 1) annualCap = cap.ordnanceRate
      else if (r.productionType === 2) annualCap = cap.fighterRate
      else annualCap = cap.constructionRate
    }

    const allocated = annualCap * (r.percentage / 100)
    const isQueued = r.queue > 0
    let days = daysFromAnnual(remainingWork, allocated)
    if (isQueued && days != null) days = days * 50000

    const badge = PROD_TYPE_BADGE[r.productionType] ?? 'Production'
    const qty = r.amount >= 10 ? Math.round(r.amount * 10) / 10 : Math.round(r.amount * 100) / 100
    const name = r.amount > 1 ? `${qty}x ${r.description}` : r.description

    return {
      id: `prod-${r.projectId}`,
      type: 'production' as const,
      badge,
      name,
      system: r.systemName,
      colony: r.popName,
      colonyId: r.populationId,
      remainingDays: days,
      annualRate: allocated > 0 ? `${fmt(allocated)} BP / ${r.percentage}%` : `${r.percentage}%`,
      annualRateValue: allocated,
      paused: r.pause !== 0,
      queued: isQueued,
    }
  })
}

// ── Ship construction ────────────────────────────────────────────────

export function calculateShipEntries(tasks: ShipTask[], caps: Map<number, PopCap>): RecapEntry[] {
  return tasks.map((r) => {
    const remaining = Math.max(0, r.totalBP - r.completedBP)
    const cap = caps.get(r.populationId)
    const commercialMod = r.shipCommercial ? 1 : 0
    const sizeMod = 1 + ((r.shipSize * commercialMod) / 100 - 1) / 2
    const annualBP = (cap?.shipBuildRate ?? 0) * Math.max(sizeMod, 0.01)
    const name = r.unitName ? `${r.className} (${r.unitName})` : r.className

    return {
      id: `ship-${r.taskId}`,
      type: 'ship' as const,
      badge: 'Ship',
      name,
      system: r.systemName,
      colony: r.popName,
      colonyId: r.populationId,
      remainingDays: daysFromAnnual(remaining, annualBP),
      annualRate: annualBP > 0 ? `${fmt(annualBP)} Mod Rate` : '',
      annualRateValue: annualBP,
      paused: r.paused !== 0,
      queued: false,
    }
  })
}

// ── Shipyard upgrades ────────────────────────────────────────────────

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

export function calculateShipyardEntries(upgrades: ShipyardUpgrade[], caps: Map<number, PopCap>): RecapEntry[] {
  return upgrades.map((r) => {
    const cap = caps.get(r.populationId)
    const commercialMod = r.syType === 1 ? 1 : 0.1
    const capMod = 1 + ((r.capacity * commercialMod) / 5000 - 1) / 2
    const upgradeRate = (cap?.shipBuildRate ?? 0) * Math.max(capMod, 0.01)
    const effectiveRate = r.taskType === 7 ? upgradeRate / Math.max(r.slipways, 1) : upgradeRate

    // Continual capacity upgrade: period-by-period calculation
    if (r.taskType === 8 && r.capacityTarget > r.capacity && cap) {
      const SECONDS_PER_YEAR = 31536000
      const SECONDS_PER_DAY = 86400
      const roi = cap.minConstructionPeriod / SECONDS_PER_YEAR
      const periodDays = cap.minConstructionPeriod / SECONDS_PER_DAY
      const syTypeMod = r.syType === 1 ? 500 : 5000
      const wat = 120 * r.slipways * cap.shipyardOperations

      let periods = 0
      let newCapacity = r.capacity
      if (wat > 0) {
        while (newCapacity < r.capacityTarget && periods < 100000) {
          const stepCapMod = 1 + ((newCapacity * commercialMod) / 5000 - 1) / 2
          const stepRate = cap.shipBuildRate * Math.max(stepCapMod, 0.01) * roi
          newCapacity += (stepRate / wat) * syTypeMod
          periods++
        }
      }

      const days = Math.round(periods * periodDays * 10) / 10
      const taskName = SY_TASK_NAMES[r.taskType] ?? `Task ${r.taskType}`
      return {
        id: `sy-${r.shipyardId}`,
        type: 'shipyard' as const,
        badge: 'Shipyard',
        name: `${r.shipyardName} - ${taskName} to ${fmt(r.capacityTarget)}`,
        system: r.systemName,
        colony: r.popName,
        colonyId: r.populationId,
        remainingDays: days > 0 ? days : null,
        annualRate: effectiveRate > 0 ? `${fmt(effectiveRate)} Mod Rate` : '',
        annualRateValue: effectiveRate,
        paused: r.pauseActivity !== 0,
        queued: false,
      }
    }

    // Standard upgrade
    const remaining = Math.max(0, r.requiredBP - r.completedBP)
    const taskName = SY_TASK_NAMES[r.taskType] ?? `Task ${r.taskType}`
    const name =
      r.taskType === 7 && r.retoolClassName
        ? `${r.shipyardName} - Retool to ${r.retoolClassName}`
        : `${r.shipyardName} - ${taskName}`

    return {
      id: `sy-${r.shipyardId}`,
      type: 'shipyard' as const,
      badge: 'Shipyard',
      name,
      system: r.systemName,
      colony: r.popName,
      colonyId: r.populationId,
      remainingDays: daysFromAnnual(remaining, effectiveRate),
      annualRate: effectiveRate > 0 ? `${fmt(effectiveRate)} Mod Rate` : '',
      annualRateValue: effectiveRate,
      paused: r.pauseActivity !== 0,
      queued: false,
    }
  })
}

// ── Training ─────────────────────────────────────────────────────────

export function calculateTrainingEntries(tasks: TrainingTask[], caps: Map<number, PopCap>): RecapEntry[] {
  return tasks.map((r) => {
    const remaining = Math.max(0, r.totalBP - r.completedBP)
    const cap = caps.get(r.populationId)
    const annualBP = cap?.trainingRate ?? 0

    return {
      id: `train-${r.taskId}`,
      type: 'training' as const,
      badge: 'Training',
      name: r.formationName,
      system: r.systemName,
      colony: r.popName,
      colonyId: r.populationId,
      remainingDays: daysFromAnnual(remaining, annualBP),
      annualRate: annualBP > 0 ? `${fmt(annualBP)} BP` : '',
      annualRateValue: annualBP,
      paused: false,
      queued: false,
    }
  })
}

// ── Terraforming ─────────────────────────────────────────────────────

export function calculateTerraformingEntries(
  data: TerraformingData[],
  orbital: OrbitalTerraformer[],
  govTerraform: GovernorTerraformBonus[],
  bodies: Record<number, BodyData>
): RecapEntry[] {
  if (data.length === 0) return []

  const orbitalMap = new Map(orbital.map((o) => [o.populationId, o.orbitalPower]))
  const govMap = new Map(govTerraform.map((g) => [g.populationId, g.terraformBonus]))

  return data.flatMap((r): RecapEntry[] => {
    const orbitalPower = orbitalMap.get(r.populationId) ?? 0
    const body = bodies[r.systemBodyId]
    const radius = body?.radius ?? 1
    const radLevel = body?.radiationLevel ?? 0
    const radMod = 1 - radLevel / 10000

    const govBonus = govMap.get(r.populationId) ?? 1
    const popTerraformRate = govBonus * r.efficiency * radMod * r.stability * r.prodMod * r.terraformingRate
    const planetaryCapacity = popTerraformRate * r.groundPower
    const orbitalCapacity = r.terraformingRate * orbitalPower
    const totalCapacity = (planetaryCapacity + orbitalCapacity) * r.terraformingSpeed

    const localSurface = 4 * Math.PI * radius * radius
    const annualRate = localSurface > 0 ? totalCapacity * (EARTH_SURFACE_AREA / localSurface) : 0

    if (annualRate <= 0) return []

    const remaining = r.terraformStatus ? Math.max(0, r.maxAtm - r.gasAtm) : Math.max(0, r.gasAtm - r.maxAtm)
    const days = annualRate > 0 ? Math.round((remaining / (annualRate / DAYS_PER_YEAR)) * 10) / 10 : null

    return [
      {
        id: `terra-${r.populationId}`,
        type: 'terraforming' as const,
        badge: 'Terraforming',
        name: `${r.gasName} to ${r.maxAtm} Atm`,
        system: r.systemName,
        colony: r.popName,
        colonyId: r.populationId,
        remainingDays: days,
        annualRate: `${annualRate.toFixed(4)} Atm`,
        annualRateValue: annualRate,
        paused: false,
        queued: false,
      },
    ]
  })
}
