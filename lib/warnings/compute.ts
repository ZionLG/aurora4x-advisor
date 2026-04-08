/**
 * Pure warning computation — converts raw data into Warning objects.
 * No SQL, no side effects, fully testable.
 */

import { formatPopulation } from '../compute/utils'
import type {
  Warning,
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

/** Convert a 0–1 ratio to a percentage with one decimal place: 0.721 → 72.1 */
function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10
}

export function calculateWarnings(data: {
  stockpilingCivilianMinerals: StockpilingCivilianMineralsData[]
  selfSustainingDestinations: SelfSustainingDestinationData[]
  freeLabs: FreeLabData[]
  freeCapacity: FreeCapacityData[]
  deadResearch: DeadResearchData[]
  lowEfficiency: LowEfficiencyData[]
  governorless: GovernorlessData[]
  mismatchedResearch: MismatchedResearchData[]
  wastedMining: WastedMiningData[]
  wastedTerraform: WastedTerraformData[]
  obsoleteShipyards: ObsoleteShipyardData[]
  // Ships
  damagedShips: DamagedShipData[]
  armorDamagedShips: ArmorDamagedShipData[]
  lowMoraleShips: LowMoraleShipData[]
  lowMaintenanceShips: LowMaintenanceShipData[]
  misconfiguredSupplyClasses: MisconfiguredSupplyClassData[]
  misconfiguredTankerClasses: MisconfiguredTankerClassData[]
  obsoleteShips: ObsoleteShipData[]
  fullyTrainedShips: FullyTrainedShipData[]
  activeFireControls: ActiveFireControlData[]
  transportNoShuttleClasses: TransportNoShuttleData[]
  commanderlessAdmins: CommanderlessAdminData[]
  commanderlessSectors: CommanderlessSectorData[]
  // Exploration / Contacts
  activeLifepods: ActiveLifepodData[]
  knownWrecks: KnownWreckData[]
  unexploitedConstructs: UnexploitedConstructData[]
  dangerousRifts: DangerousRiftData[]
  intruders: IntruderData[]
}): Warning[] {
  const warnings: Warning[] = []

  // ── Economy ───────────────────────────────────────────────────────

  for (const { populationId, popName, systemName, totalStockpile } of data.stockpilingCivilianMinerals) {
    warnings.push({
      id: `stockpile-civ-${populationId}`,
      category: 'economy',
      type: 'Stockpiling Minerals',
      severity: 'low',
      title: `${popName} is stockpiling civilian minerals`,
      detail: `Currently stockpiling ${Math.round(totalStockpile).toLocaleString()} tons of mineral.`,
      colony: popName,
      system: systemName,
      value: totalStockpile,
    })
  }

  for (const { populationId, popName, systemName, miningInstallations } of data.wastedMining) {
    warnings.push({
      id: `wasted-mining-${populationId}`,
      category: 'economy',
      type: 'Wasted Mining',
      severity: 'medium',
      title: `${popName} has ${Math.round(miningInstallations)} mining installations but no mineral deposits`,
      detail: 'No mineral deposits on this body.',
      colony: popName,
      system: systemName,
    })
  }

  for (const { populationId, popName, systemName, terraformInstallations } of data.wastedTerraform) {
    warnings.push({
      id: `wasted-terraform-${populationId}`,
      category: 'economy',
      type: 'Wasted Terraforming',
      severity: 'medium',
      title: `${popName} has ${Math.round(terraformInstallations)} terraforming installations but no gas selected`,
      detail: 'No terraforming gas target selected.',
      colony: popName,
      system: systemName,
    })
  }

  // ── Populations ───────────────────────────────────────────────────

  for (const { populationId, popName, systemName, freeLabs, assignedLabs, totalLabs } of data.freeLabs) {
    warnings.push({
      id: `free-labs-${populationId}`,
      category: 'populations',
      type: 'Free Research Labs',
      severity: 'low',
      title: `${popName} has ${freeLabs} unassigned research labs`,
      detail: `${assignedLabs} of ${totalLabs} labs assigned to projects.`,
      colony: popName,
      system: systemName,
      value: freeLabs,
    })
  }

  const capLabels = { construction: 'Construction', ordnance: 'Ordnance', fighter: 'Fighter' } as const
  for (const { populationId, popName, systemName, freePercent, capacityType } of data.freeCapacity) {
    warnings.push({
      id: `free-${capacityType}-${populationId}`,
      category: 'populations',
      type: `Free ${capLabels[capacityType]} Capacity`,
      severity: 'low',
      title: `${popName} has ${freePercent}% free ${capacityType} capacity`,
      detail: `${freePercent}% unallocated.`,
      colony: popName,
      system: systemName,
      value: freePercent,
    })
  }

  for (const { populationId, popName, systemName, labCount } of data.deadResearch) {
    warnings.push({
      id: `dead-research-${populationId}`,
      category: 'populations',
      type: 'Idle Research Labs',
      severity: 'medium',
      title: `${popName} has ${Math.round(labCount)} research labs with no assigned projects`,
      detail: 'No research projects assigned.',
      colony: popName,
      system: systemName,
      value: labCount,
    })
  }

  // ColonistDestination=0 means "Destination" in Aurora's enum (0=Dest, 1=Source, 2=Stable)
  for (const { populationId, popName, systemName, population } of data.selfSustainingDestinations) {
    warnings.push({
      id: `self-sustain-${populationId}`,
      category: 'populations',
      type: 'Self-Sustaining',
      severity: 'info',
      title: `${popName} is a self-sustaining colonist destination`,
      detail: `Population: ${formatPopulation(population)}.`,
      colony: popName,
      system: systemName,
      value: population,
    })
  }

  // ManufacturingEfficiency = ManufacturingPop / TotalWorkers (from Aurora source)
  for (const { populationId, popName, systemName, efficiency, population } of data.lowEfficiency) {
    const effPct = toPercent(efficiency)
    warnings.push({
      id: `low-eff-${populationId}`,
      category: 'populations',
      type: 'Low Efficiency',
      severity: efficiency < 0.5 ? 'high' : 'medium',
      title: `${popName} efficiency: ${effPct}%`,
      detail: `Population: ${formatPopulation(population)}. Not enough manufacturing workers to staff all installations — production at ${effPct}%.`,
      colony: popName,
      system: systemName,
      value: efficiency,
    })
  }

  // ── Administrations ───────────────────────────────────────────────

  for (const { populationId, popName, systemName, population } of data.governorless) {
    warnings.push({
      id: `no-gov-${populationId}`,
      category: 'administrations',
      type: 'No Governor',
      severity: 'medium',
      title: `${popName} has no assigned governor`,
      detail: `Population: ${formatPopulation(population)}.`,
      colony: popName,
      system: systemName,
      value: population,
    })
  }

  for (const { projectId, popName, systemName, techName, scientistName, scientistField, projectField } of data.mismatchedResearch) {
    warnings.push({
      id: `mismatch-research-${projectId}`,
      category: 'administrations',
      type: 'Mismatched Research',
      severity: 'medium',
      title: `${scientistName} specializes in ${scientistField} but researching ${projectField}`,
      detail: `${techName} at ${popName}.`,
      colony: popName,
      system: systemName,
    })
  }

  for (const { adminId, adminName, popName } of data.commanderlessAdmins) {
    warnings.push({
      id: `no-cmd-admin-${adminId}`,
      category: 'administrations',
      type: 'No Commander',
      severity: 'medium',
      title: `${popName ? popName + ' — ' : ''}${adminName}`,
      detail: 'No commander assigned.',
    })
  }

  for (const { sectorId, sectorName, popName } of data.commanderlessSectors) {
    warnings.push({
      id: `no-cmd-sector-${sectorId}`,
      category: 'administrations',
      type: 'No Sector Commander',
      severity: 'medium',
      title: `${popName ? popName + ' — ' : ''}${sectorName}`,
      detail: 'No commander assigned.',
    })
  }

  // ── Ships ─────────────────────────────────────────────────────────

  for (const { shipId, fleetName, shipName, damagedComponents } of data.damagedShips) {
    warnings.push({
      id: `damaged-ship-${shipId}`,
      category: 'ships',
      type: 'Damaged Ship',
      severity: 'high',
      title: `${fleetName} — ${shipName}`,
      detail: `${damagedComponents}.`,
    })
  }

  for (const { shipId, fleetName, shipName, armorDamage, armorThickness, thinnestLayer } of data.armorDamagedShips) {
    const ratio = armorThickness > 0 ? thinnestLayer / armorThickness : 0
    warnings.push({
      id: `armor-dmg-${shipId}`,
      category: 'ships',
      type: 'Armor Damage',
      severity: ratio < 0.3 ? 'high' : 'medium',
      title: `${fleetName} — ${shipName}`,
      detail: `${armorDamage} damage — Thinnest remaining layer: ${thinnestLayer}.`,
    })
  }

  for (const { shipId, fleetName, shipName, morale } of data.lowMoraleShips) {
    const moralePct = toPercent(morale)
    warnings.push({
      id: `low-morale-${shipId}`,
      category: 'ships',
      type: 'Low Morale',
      severity: moralePct < 30 ? 'high' : moralePct < 85 ? 'medium' : 'low',
      title: `${moralePct}% — ${fleetName} — ${shipName}`,
      detail: '',
    })
  }

  for (const { shipId, fleetName, shipName, currentSupplies, requiredSupplies, supplyLevel } of data.lowMaintenanceShips) {
    const supplyPct = toPercent(supplyLevel)
    warnings.push({
      id: `low-maint-${shipId}`,
      category: 'ships',
      type: 'Low Maintenance',
      severity: supplyPct < 30 ? 'high' : supplyPct < 85 ? 'medium' : 'low',
      title: `${supplyPct}% — ${fleetName} — ${shipName}`,
      detail: `${Math.round(currentSupplies)}/${Math.round(requiredSupplies)} MSP.`,
    })
  }

  for (const { shipClassId, className } of data.misconfiguredSupplyClasses) {
    warnings.push({
      id: `misconfig-supply-${shipClassId}`,
      category: 'ships',
      type: 'Misconfigured Supply Ship',
      severity: 'medium',
      title: `${className} Class`,
      detail: 'No minimum supply level set.',
    })
  }

  for (const { shipClassId, className } of data.misconfiguredTankerClasses) {
    warnings.push({
      id: `misconfig-tanker-${shipClassId}`,
      category: 'ships',
      type: 'Misconfigured Tanker',
      severity: 'medium',
      title: `${className} Class`,
      detail: 'No minimum fuel level set.',
    })
  }

  for (const { shipId, fleetName, shipName, className } of data.obsoleteShips) {
    warnings.push({
      id: `obsolete-ship-${shipId}`,
      category: 'ships',
      type: 'Obsolete Ship',
      severity: 'low',
      title: `${fleetName} — ${shipName}`,
      detail: `${className} Class.`,
    })
  }

  for (const { shipId, fleetName, shipName } of data.fullyTrainedShips) {
    warnings.push({
      id: `fully-trained-${shipId}`,
      category: 'ships',
      type: 'Fully Trained',
      severity: 'low',
      title: `${fleetName} — ${shipName}`,
      detail: '',
    })
  }

  for (const { shipId, fleetName, shipName, fireControls } of data.activeFireControls) {
    warnings.push({
      id: `active-fc-${shipId}`,
      category: 'ships',
      type: 'Active Fire Controls',
      severity: 'medium',
      title: `${fleetName} — ${shipName}`,
      detail: fireControls.join(', '),
    })
  }

  for (const { shipClassId, className, cargoCapacity, colonistCapacity, troopCapacity } of data.transportNoShuttleClasses) {
    const capacities = [
      cargoCapacity > 0 ? `Cargo: ${cargoCapacity.toLocaleString()}` : '',
      colonistCapacity > 0 ? `Colonists: ${colonistCapacity.toLocaleString()}` : '',
      troopCapacity > 0 ? `Troops: ${troopCapacity.toLocaleString()}` : '',
    ]
      .filter(Boolean)
      .join(', ')
    warnings.push({
      id: `no-shuttle-${shipClassId}`,
      category: 'ships',
      type: 'No Cargo Shuttles',
      severity: 'low',
      title: `${className} Class`,
      detail: capacities,
    })
  }

  // ── Others ────────────────────────────────────────────────────────

  for (const { shipyardId, shipyardName, popName, systemName, className, capacity, slipways } of data.obsoleteShipyards) {
    warnings.push({
      id: `obsolete-sy-${shipyardId}`,
      category: 'others',
      type: 'Obsolete Shipyard',
      severity: 'low',
      title: `${shipyardName} is set to build obsolete class ${className}`,
      detail: `${popName} — Capacity: ${capacity.toLocaleString()}, Slipways: ${slipways}`,
      colony: popName,
      system: systemName,
    })
  }

  for (const { lifepodId, shipName, crew, systemName } of data.activeLifepods) {
    warnings.push({
      id: `lifepod-${lifepodId}`,
      category: 'others',
      type: 'Active Lifepod',
      severity: 'high',
      title: `${systemName} — ${shipName}`,
      detail: `${crew} crew.`,
      system: systemName,
    })
  }

  for (const { wreckId, className, size, systemName, owned } of data.knownWrecks) {
    warnings.push({
      id: `wreck-${wreckId}`,
      category: 'others',
      type: 'Known Wreck',
      severity: 'low',
      title: `${systemName} — ${className}`,
      detail: `Size: ${Math.round(size)}.${owned ? ' Owned design.' : ''}`,
      system: systemName,
    })
  }

  for (const { constructId, systemBodyName, systemName, researchField, researchBonus, active } of data.unexploitedConstructs) {
    warnings.push({
      id: `construct-${constructId}`,
      category: 'others',
      type: 'Unexploited Construct',
      severity: 'medium',
      title: `${systemName} — ${systemBodyName}`,
      detail: active
        ? `${toPercent(researchBonus)}% ${researchField} bonus. No population >10M on body.`
        : 'Dormant.',
      system: systemName,
    })
  }

  for (const { systemName, diameter, fleetCount, populationCount } of data.dangerousRifts) {
    const diameterMkm = Math.round(diameter / 1_000_000)
    warnings.push({
      id: `rift-${systemName}`,
      category: 'others',
      type: 'Dangerous Rift',
      severity: 'high',
      title: `${systemName} — ${diameterMkm} Mkm diameter`,
      detail: `${fleetCount} fleets, ${populationCount} colonies in system.`,
      system: systemName,
    })
  }

  // ── Contacts ──────────────────────────────────────────────────────

  const intrudersBySystem = new Map<string, IntruderData[]>()
  for (const intruder of data.intruders) {
    const existing = intrudersBySystem.get(intruder.systemName) ?? []
    existing.push(intruder)
    intrudersBySystem.set(intruder.systemName, existing)
  }

  for (const [system, contacts] of intrudersBySystem) {
    const totalCount = contacts.reduce((sum, { count }) => sum + count, 0)
    const hasHostile = contacts.some(({ hostile }) => hostile)
    const summary = contacts
      .map(({ count, contactType, raceName }) =>
        `${count} ${contactType}${count > 1 ? 's' : ''} (${raceName})`)
      .join(', ')

    warnings.push({
      id: `intruder-${system}`,
      category: 'contacts',
      type: 'Intruders',
      severity: hasHostile ? 'high' : 'medium',
      title: `${system} — ${totalCount} contacts`,
      detail: summary,
      system,
    })
  }

  return warnings
}
