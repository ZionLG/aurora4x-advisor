import { useEffect } from 'react'
import { queryClient } from '@/app/lib/query-client'

/**
 * Listens for empire:tick push events and invalidates all empire queries.
 * Mount this once at the app root.
 */
export function useEmpireTick(): void {
  useEffect(() => {
    const unsubscribe = window.conveyor.subscribe('empire:tick', () => {
      queryClient.invalidateQueries({ queryKey: ['empire'] })
    })
    return unsubscribe
  }, [])
}
