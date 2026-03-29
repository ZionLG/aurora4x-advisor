import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Slider } from '@/app/components/ui/slider'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  Shield,
  Crosshair,
  Radio,
  Target,
} from 'lucide-react'
import type { GameInfo } from '@/shared/types'

type Step = 'pick-game' | 'personality'

const IDEOLOGY_STATS = [
  { key: 'xenophobia', label: 'Xenophobia', desc: 'Fear of other races', icon: Shield },
  { key: 'diplomacy', label: 'Diplomacy', desc: 'Negotiation skill', icon: Radio },
  { key: 'militancy', label: 'Militancy', desc: 'Use of military force', icon: Crosshair },
  { key: 'expansionism', label: 'Expansionism', desc: 'Desire to expand', icon: Target },
  { key: 'determination', label: 'Determination', desc: 'Perseverance', icon: Shield },
  { key: 'trade', label: 'Trade', desc: 'Willingness to trade', icon: Radio },
] as const

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { id: 'pick-game' as const, label: 'TARGET SELECTION', num: '01' },
    { id: 'personality' as const, label: 'ADVISOR ASSIGNMENT', num: '02' },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const isActive = s.id === current
        const isPast = current === 'personality' && i === 0
        return (
          <div key={s.id} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className="w-8 h-px mx-1"
                style={{
                  background: isPast
                    ? 'var(--cic-cyan)'
                    : 'var(--cic-panel-edge)',
                }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center justify-center w-5 h-5 rounded text-[8px] font-mono font-bold"
                style={{
                  background: isActive
                    ? 'var(--cic-cyan-glow)'
                    : isPast
                      ? 'var(--cic-cyan-glow)'
                      : 'transparent',
                  border: `1px solid ${isActive ? 'var(--cic-cyan)' : isPast ? 'var(--cic-cyan-dim)' : 'var(--cic-panel-edge)'}`,
                  color: isActive
                    ? 'var(--cic-cyan)'
                    : isPast
                      ? 'var(--cic-cyan-dim)'
                      : 'var(--cic-panel-edge)',
                }}
              >
                {isPast ? <Check className="w-2.5 h-2.5" /> : s.num}
              </div>
              <span
                className="text-[8px] font-semibold tracking-[0.15em]"
                style={{
                  color: isActive
                    ? 'var(--cic-cyan)'
                    : isPast
                      ? 'var(--cic-cyan-dim)'
                      : 'var(--cic-panel-edge)',
                }}
              >
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 w-20">
      <div className="flex-1 h-1 rounded-full bg-[var(--cic-void)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background:
              value >= 80
                ? 'var(--cic-green)'
                : value >= 50
                  ? 'var(--cic-amber)'
                  : 'var(--cic-red)',
          }}
        />
      </div>
      <span
        className="text-[9px] font-mono w-7 text-right"
        style={{
          color:
            value >= 80
              ? 'var(--cic-green)'
              : value >= 50
                ? 'var(--cic-amber)'
                : 'var(--foreground)',
          opacity: value >= 50 ? 1 : 0.4,
        }}
      >
        {value}%
      </span>
    </div>
  )
}

export function SetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('pick-game')
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null)
  const [ideology, setIdeology] = useState<Record<string, number>>({
    xenophobia: 50,
    diplomacy: 50,
    militancy: 50,
    expansionism: 50,
    determination: 50,
    trade: 50,
  })

  const {
    data: dbGames,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['session', 'detectGame'],
    queryFn: () => window.conveyor.session.detectGame(),
  })

  const { data: savedGames } = useQuery({
    queryKey: ['session', 'games'],
    queryFn: () => window.conveyor.session.listGames(),
  })

  const { data: archetypes } = useQuery({
    queryKey: ['advisor', 'archetypes'],
    queryFn: () => window.conveyor.advisor.getArchetypes(),
  })

  const { data: matchResult } = useQuery({
    queryKey: ['advisor', 'match', ideology],
    queryFn: () =>
      window.conveyor.advisor.matchPersonality(
        ideology as Parameters<typeof window.conveyor.advisor.matchPersonality>[0],
      ),
    enabled: step === 'personality',
    placeholderData: (prev) => prev,
  })

  const trackedNames = new Set(
    (savedGames ?? []).map((g: { gameInfo: { gameName: string } }) => g.gameInfo.gameName),
  )
  const availableGames = dbGames?.filter((g: GameInfo) => !trackedNames.has(g.gameName)) ?? []
  const alreadyTracked = dbGames?.filter((g: GameInfo) => trackedNames.has(g.gameName)) ?? []

  const finishSetup = async (archetype?: string, archetypeName?: string) => {
    if (!selectedGame) return

    await window.conveyor.session.addGame(selectedGame)

    const games = await window.conveyor.session.listGames()
    const newGame = games.find((g) => g.gameInfo.gameName === selectedGame.gameName)
    if (newGame && archetype) {
      await window.conveyor.session.updatePersonality(newGame.id, archetype, archetypeName ?? null)
    }

    queryClient.invalidateQueries({ queryKey: ['session', 'games'] })

    toast.success('Campaign initialized', {
      description: `${selectedGame.gameName} is ready for operations`,
    })
    navigate('/dashboard')
  }

  return (
    <div className="flex h-full flex-col bg-[var(--cic-void)]">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--cic-amber)] cic-glow-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cic-amber)]">
                Mission Init
              </span>
            </div>
            <div className="h-4 w-px bg-[var(--cic-panel-edge)]" />
            <StepIndicator current={step} />
          </div>
          <Button
            size="xs"
            variant="ghost"
            className="text-foreground/30 hover:text-foreground/60"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-3 w-3" />
            Abort
          </Button>
        </div>
      </div>

      {/* ── Step 1: Target Selection ────────────────────── */}
      {step === 'pick-game' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full items-center justify-center p-8">
            <div className="w-full max-w-xl cic-slide-up">
              {/* Briefing header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--cic-cyan-glow)] border border-[var(--cic-cyan-dim)]/30">
                  <Target className="h-4 w-4 text-[var(--cic-cyan)]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground/90">Target Selection</h2>
                  <p className="text-[9px] text-foreground/40">
                    Select a campaign from Aurora&apos;s database to initialize tracking
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
                {/* Scanning state */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
                    <span className="text-[10px] font-mono text-[var(--cic-cyan-dim)]">
                      Scanning Aurora database...
                    </span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-5 space-y-3">
                    <div className="rounded border-l-2 border-[var(--cic-red)] bg-[var(--cic-red)]/5 p-3">
                      <p className="text-[9px] font-semibold uppercase text-[var(--cic-red)] mb-1">
                        Scan Failed
                      </p>
                      <p className="text-[10px] text-foreground/40">
                        Check your database path in Settings.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="h-3 w-3" />
                      Retry Scan
                    </Button>
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && availableGames.length === 0 && (
                  <div className="p-5 space-y-3">
                    <p className="text-[10px] text-foreground/40">
                      {dbGames?.length === 0
                        ? 'No campaigns detected in Aurora database. Launch Aurora and create a game first.'
                        : 'All detected campaigns are already being tracked.'}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="h-3 w-3" />
                      Rescan
                    </Button>
                  </div>
                )}

                {/* Game list */}
                {availableGames.length > 0 && (
                  <div className="divide-y divide-[var(--cic-panel-edge)]">
                    {availableGames.map((game: GameInfo) => {
                      const isSelected = selectedGame?.gameName === game.gameName
                      return (
                        <button
                          key={game.auroraGameId}
                          onClick={() => setSelectedGame(game)}
                          className="w-full text-left px-4 py-3 transition-all relative group"
                          style={{
                            background: isSelected
                              ? 'var(--cic-cyan-glow)'
                              : 'transparent',
                          }}
                        >
                          {/* Selection indicator */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-[2px] transition-all"
                            style={{
                              background: isSelected ? 'var(--cic-cyan)' : 'transparent',
                            }}
                          />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-1.5 rounded-full transition-all"
                                style={{
                                  background: isSelected
                                    ? 'var(--cic-cyan)'
                                    : 'var(--cic-panel-edge)',
                                  boxShadow: isSelected
                                    ? '0 0 6px var(--cic-cyan)'
                                    : 'none',
                                }}
                              />
                              <span
                                className={`text-[11px] font-medium transition-colors ${
                                  isSelected ? 'text-[var(--cic-cyan)]' : 'text-foreground/70 group-hover:text-foreground/90'
                                }`}
                              >
                                {game.gameName}
                              </span>
                            </div>
                            <span className="rounded px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider bg-[var(--cic-amber-glow)] text-[var(--cic-amber-dim)] border border-[var(--cic-amber-dim)]/20">
                              {game.techLevel}
                            </span>
                          </div>
                          <p className="mt-1 ml-3.5 text-[9px] text-foreground/30">
                            {game.empireName} — Starting Year {game.startingYear}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Already tracked */}
                {alreadyTracked.length > 0 && (
                  <div className="border-t border-[var(--cic-panel-edge)] px-4 py-3 bg-[var(--cic-void)]/50">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-foreground/15 mb-1.5">
                      Already Tracked ({alreadyTracked.length})
                    </p>
                    {alreadyTracked.map((game: GameInfo) => (
                      <p key={game.auroraGameId} className="text-[9px] text-foreground/15 py-0.5 ml-3.5">
                        {game.gameName}
                      </p>
                    ))}
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center justify-between border-t border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-foreground/40"
                      onClick={() => navigate('/')}
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-foreground/25 hover:text-[var(--cic-cyan-dim)]"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Rescan
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedGame}
                    className="bg-[var(--cic-amber)]/10 text-[var(--cic-amber)] border border-[var(--cic-amber-dim)]/40 hover:bg-[var(--cic-amber)]/20 hover:border-[var(--cic-amber)]/50 disabled:opacity-20 transition-all"
                    onClick={() => setStep('personality')}
                  >
                    Proceed to Advisor Assignment
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Advisor Assignment ──────────────────── */}
      {step === 'personality' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 cic-slide-up">
            {/* Briefing header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--cic-amber-glow)] border border-[var(--cic-amber-dim)]/30">
                  <Shield className="h-4 w-4 text-[var(--cic-amber)]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground/90">
                    Advisor Assignment
                    <span className="ml-2 text-[10px] font-normal text-[var(--cic-cyan)]">
                      {selectedGame?.gameName}
                    </span>
                  </h2>
                  <p className="text-[9px] text-foreground/40">
                    Define your government&apos;s ideology profile. The AI advisor adapts to match.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-foreground/40" onClick={() => setStep('pick-game')}>
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-foreground/25 hover:text-foreground/50"
                  onClick={() => finishSetup()}
                >
                  Skip — assign later
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* ── Ideology Panel (3 cols) ── */}
              <div className="lg:col-span-3 rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/30">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--cic-amber-dim)]">
                    Ideology Profile
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {IDEOLOGY_STATS.map(({ key, label, desc, icon: Icon }) => (
                    <div key={key} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3 text-foreground/20 group-hover:text-[var(--cic-cyan-dim)] transition-colors" />
                          <span className="text-[11px] font-medium text-foreground/70">{label}</span>
                          <span className="text-[8px] text-foreground/20">{desc}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[11px] font-mono font-bold tabular-nums w-7 text-right"
                            style={{
                              color:
                                ideology[key] >= 75
                                  ? 'var(--cic-amber)'
                                  : ideology[key] >= 50
                                    ? 'var(--cic-cyan)'
                                    : 'var(--foreground)',
                              opacity: ideology[key] >= 50 ? 1 : 0.4,
                            }}
                          >
                            {ideology[key]}
                          </span>
                        </div>
                      </div>
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[ideology[key]]}
                        onValueChange={([v]) => setIdeology((prev) => ({ ...prev, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Match Results (2 cols) ── */}
              <div className="lg:col-span-2 rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/30">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--cic-amber-dim)]">
                    Archetype Analysis
                  </span>
                </div>

                {matchResult ? (
                  <>
                  <div className="divide-y divide-[var(--cic-panel-edge)]">
                    {[...matchResult.allMatches]
                      .sort((a, b) => a.archetypeId.localeCompare(b.archetypeId))
                      .map((m) => {
                      const arch = archetypes?.find((a) => a.id === m.archetypeId)
                      const isBest = m.archetypeId === matchResult.primary.archetypeId
                      return (
                        <div
                          key={m.archetypeId}
                          className="px-4 py-2.5 transition-all relative"
                          style={{
                            background: isBest ? 'var(--cic-cyan-glow)' : 'transparent',
                          }}
                        >
                          {isBest && (
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cic-cyan)]" />
                          )}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-medium ${
                                isBest ? 'text-[var(--cic-cyan)]' : 'text-foreground/50'
                              }`}
                            >
                              {arch?.name ?? m.archetypeId}
                            </span>
                            <ConfidenceBar value={m.confidence} />
                          </div>
                          {arch && (
                            <p className="mt-1 text-[8px] text-foreground/25 line-clamp-1 pr-20">
                              {arch.description}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Deploy button — fixed at bottom */}
                  {(() => {
                    const best = matchResult.primary
                    const bestArch = archetypes?.find((a) => a.id === best.archetypeId)
                    return (
                      <div className="border-t border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/30 px-4 py-3">
                        <Button
                          size="sm"
                          className="w-full bg-[var(--cic-amber)]/10 text-[var(--cic-amber)] border border-[var(--cic-amber-dim)]/40 hover:bg-[var(--cic-amber)]/20 hover:border-[var(--cic-amber)]/50 transition-all"
                          onClick={() =>
                            finishSetup(best.archetypeId, bestArch?.name ?? best.archetypeId)
                          }
                        >
                          <Check className="h-3 w-3" />
                          Deploy {bestArch?.name ?? best.archetypeId}
                        </Button>
                      </div>
                    )
                  })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-16">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--cic-cyan-dim)]" />
                    <span className="text-[9px] font-mono text-foreground/20">
                      Analyzing ideology profile...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
