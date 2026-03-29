import { useEffect } from 'react'
import { useAdvisorStore } from '@/app/stores/advisor-store'

/**
 * Listens for advisor:alert push events and adds to store.
 * Mount this once at the app root.
 */
export function useAdvisorSync(): void {
  const addAlert = useAdvisorStore((s) => s.addAlert)

  useEffect(() => {
    const unsubscribe = window.conveyor.subscribe('advisor:alert', (alert) => {
      addAlert(alert)
    })
    return unsubscribe
  }, [addAlert])
}
