import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { ModeToggle } from './mode-toggle'

// Infer types from the window.api
type AdvisorAPI = typeof window.api.advisor
type ArchetypeId = Awaited<ReturnType<AdvisorAPI['getAllArchetypeIds']>>[number]
type Archetype = Awaited<ReturnType<AdvisorAPI['getArchetype']>>
type IdeologyProfile = {
  xenophobia: number
  diplomacy: number
  militancy: number
  expansionism: number
  determination: number
  trade: number
  translation: number
}
type PersonalityMatch = Awaited<ReturnType<AdvisorAPI['matchPersonality']>>

export default function PersonalityMatcher(): React.JSX.Element {
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeId>('staunch-nationalist')
  const [ideology, setIdeology] = useState<IdeologyProfile>({
    xenophobia: 50,
    diplomacy: 50,
    militancy: 50,
    expansionism: 50,
    determination: 50,
    trade: 50,
    translation: 0
  })
  const [result, setResult] = useState<PersonalityMatch | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load all archetypes on mount
  useEffect(() => {
    const loadArchetypes = async (): Promise<void> => {
      const ids = await window.api.advisor.getAllArchetypeIds()
      const loaded = await Promise.all(ids.map((id) => window.api.advisor.getArchetype(id)))
      setArchetypes(loaded)
    }
    loadArchetypes()
  }, [])

  // Derive selected archetype info from archetypes array
  const selectedArchetypeInfo = useMemo(
    () => archetypes.find((a) => a.id === selectedArchetype) || null,
    [archetypes, selectedArchetype]
  )

  const handleIdeologyChange = (key: keyof IdeologyProfile, value: number[]): void => {
    setIdeology((prev) => ({ ...prev, [key]: value[0] }))
    setErrors([])
    setResult(null)
  }

  const handleMatch = async (): Promise<void> => {
    setIsLoading(true)
    // Validate ideology
    const validation = await window.api.advisor.validateIdeology(ideology)
    if (!validation.valid) {
      setErrors(validation.errors)
      setResult(null)
      setIsLoading(false)
      return
    }

    // Perform matching
    try {
      const matchResult = await window.api.advisor.matchPersonality(selectedArchetype, ideology)
      setResult(matchResult)
      setErrors([])
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Unknown error occurred'])
      setResult(null)
    }
    setIsLoading(false)
  }

  const ideologyStats: Array<{
    key: keyof IdeologyProfile
    label: string
    min: number
    max: number
  }> = [
    { key: 'xenophobia', label: 'Xenophobia', min: 1, max: 100 },
    { key: 'diplomacy', label: 'Diplomacy', min: 1, max: 100 },
    { key: 'militancy', label: 'Militancy', min: 1, max: 100 },
    { key: 'expansionism', label: 'Expansionism', min: 1, max: 100 },
    { key: 'determination', label: 'Determination', min: 1, max: 100 },
    { key: 'trade', label: 'Trade', min: 1, max: 100 },
    { key: 'translation', label: 'Translation', min: -25, max: 25 }
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Aurora 4X Personality Matcher</h1>
            <p className="text-lg text-muted-foreground">
              Match your empire&apos;s ideology to a leadership personality
            </p>
          </div>
          <ModeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Select an archetype and adjust ideology values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Archetype Selector */}
              <div className="space-y-2">
                <Label htmlFor="archetype">Leadership Archetype</Label>
                <Select
                  value={selectedArchetype}
                  onValueChange={(value) => setSelectedArchetype(value as ArchetypeId)}
                >
                  <SelectTrigger id="archetype">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {archetypes.map((archetype) => (
                      <SelectItem key={archetype.id} value={archetype.id}>
                        {archetype.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedArchetypeInfo && (
                  <p className="text-sm text-muted-foreground">
                    {selectedArchetypeInfo.description}
                  </p>
                )}
              </div>

              {/* Ideology Sliders */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Ideology Profile</h3>
                {ideologyStats.map(({ key, label, min, max }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm">
                        {label}
                      </Label>
                      <Badge variant="secondary">{ideology[key]}</Badge>
                    </div>
                    <Slider
                      id={key}
                      min={min}
                      max={max}
                      step={1}
                      value={[ideology[key]]}
                      onValueChange={(value) => handleIdeologyChange(key, value)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{min}</span>
                      <span>{max}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Match Button */}
              <Button onClick={handleMatch} disabled={isLoading} className="w-full">
                {isLoading ? 'Matching...' : 'Find Matching Personality'}
              </Button>

              {/* Errors */}
              {errors.length > 0 && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Validation Errors:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle>Match Results</CardTitle>
              <CardDescription>Personality patterns ranked by compatibility</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <p className="text-lg">No results yet</p>
                    <p className="text-sm">
                      Configure your ideology and click &quot;Find Matching Personality&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Primary Match */}
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-xl">{result.primary.patternName}</CardTitle>
                          <Badge>Best Match</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">{result.primary.confidence}%</div>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                        </div>
                      </div>
                    </CardHeader>
                    {result.primary.failedRules.length > 0 && (
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-2">Weak areas:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.primary.failedRules.map((rule) => (
                            <Badge key={rule} variant="destructive" className="text-xs">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Alternative Matches */}
                  {result.alternatives.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Alternative Matches</h3>
                      <div className="space-y-3">
                        {result.alternatives.map((alt) => (
                          <Card key={alt.patternId}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{alt.patternName}</h4>
                                  {alt.failedRules.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Weak: {alt.failedRules.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-lg font-bold">
                                  {alt.confidence}%
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Matches Summary */}
                  {result.allMatches.length > 3 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium list-none">
                        <span className="flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          View All {result.allMatches.length} Patterns
                        </span>
                      </summary>
                      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                        {result.allMatches.map((match) => (
                          <div
                            key={match.patternId}
                            className="flex items-center justify-between text-sm p-3 rounded-lg border"
                          >
                            <span>{match.patternName}</span>
                            <Badge variant="outline">{match.confidence}%</Badge>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
