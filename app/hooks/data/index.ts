// Sync hooks — mount once at app root
export { useEmpireTick } from './use-empire-tick'
export { useSessionSync } from './use-session-sync'
export { useGovernmentSync } from './use-government-sync'

// Domain data hooks
export {
  useGameDate,
  useWarnings,
  useGameLog,
  useEventTypes,
  useBodyMap,
  usePopulationCapacities,
  useRecapResearch,
  useRecapIndustrial,
  useRecapShips,
  useRecapShipyards,
  useRecapTraining,
  useRecapTerraforming,
  useProductionRecap,
  useMinerals,
  useTechTree,
} from './use-empire'
