// Sync hooks — mount once at app root
export { useEmpireTick } from './use-empire-tick'
export { useSessionSync } from './use-session-sync'
export { useAdvisorSync } from './use-advisor-sync'

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
} from './use-empire'
