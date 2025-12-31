import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { ArchetypeSelector } from './ArchetypeSelector'
import { IdeologyInputs } from './IdeologyInputs'
import { MatchResultsList } from './MatchResultsList'
import { IdeologyProfileSchema } from '@shared/types'
import type { IdeologyProfile, ArchetypeId, PersonalityMatch } from '@shared/types'

interface PersonalityMatcherProps {
  onComplete?: (archetype: ArchetypeId, patternName: string) => void | Promise<void>
}

export function PersonalityMatcher({ onComplete }: PersonalityMatcherProps): React.JSX.Element {
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeId>('staunch-nationalist')
  const [ideology, setIdeology] = useState<IdeologyProfile>({
    xenophobia: 50,
    diplomacy: 50,
    militancy: 50,
    expansionism: 50,
    determination: 50,
    trade: 50
  })
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  // Load all archetypes
  const { data: archetypes = [] } = useQuery({
    queryKey: ['archetypes'],
    queryFn: () => window.api.advisor.getAllArchetypes()
  })

  // Validate ideology
  const { success: isValid } = IdeologyProfileSchema.safeParse(ideology)

  // Match personality mutation
  const { data: matchResult, mutate: matchPersonality } = useMutation({
    mutationFn: () => window.api.advisor.matchPersonality(selectedArchetype, ideology),
    onSuccess: (data: PersonalityMatch) => {
      setSelectedProfile(data.primary.profileName)
    }
  })

  const selectedArchetypeInfo = archetypes.find((a) => a.id === selectedArchetype) ?? null

  // Trigger matching when ideology or archetype changes
  useEffect(() => {
    if (isValid) {
      matchPersonality()
    }
  }, [selectedArchetype, ideology, isValid, matchPersonality])

  const handleIdeologyChange = (key: keyof IdeologyProfile, value: string): void => {
    if (value === '') {
      // Allow empty string temporarily (will be invalid but user can type)
      setIdeology((prev) => ({ ...prev, [key]: 0 }))
    } else {
      const numValue = parseInt(value, 10)
      if (!isNaN(numValue)) {
        setIdeology((prev) => ({ ...prev, [key]: numValue }))
      }
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Aurora 4X Personality Matcher</h1>
          <p className="text-xs text-muted-foreground">
            Match your empire&apos;s ideology to a leadership personality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Select an archetype and adjust ideology values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ArchetypeSelector
                archetypes={archetypes}
                selectedArchetype={selectedArchetype}
                selectedArchetypeInfo={selectedArchetypeInfo}
                onSelect={setSelectedArchetype}
              />
              <IdeologyInputs ideology={ideology} onChange={handleIdeologyChange} />
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle>Match Results</CardTitle>
              <CardDescription>Personality patterns ranked by compatibility</CardDescription>
            </CardHeader>
            <CardContent>
              {!isValid ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-medium">Invalid ideology values</p>
                    <p className="text-[10px]">
                      Adjust your ideology values to valid ranges (1-100)
                    </p>
                  </div>
                </div>
              ) : !matchResult ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-medium">Calculating matches...</p>
                    <p className="text-[10px]">Personality patterns will appear automatically</p>
                  </div>
                </div>
              ) : (
                <>
                  <MatchResultsList
                    matchResult={matchResult}
                    selectedProfile={selectedProfile}
                    onSelectProfile={setSelectedProfile}
                  />
                  {onComplete && selectedProfile && (
                    <div className="pt-4">
                      <Button
                        onClick={() => onComplete(selectedArchetype, selectedProfile)}
                        className="w-full"
                      >
                        Confirm Selection: {selectedProfile}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
