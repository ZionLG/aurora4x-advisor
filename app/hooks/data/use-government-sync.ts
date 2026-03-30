import { useEffect } from 'react'
import { useGovernmentStore } from '@/app/stores/government-store'
import type { Briefing } from '@/shared/types'

/**
 * Listens for government:briefing push events and adds to store.
 * Mount this once at the app root.
 */
export function useGovernmentSync(): void {
  const addBriefing = useGovernmentStore((s) => s.addBriefing)

  useEffect(() => {
    const unsubscribe = window.conveyor.subscribe('government:briefing', (briefing: Briefing) => {
      addBriefing(briefing)
    })
    return unsubscribe
  }, [addBriefing])
}
