import { useEffect } from 'react'
import { queryClient } from '@/app/lib/query-client'
import { useRecapSettingsStore } from '@/app/stores/recap-settings-store'

/**
 * Listens for empire:tick push events and invalidates empire queries.
 * Respects recap settings: when autoRefreshOnTick is false, recap queries
 * are excluded from tick-based invalidation.
 */
export function useEmpireTick(): void {
  useEffect(() => {
    const unsubscribe = window.conveyor.subscribe('empire:tick', () => {
      const { autoRefreshOnTick } = useRecapSettingsStore.getState()

      if (autoRefreshOnTick) {
        // Invalidate everything including recap
        queryClient.invalidateQueries({ queryKey: ['empire'] })
      } else {
        // Invalidate empire queries EXCEPT recap
        queryClient.invalidateQueries({
          queryKey: ['empire'],
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[1] !== 'recap'
          },
        })
      }
    })
    return unsubscribe
  }, [])
}
