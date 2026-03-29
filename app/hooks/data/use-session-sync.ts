import { useEffect } from 'react'
import { useSessionStore } from '@/app/stores/session-store'

/**
 * Syncs session state from main process push events into Zustand.
 * Mount this once at the app root.
 */
export function useSessionSync(): void {
  const syncFromMain = useSessionStore((s) => s.syncFromMain)

  useEffect(() => {
    const unsubscribe = window.conveyor.subscribe('session:stateChanged', (state) => {
      syncFromMain(state)
    })
    return unsubscribe
  }, [syncFromMain])
}
