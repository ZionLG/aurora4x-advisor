import { useState, useEffect, useMemo } from 'react'
import type {
  ArchetypeId,
  Archetype,
  IdeologyProfile,
  PersonalityMatch
} from '../../../main/advisor'

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

  const handleIdeologyChange = (key: keyof IdeologyProfile, value: number): void => {
    setIdeology((prev) => ({ ...prev, [key]: value }))
    setErrors([])
    setResult(null)
  }

  const handleMatch = async (): Promise<void> => {
    // Validate ideology
    const validation = await window.api.advisor.validateIdeology(ideology)
    if (!validation.valid) {
      setErrors(validation.errors)
      setResult(null)
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
  }

  const ideologyStats: Array<{
    key: keyof IdeologyProfile
    label: string
    min: number
    max: number
    step: number
  }> = [
    { key: 'xenophobia', label: 'Xenophobia', min: 1, max: 100, step: 1 },
    { key: 'diplomacy', label: 'Diplomacy', min: 1, max: 100, step: 1 },
    { key: 'militancy', label: 'Militancy', min: 1, max: 100, step: 1 },
    { key: 'expansionism', label: 'Expansionism', min: 1, max: 100, step: 1 },
    { key: 'determination', label: 'Determination', min: 1, max: 100, step: 1 },
    { key: 'trade', label: 'Trade', min: 1, max: 100, step: 1 },
    { key: 'translation', label: 'Translation', min: -25, max: 25, step: 1 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Aurora 4X Personality Matcher
        </h1>
        <p className="text-purple-300 text-center mb-8">
          Match your ideology profile to a personality archetype
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-purple-500/30">
            <h2 className="text-2xl font-semibold text-white mb-4">Configuration</h2>

            {/* Archetype Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-300 mb-2">Archetype</label>
              <select
                value={selectedArchetype}
                onChange={(e) => setSelectedArchetype(e.target.value as ArchetypeId)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-purple-500/50 focus:border-purple-400 focus:outline-none"
              >
                {archetypes.map((archetype) => (
                  <option key={archetype.id} value={archetype.id}>
                    {archetype.name}
                  </option>
                ))}
              </select>
              {selectedArchetypeInfo && (
                <p className="text-sm text-slate-400 mt-2">{selectedArchetypeInfo.description}</p>
              )}
            </div>

            {/* Ideology Sliders */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-3">Ideology Values</h3>
              {ideologyStats.map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-purple-300">{label}</label>
                    <span className="text-sm text-white bg-slate-700 px-2 py-1 rounded">
                      {ideology[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={ideology[key]}
                    onChange={(e) => handleIdeologyChange(key, Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{min}</span>
                    <span>{max}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Match Button */}
            <button
              onClick={handleMatch}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              Find Matching Personality
            </button>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4">
                <h4 className="text-red-300 font-semibold mb-2">Validation Errors:</h4>
                <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-purple-500/30">
            <h2 className="text-2xl font-semibold text-white mb-4">Match Results</h2>

            {!result ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <p className="text-center">
                  Configure your ideology values and click
                  <br />
                  &quot;Find Matching Personality&quot; to see results
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Primary Match */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-5 border-2 border-purple-400">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">{result.primary.patternName}</h3>
                      <p className="text-sm text-purple-300">Best Match</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-400">
                        {result.primary.confidence}%
                      </div>
                      <p className="text-xs text-slate-300">Confidence</p>
                    </div>
                  </div>
                  {result.primary.failedRules.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-500/30">
                      <p className="text-xs text-slate-400 mb-1">Weak areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.primary.failedRules.map((rule) => (
                          <span
                            key={rule}
                            className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded"
                          >
                            {rule}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternative Matches */}
                {result.alternatives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Alternative Matches</h3>
                    <div className="space-y-3">
                      {result.alternatives.map((alt) => (
                        <div
                          key={alt.patternId}
                          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{alt.patternName}</h4>
                              {alt.failedRules.length > 0 && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Weak: {alt.failedRules.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-lg font-bold text-blue-400">{alt.confidence}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Matches Summary */}
                {result.allMatches.length > 3 && (
                  <div className="mt-4">
                    <details className="bg-slate-700/30 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm text-purple-300 font-medium">
                        View All {result.allMatches.length} Patterns
                      </summary>
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {result.allMatches.map((match) => (
                          <div
                            key={match.patternId}
                            className="flex items-center justify-between text-sm p-2 bg-slate-800/50 rounded"
                          >
                            <span className="text-slate-300">{match.patternName}</span>
                            <span
                              className={`font-semibold ${match.confidence >= 70 ? 'text-green-400' : match.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}
                            >
                              {match.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
