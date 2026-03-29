import { useEffect } from 'react'
import { useSessionStore } from '@/app/stores/session-store'
import { toast } from 'sonner'

/**
 * Syncs session state from main process push events into Zustand.
 * Also fetches initial state on mount so pop-out windows get current state immediately.
 * Shows toasts for important state changes.
 * Mount this once at the app root.
 */
export function useSessionSync(): void {
  const syncFromMain = useSessionStore((s) => s.syncFromMain)

  useEffect(() => {
    // Fetch initial state immediately (critical for pop-out windows)
    window.conveyor.session.getState().then((state) => {
      syncFromMain(state)
    }).catch(() => {})

    const unsubscribe = window.conveyor.subscribe('session:stateChanged', (state) => {
      if (state.isConnected && state.protocolMismatch) {
        toast.warning('Bridge version mismatch', {
          id: 'protocol-mismatch',
          description:
            'Your AdvisorBridge DLL is outdated. Update it to match the companion app.',
          duration: 10000,
        })
      }

      syncFromMain(state)
    })
    return unsubscribe
  }, [syncFromMain])
}
