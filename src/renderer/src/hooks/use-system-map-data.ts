import { useQuery } from '@tanstack/react-query'
import type { SystemBody, StarSystem } from '@shared/types'

export function useSystemBodies(
  systemId: number | null,
  gameId: number | null
): ReturnType<typeof useQuery<SystemBody[]>> {
  return useQuery<SystemBody[]>({
    queryKey: ['systemBodies', systemId, gameId],
    queryFn: () => window.api.bridge.getSystemBodies(systemId!, gameId!),
    enabled: !!systemId && !!gameId,
    staleTime: 1000 * 30
  })
}

export function useSystems(
  gameId: number | null,
  raceId: number | null
): ReturnType<typeof useQuery<StarSystem[]>> {
  return useQuery<StarSystem[]>({
    queryKey: ['systems', gameId, raceId],
    queryFn: () => window.api.bridge.getSystems(gameId!, raceId!),
    enabled: !!gameId && !!raceId,
    staleTime: 1000 * 60
  })
}
