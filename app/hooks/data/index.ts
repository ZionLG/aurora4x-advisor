// Sync hooks — mount once at app root
export { useEmpireTick } from './use-empire-tick'
export { useSessionSync } from './use-session-sync'
export { useGovernmentSync } from './use-government-sync'

// Domain data hooks
export {
  useFleets,
  useShips,
  useClasses,
  useClassDetail,
  useBodies,
  useSystems,
  useRealtimeFleets,
  useMinerals,
  useMineralHistory,
  useMineralBreakdown,
  useMineralColonies,
  useResearch,
  useWaypoints,
  useGameDate,
  useRoutes,
  useFilters,
  useProductionRecap,
  useProduction,
  useShipyards,
  useWarnings,
  useHabitability,
  useSpeciesRequirements,
  useGameLog,
  useEventTypes,
} from './use-empire'
