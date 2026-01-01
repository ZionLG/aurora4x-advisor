import React, { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useGame } from '@renderer/hooks/use-game'
import { AdviceSection } from './AdviceSection'
import { Card, CardContent } from '@components/ui/card'

export function DashboardOverview(): React.JSX.Element {
  const { currentGame } = useGame()
  const queryClient = useQueryClient()

  // Load initial advice using React Query
  const { data: advice } = useQuery({
    queryKey: ['advice', currentGame?.id],
    queryFn: async () => {
      if (!currentGame?.personalityArchetype) return null

      console.log('[Dashboard] Loading profiles...')
      const profiles = await window.api.advisor.loadAllProfiles()
      console.log('[Dashboard] Profiles loaded:', profiles.length)

      const matchingProfile = profiles.find(
        (p: { archetype: string }) => p.archetype === currentGame.personalityArchetype
      )
      console.log('[Dashboard] Matching profile:', matchingProfile?.id)

      if (!matchingProfile?.id) {
        console.error(
          '[Dashboard] No matching profile found for:',
          currentGame.personalityArchetype
        )
        return null
      }

      // Trigger initial analysis
      const settings = await window.api.settings.load()
      if (!settings.auroraDbPath) {
        console.log('[Dashboard] No Aurora DB path set, skipping analysis')
        return null
      }

      console.log('[Dashboard] Triggering initial analysis...')
      const initialAdvice = await window.api.advisor.triggerInitialAnalysis(
        settings.auroraDbPath,
        matchingProfile.id
      )
      console.log(
        '[Dashboard] Initial advice received:',
        initialAdvice.tutorials.length,
        'tutorials'
      )
      return initialAdvice
    },
    enabled: !!currentGame?.personalityArchetype,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Listen for advice updates from DB watcher
  useEffect(() => {
    if (!currentGame) return

    const unsubscribe = window.api.advisor.onAdviceUpdate((adviceData: unknown) => {
      console.log('Received advice update:', adviceData)
      // Update React Query cache with new advice
      queryClient.setQueryData(['advice', currentGame.id], adviceData)
    })

    return unsubscribe
  }, [currentGame, queryClient])

  if (!currentGame) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No game selected</p>
          <p className="text-xs mt-2">Create a new game or select one from the sidebar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Advice Section */}
      <AdviceSection advice={advice} profileId={currentGame.personalityArchetype} />
    </div>
  )
}
