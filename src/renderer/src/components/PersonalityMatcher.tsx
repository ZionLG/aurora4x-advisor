import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
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

  const handleInputChange = (key: keyof IdeologyProfile, value: string): void => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue)) {
      const stat = ideologyStats.find((s) => s.key === key)
      if (stat) {
        const clampedValue = Math.max(stat.min, Math.min(stat.max, numValue))
        setIdeology((prev) => ({ ...prev, [key]: clampedValue }))
        setErrors([])
        setResult(null)
      }
    }
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
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Aurora 4X Personality Matcher</h1>
            <p className="text-xs text-muted-foreground">
              Match your empire&apos;s ideology to a leadership personality
            </p>
          </div>
          <ModeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Select an archetype and adjust ideology values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Archetype Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="archetype" className="text-xs">
                  Leadership Archetype
                </Label>
                <Select
                  value={selectedArchetype}
                  onValueChange={(value) => setSelectedArchetype(value as ArchetypeId)}
                >
                  <SelectTrigger id="archetype" className="h-8 text-sm">
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
                  <p className="text-xs text-muted-foreground leading-tight">
                    {selectedArchetypeInfo.description}
                  </p>
                )}
              </div>

              {/* Ideology Inputs */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium">Ideology Profile</h3>
                {ideologyStats.map(({ key, label, min, max }) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground text-right w-6">{min}</span>
                      <Input
                        id={key}
                        type="number"
                        min={min}
                        max={max}
                        value={ideology[key]}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="w-14 h-6 text-xs text-center"
                      />
                      <span className="text-[10px] text-muted-foreground w-6">{max}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Match Button */}
              <Button onClick={handleMatch} disabled={isLoading} className="w-full h-8 text-sm">
                {isLoading ? 'Matching...' : 'Find Matching Personality'}
              </Button>

              {/* Errors */}
              {errors.length > 0 && (
                <Card className="border-destructive">
                  <CardContent className="pt-3">
                    <h4 className="text-xs font-semibold mb-1">Validation Errors:</h4>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
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
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-medium">No results yet</p>
                    <p className="text-[10px]">
                      Configure your ideology and click &quot;Find Matching Personality&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Primary Match */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{result.primary.patternName}</CardTitle>
                          <Badge className="text-xs">Best Match</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{result.primary.confidence}%</div>
                          <p className="text-[10px] text-muted-foreground">Confidence</p>
                        </div>
                      </div>
                    </CardHeader>
                    {result.primary.failedRules.length > 0 && (
                      <CardContent className="pt-0">
                        <p className="text-[10px] text-muted-foreground mb-1">Weak areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.primary.failedRules.map((rule) => (
                            <Badge key={rule} variant="destructive" className="text-[10px]">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Alternative Matches */}
                  {result.alternatives.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-medium">Alternative Matches</h3>
                      <div className="space-y-1.5">
                        {result.alternatives.map((alt) => (
                          <Card key={alt.patternId}>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-medium">{alt.patternName}</h4>
                                  {alt.failedRules.length > 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Weak: {alt.failedRules.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs font-bold">
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
                      <summary className="cursor-pointer text-xs font-medium list-none">
                        <span className="flex items-center gap-1.5">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          View All {result.allMatches.length} Patterns
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {result.allMatches.map((match) => (
                          <div
                            key={match.patternId}
                            className="flex items-center justify-between text-xs p-2 rounded-lg border"
                          >
                            <span>{match.patternName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {match.confidence}%
                            </Badge>
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
