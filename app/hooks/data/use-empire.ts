import { useQuery } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'

/** Fetch when a game is selected and we have any data source (bridge or offline) */
function useEmpireEnabled(): boolean {
  const game = useSessionStore((s) => s.currentGame)
  const mode = useSessionStore((s) => s.connectionMode)
  return !!game && (mode === 'bridge' || mode === 'offline')
}

/** Fetch only when bridge is connected (for realtime features) */
function useBridgeEnabled(): boolean {
  const game = useSessionStore((s) => s.currentGame)
  const mode = useSessionStore((s) => s.connectionMode)
  return !!game && mode === 'bridge'
}

export function useFleets() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'fleets'],
    queryFn: () => window.conveyor.empire.getFleets(),
    enabled,
  })
}

export function useShips() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'ships'],
    queryFn: () => window.conveyor.empire.getShips(),
    enabled,
  })
}

export function useClasses() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'classes'],
    queryFn: () => window.conveyor.empire.getClasses(),
    enabled,
  })
}

export function useClassDetail(classId: number | null) {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'classDetail', classId],
    queryFn: () => window.conveyor.empire.getClassDetail(classId!),
    enabled: enabled && classId !== null,
  })
}

export function useBodies(systemId: number | null) {
  const enabled = useBridgeEnabled()
  return useQuery({
    queryKey: ['empire', 'bodies', systemId],
    queryFn: () => window.conveyor.empire.getBodies(systemId!),
    enabled: enabled && systemId !== null,
  })
}

export function useSystems() {
  const enabled = useBridgeEnabled()
  return useQuery({
    queryKey: ['empire', 'systems'],
    queryFn: () => window.conveyor.empire.getSystems(),
    enabled,
  })
}

export function useRealtimeFleets() {
  const enabled = useBridgeEnabled()
  return useQuery({
    queryKey: ['empire', 'realtimeFleets'],
    queryFn: () => window.conveyor.empire.getRealtimeFleets(),
    enabled,
  })
}

export function useMinerals() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'minerals'],
    queryFn: () => window.conveyor.empire.getMinerals(),
    enabled,
  })
}

export function useMineralHistory(resolution: string, populationId: number | null) {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'mineralHistory', resolution, populationId],
    queryFn: () => window.conveyor.empire.getMineralHistory(resolution, populationId),
    enabled,
  })
}

export function useMineralBreakdown(mineralId: number | null, resolution: string) {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'mineralBreakdown', mineralId, resolution],
    queryFn: () => window.conveyor.empire.getMineralBreakdown(mineralId!, resolution),
    enabled: enabled && mineralId !== null,
  })
}

export function useMineralColonies() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'mineralColonies'],
    queryFn: () => window.conveyor.empire.getMineralColonies(),
    enabled,
  })
}

export function useResearch() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'research'],
    queryFn: () => window.conveyor.empire.getResearch(),
    enabled,
  })
}

export function useWaypoints() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'waypoints'],
    queryFn: () => window.conveyor.empire.getWaypoints(),
    enabled,
  })
}

export function useGameDate() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'gameDate'],
    queryFn: () => window.conveyor.empire.getGameDate(),
    enabled,
  })
}

export function useRoutes() {
  return useQuery({
    queryKey: ['empire', 'routes'],
    queryFn: () => window.conveyor.empire.loadRoutes(),
  })
}

export function useFilters() {
  return useQuery({
    queryKey: ['empire', 'filters'],
    queryFn: () => window.conveyor.empire.loadFilters(),
  })
}

export function useProduction() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'production'],
    queryFn: () => window.conveyor.empire.getProduction(),
    enabled,
  })
}

export function useShipyards() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'shipyards'],
    queryFn: () => window.conveyor.empire.getShipyards(),
    enabled,
  })
}

export function useWarnings() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'warnings'],
    queryFn: () => window.conveyor.empire.getWarnings(),
    enabled,
  })
}

export function useHabitability() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'habitability'],
    queryFn: () => window.conveyor.empire.getHabitability(),
    enabled,
  })
}

export function useSpeciesRequirements() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'speciesRequirements'],
    queryFn: () => window.conveyor.empire.getSpeciesRequirements(),
    enabled,
  })
}

export function useGameLog(limit?: number, offset?: number, eventTypes?: number[], onlyCustomized?: boolean) {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'gameLog', limit, offset, eventTypes, onlyCustomized],
    queryFn: () => window.conveyor.empire.getGameLog(limit, offset, eventTypes, onlyCustomized),
    enabled,
  })
}

export function useEventTypes() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'eventTypes'],
    queryFn: () => window.conveyor.empire.getEventTypes(),
    enabled,
  })
}
