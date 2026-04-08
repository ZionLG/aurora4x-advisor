import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import type { RecapEntry, PopCap, BodyData } from '@/lib/recap/types'
import { useRecapSettingsStore } from '@/app/stores/recap-settings-store'

/** Fetch when a game is selected and we have any data source (bridge or offline) */
function useEmpireEnabled(): boolean {
  const game = useSessionStore((s) => s.currentGame)
  const mode = useSessionStore((s) => s.connectionMode)
  return !!game && (mode === 'bridge' || mode === 'offline')
}

// ── Shared settings helpers ───────────────────────────────────────────

function useRecapStaleTime(baseStale: number): number | undefined {
  const interval = useRecapSettingsStore((s) => s.refreshInterval)
  if (interval === 0) return Infinity as unknown as undefined
  return Math.max(interval, baseStale)
}

function useRecapRefetchInterval(): number | false {
  const interval = useRecapSettingsStore((s) => s.refreshInterval)
  return interval === 0 ? false : interval
}

function useRecapForceOffline(): boolean {
  return useRecapSettingsStore((s) => s.forceOffline)
}

// ── Game date (used by sidebar) ──────────────────────────────────────

export function useGameDate() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'gameDate'],
    queryFn: () => window.conveyor.empire.getGameDate(),
    enabled,
  })
}

// ── Warnings ─────────────────────────────────────────────────────────

export function useWarnings() {
  const enabled = useEmpireEnabled()
  const staleTime = useRecapStaleTime(30_000)
  const refetchInterval = useRecapRefetchInterval()
  const forceOffline = useRecapForceOffline()
  return useQuery({
    queryKey: ['empire', 'warnings', { forceOffline }],
    queryFn: () => window.conveyor.empire.getWarnings(forceOffline),
    enabled,
    staleTime,
    refetchInterval,
    placeholderData: (prev) => prev,
  })
}

// ── Game Log ─────────────────────────────────────────────────────────

export function useGameLog(
  limit?: number,
  offset?: number,
  eventTypes?: number[],
  onlyCustomized?: boolean,
  showHidden?: boolean
) {
  const enabled = useEmpireEnabled()
  const staleTime = useRecapStaleTime(10_000)
  const refetchInterval = useRecapRefetchInterval()
  const forceOffline = useRecapForceOffline()
  return useQuery({
    queryKey: ['empire', 'gameLog', limit, offset, eventTypes, onlyCustomized, showHidden, { forceOffline }],
    queryFn: () => window.conveyor.empire.getGameLog(limit, offset, eventTypes, onlyCustomized, showHidden, forceOffline),
    enabled,
    staleTime,
    refetchInterval,
    placeholderData: (prev) => prev,
  })
}

export function useEventTypes() {
  const enabled = useEmpireEnabled()
  return useQuery({
    queryKey: ['empire', 'eventTypes'],
    queryFn: () => window.conveyor.empire.getEventTypes(),
    enabled,
    staleTime: 60_000,
  })
}

// ── Tech Tree ────────────────────────────────────────────────────────

export function useTechTree() {
  const enabled = useEmpireEnabled()
  const forceOffline = useRecapForceOffline()
  return useQuery({
    queryKey: ['empire', 'techTree', { forceOffline }],
    queryFn: () => window.conveyor.empire.getTechTree(forceOffline),
    enabled,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
  })
}

// ── Production Recap (granular, shared cache) ────────────────────────

function useRecapTypeQuery<T>(type: string, queryFn: (forceOffline: boolean) => Promise<T>) {
  const enabled = useEmpireEnabled()
  const staleTime = useRecapStaleTime(10_000)
  const refetchInterval = useRecapRefetchInterval()
  const typeEnabled = useRecapSettingsStore((s) => s.typeSettings[type]?.autoRefresh ?? true)
  const forceOffline = useRecapForceOffline()
  return useQuery<T>({
    queryKey: ['empire', 'recap', type, { forceOffline }],
    queryFn: () => queryFn(forceOffline),
    enabled: enabled && typeEnabled,
    staleTime,
    refetchInterval,
    placeholderData: (prev: T | undefined) => prev,
  })
}

export function useBodyMap() {
  const enabled = useEmpireEnabled()
  const staleTime = useRecapStaleTime(60_000)
  const forceOffline = useRecapForceOffline()
  return useQuery<Record<number, BodyData>>({
    queryKey: ['empire', 'recap', 'bodyMap', { forceOffline }],
    queryFn: () => window.conveyor.empire.getBodyMap(forceOffline),
    enabled,
    staleTime,
  })
}

export function usePopulationCapacities() {
  const enabled = useEmpireEnabled()
  const staleTime = useRecapStaleTime(30_000)
  const forceOffline = useRecapForceOffline()
  return useQuery<Record<number, PopCap>>({
    queryKey: ['empire', 'recap', 'popCapacities', { forceOffline }],
    queryFn: () => window.conveyor.empire.getPopCapacities(forceOffline),
    enabled,
    staleTime,
    placeholderData: (prev) => prev,
  })
}

export function useRecapResearch() {
  return useRecapTypeQuery<RecapEntry[]>('research', (fo) => window.conveyor.empire.getRecapResearch(fo))
}

export function useRecapIndustrial() {
  return useRecapTypeQuery<RecapEntry[]>('industrial', (fo) => window.conveyor.empire.getRecapIndustrial(fo))
}

export function useRecapShips() {
  return useRecapTypeQuery<RecapEntry[]>('ships', (fo) => window.conveyor.empire.getRecapShips(fo))
}

export function useRecapShipyards() {
  return useRecapTypeQuery<RecapEntry[]>('shipyards', (fo) => window.conveyor.empire.getRecapShipyards(fo))
}

export function useRecapTraining() {
  return useRecapTypeQuery<RecapEntry[]>('training', (fo) => window.conveyor.empire.getRecapTraining(fo))
}

export function useRecapTerraforming() {
  return useRecapTypeQuery<RecapEntry[]>('terraforming', (fo) => window.conveyor.empire.getRecapTerraforming(fo))
}

/** Composer hook — combines all recap types into a sorted list */
export function useProductionRecap() {
  const research = useRecapResearch()
  const industrial = useRecapIndustrial()
  const ships = useRecapShips()
  const shipyards = useRecapShipyards()
  const training = useRecapTraining()
  const terraforming = useRecapTerraforming()

  const isLoading =
    research.isLoading ||
    industrial.isLoading ||
    ships.isLoading ||
    shipyards.isLoading ||
    training.isLoading ||
    terraforming.isLoading
  const isFetching =
    research.isFetching ||
    industrial.isFetching ||
    ships.isFetching ||
    shipyards.isFetching ||
    training.isFetching ||
    terraforming.isFetching

  const data = useMemo<RecapEntry[]>(() => {
    const all: RecapEntry[] = [
      ...(research.data ?? []),
      ...(industrial.data ?? []),
      ...(ships.data ?? []),
      ...(shipyards.data ?? []),
      ...(training.data ?? []),
      ...(terraforming.data ?? []),
    ]
    return all.sort((a, b) => (a.remainingDays ?? Infinity) - (b.remainingDays ?? Infinity))
  }, [research.data, industrial.data, ships.data, shipyards.data, training.data, terraforming.data])

  return { data, isLoading, isFetching }
}
