import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Switch } from '@/app/components/ui/switch'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  Target,
  Crown,
  Scroll,
  Landmark,
  BrainCog,
  AlertTriangle,
} from 'lucide-react'
import type { GameInfo, ArchetypeId, GovernmentProfile, Ministry } from '@/shared/types'
import { ProfileSelector } from './components/ProfileSelector'
import { IdeologySliders } from './components/IdeologySliders'
import { MinistryEditor, type TempMinistry } from './components/MinistryEditor'
import { type ProfilePreset, EVENT_TAGS } from './components/profile-presets'

type Step = 'pick-game' | 'government'

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { id: 'pick-game' as const, label: 'SELECT GAME', num: '01' },
    { id: 'government' as const, label: 'FORM GOVERNMENT', num: '02' },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const isActive = s.id === current
        const isPast = current === 'government' && i === 0
        return (
          <div key={s.id} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className="mx-1 h-px w-8"
                style={{ background: isPast ? 'var(--cic-cyan)' : 'var(--cic-panel-edge)' }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="
                  flex size-5 items-center justify-center rounded-sm font-mono
                  text-[8px] font-bold
                "
                style={{
                  background: isActive || isPast ? 'var(--cic-cyan-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--cic-cyan)' : isPast ? 'var(--cic-cyan-dim)' : 'var(--cic-panel-edge)'}`,
                  color: isActive ? 'var(--cic-cyan)' : isPast ? 'var(--cic-cyan-dim)' : 'var(--cic-panel-edge)',
                }}
              >
                {isPast ? <Check className="size-2.5" /> : s.num}
              </div>
              <span
                className="text-[8px] font-semibold tracking-[0.15em]"
                style={{
                  color: isActive ? 'var(--cic-cyan)' : isPast ? 'var(--cic-cyan-dim)' : 'var(--cic-panel-edge)',
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

function SectionDivider({
  icon: Icon,
  label,
  tag,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  tag: string
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div
        className="
          flex size-7 items-center justify-center rounded-sm border
          border-(--cic-amber-dim)/30 bg-(--cic-amber-glow)
        "
      >
        <Icon className="size-3.5 text-(--cic-amber)" />
      </div>
      <div className="flex flex-1 items-center gap-2">
        <span
          className="
            text-[10px] font-semibold tracking-[0.2em] text-(--cic-amber)
            uppercase
          "
        >
          {label}
        </span>
        <div
          className="
            h-px flex-1 bg-linear-to-r from-(--cic-amber-dim)/40 to-transparent
          "
        />
        <span
          className="font-mono text-[8px] text-(--cic-amber-dim)/50 uppercase"
        >
          {tag}
        </span>
      </div>
    </div>
  )
}

export function SetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('pick-game')
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null)

  // Government state
  const [noAi, setNoAi] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  // Check AI availability when entering government step
  useEffect(() => {
    if (step === 'government') {
      window.conveyor.settings.verifyAi().then((status) => {
        if (!status.connected) {
          setNoAi(true)
          setAiUnavailable(true)
        } else {
          setAiUnavailable(false)
        }
      })
    }
  }, [step])
  const [selectedProfile, setSelectedProfile] = useState<ProfilePreset | null>(null)
  const [customProfile, setCustomProfile] = useState<GovernmentProfile | null>(null)
  const [customArchetype, setCustomArchetype] = useState<ArchetypeId | null>(null)
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [ideology, setIdeology] = useState<Record<string, number>>({
    xenophobia: 50,
    diplomacy: 50,
    militancy: 50,
    expansionism: 50,
    determination: 50,
    trade: 50,
  })
  const [ministries, setMinistries] = useState<TempMinistry[]>([])

  // Queries
  const {
    data: dbGames,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ['session', 'detectGame'], queryFn: () => window.conveyor.session.detectGame() })
  const { data: savedGames } = useQuery({
    queryKey: ['session', 'games'],
    queryFn: () => window.conveyor.session.listGames(),
  })
  const { data: archetypes } = useQuery({
    queryKey: ['government', 'archetypes'],
    queryFn: () => window.conveyor.government.getArchetypes(),
  })

  const trackedNames = new Set((savedGames ?? []).map((g: { gameInfo: { gameName: string } }) => g.gameInfo.gameName))
  const availableGames = dbGames?.filter((g: GameInfo) => !trackedNames.has(g.gameName)) ?? []
  const alreadyTracked = dbGames?.filter((g: GameInfo) => trackedNames.has(g.gameName)) ?? []

  const resolvedArchetype: ArchetypeId = creatingCustom
    ? (customArchetype ?? 'military-strategist')
    : (selectedProfile?.archetype ?? 'military-strategist')
  const resolvedArchetypeInfo = archetypes?.find((a) => a.id === resolvedArchetype)
  const activeProfile = creatingCustom ? customProfile : (selectedProfile?.profile ?? null)
  // All tags must be assigned, and every ministry must have at least one tag
  const allAssignedTags = new Set(ministries.flatMap((m) => m.tags))
  const allTagsCovered = EVENT_TAGS.every((t) => allAssignedTags.has(t.id))
  const noEmptyMinistries = ministries.length > 0 && ministries.every((m) => m.tags.length > 0)
  const canEstablish = allTagsCovered && noEmptyMinistries && (noAi || (activeProfile?.name && resolvedArchetype))

  const applyProfile = (preset: ProfilePreset) => {
    setSelectedProfile(preset)
    setCustomProfile(null)
    setCreatingCustom(false)
    setIdeology({ ...preset.ideology })
    setMinistries(preset.ministries.map((m) => ({ ...m, tempId: crypto.randomUUID() })))
  }

  const startCustom = () => {
    setSelectedProfile(null)
    setCreatingCustom(true)
    setCustomProfile(null)
    setCustomArchetype(null)
  }

  const handleCustomUpdate = (profile: GovernmentProfile, archetype: ArchetypeId) => {
    setCustomProfile(profile)
    setCustomArchetype(archetype)
  }

  const finishSetup = async () => {
    if (!selectedGame || !canEstablish) return
    await window.conveyor.session.addGame(selectedGame)
    const games = await window.conveyor.session.listGames()
    const newGame = games.find((g) => g.gameInfo.gameName === selectedGame.gameName)
    if (newGame && !noAi) {
      await window.conveyor.government.setGovernment({
        archetypeId: resolvedArchetype,
        archetypeOverride: false,
        profile: activeProfile,
        ideology: ideology as Parameters<typeof window.conveyor.government.matchPersonality>[0],
        ministries: ministries.map(
          (m) =>
            ({
              id: crypto.randomUUID(),
              name: m.name,
              tags: m.tags,
              description: m.description,
              toneOverride: m.toneOverride,
            }) as Ministry
        ),
      })
    } else if (newGame && noAi && ministries.length > 0) {
      // No AI mode — save ministries only (for event routing), no profile/ideology
      await window.conveyor.government.setGovernment({
        archetypeId: 'military-strategist', // placeholder, unused without AI
        archetypeOverride: false,
        profile: null,
        ideology: { xenophobia: 50, diplomacy: 50, militancy: 50, expansionism: 50, determination: 50, trade: 50 },
        ministries: ministries.map(
          (m) =>
            ({
              id: crypto.randomUUID(),
              name: m.name,
              tags: m.tags,
              description: m.description,
              toneOverride: m.toneOverride,
            }) as Ministry
        ),
      })
    }
    queryClient.invalidateQueries({ queryKey: ['session', 'games'] })
    toast.success('Government established', {
      description: noAi
        ? `${selectedGame.gameName} — Raw data mode (no AI advisor)`
        : `${resolvedArchetypeInfo?.name ?? 'Custom'} government for ${selectedGame.gameName}`,
    })
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col bg-(--cic-void)">
      {/* Header */}
      <div
        className="shrink-0 border-b border-(--cic-panel-edge) bg-(--cic-panel)"
      >
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="cic-glow-pulse size-2 rounded-full bg-(--cic-amber)"
              />
              <span
                className="
                  text-[10px] font-semibold tracking-[0.2em] text-(--cic-amber)
                  uppercase
                "
              >
                New Campaign
              </span>
            </div>
            <div className="h-4 w-px bg-(--cic-panel-edge)" />
            <StepIndicator current={step} />
          </div>
          <Button
            size="xs"
            variant="ghost"
            className="
              text-foreground/30
              hover:text-foreground/60
            "
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="size-3" /> Abort
          </Button>
        </div>
      </div>

      {/* Step 1: Pick Game */}
      {step === 'pick-game' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full items-center justify-center p-8">
            <div className="cic-slide-up w-full max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="
                    flex size-8 items-center justify-center rounded-sm border
                    border-(--cic-cyan-dim)/30 bg-(--cic-cyan-glow)
                  "
                >
                  <Target className="size-4 text-(--cic-cyan)" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground/90">Target Selection</h2>
                  <p className="text-[9px] text-foreground/40">Select a campaign from Aurora&apos;s database</p>
                </div>
              </div>
              <div
                className="
                  overflow-hidden rounded-md border border-(--cic-panel-edge)
                  bg-(--cic-panel)
                "
              >
                {isLoading && (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2
                      className="size-5 animate-spin text-(--cic-cyan-dim)"
                    />
                    <span
                      className="font-mono text-[10px] text-(--cic-cyan-dim)"
                    >
                      Scanning...
                    </span>
                  </div>
                )}
                {error && (
                  <div className="space-y-3 p-5">
                    <div
                      className="
                        rounded-sm border-l-2 border-(--cic-red)
                        bg-(--cic-red)/5 p-3
                      "
                    >
                      <p className="text-[10px] text-foreground/40">Check database path in Settings.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="size-3" />
                      Retry
                    </Button>
                  </div>
                )}
                {!isLoading && !error && availableGames.length === 0 && (
                  <div className="space-y-3 p-5">
                    <p className="text-[10px] text-foreground/40">
                      {dbGames?.length === 0 ? 'No campaigns detected.' : 'All campaigns tracked.'}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="size-3" />
                      Rescan
                    </Button>
                  </div>
                )}
                {availableGames.length > 0 && (
                  <div className="divide-y divide-(--cic-panel-edge)">
                    {availableGames.map((game: GameInfo) => {
                      const isSel = selectedGame?.gameName === game.gameName
                      return (
                        <button
                          key={game.auroraGameId}
                          onClick={() => setSelectedGame(game)}
                          className={`
                            group relative w-full px-4 py-3 text-left
                            transition-[background-color,box-shadow]
                            duration-300 ease-out
                            ${
                              isSel
                                ? 'bg-(--cic-cyan-glow)'
                                : `hover:bg-(--cic-cyan-glow)`
                            }
                          `}
                        >
                          {/* Left accent bar */}
                          <div
                            className={`
                              absolute inset-y-0 left-0 transition-all
                              duration-300 ease-out
                              ${
                                isSel
                                  ? 'w-[3px]'
                                  : `
                                    w-[2px]
                                    group-hover:w-[3px]
                                  `
                              }
                            `}
                            style={{
                              background: isSel ? 'var(--cic-cyan)' : 'var(--cic-panel-edge)',
                              boxShadow: isSel ? '0 0 10px var(--cic-cyan), 0 0 4px var(--cic-cyan)' : 'none',
                            }}
                          />
                          {/* Hover-only glow layer for the left bar (overlays the base bar when not selected) */}
                          {!isSel && (
                            <div
                              className="
                                pointer-events-none absolute inset-y-0 left-0
                                w-[3px] opacity-0 transition-opacity
                                duration-300 ease-out
                                group-hover:opacity-100
                              "
                              style={{
                                background: 'var(--cic-cyan-dim)',
                                boxShadow: '0 0 10px var(--cic-cyan-dim), 0 0 4px var(--cic-cyan-dim)',
                              }}
                            />
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`
                                  size-1.5 rounded-full transition-all
                                  duration-300 ease-out
                                  ${!isSel ? 'group-hover:scale-110' : ''}
                                `}
                                style={{
                                  background: isSel ? 'var(--cic-cyan)' : 'var(--cic-panel-edge)',
                                  boxShadow: isSel ? '0 0 6px var(--cic-cyan)' : 'none',
                                }}
                              />
                              <span
                                className={`
                                  text-[11px] font-medium transition-colors
                                  duration-300 ease-out
                                  ${
                                    isSel
                                      ? 'text-(--cic-cyan)'
                                      : `
                                        text-foreground/50
                                        group-hover:text-foreground
                                      `
                                  }
                                `}
                              >
                                {game.gameName}
                              </span>
                            </div>
                            <span
                              className="
                                rounded-sm border border-(--cic-amber-dim)/20
                                bg-(--cic-amber-glow) px-1.5 py-0.5 text-[7px]
                                font-bold text-(--cic-amber-dim) uppercase
                              "
                            >
                              {game.techLevel}
                            </span>
                          </div>
                          <p
                            className={`
                              mt-1 ml-3.5 text-[9px] transition-colors
                              duration-300 ease-out
                              ${
                                isSel
                                  ? 'text-foreground/40'
                                  : `
                                    text-foreground/30
                                    group-hover:text-foreground/50
                                  `
                              }
                            `}
                          >
                            {game.empireName} — Year {game.startingYear}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
                {alreadyTracked.length > 0 && (
                  <div
                    className="
                      border-t border-(--cic-panel-edge) bg-(--cic-void)/50 px-4
                      py-3
                    "
                  >
                    <p
                      className="
                        mb-1.5 text-[8px] font-semibold tracking-wider
                        text-muted-foreground/70 uppercase
                      "
                    >
                      Already Tracked ({alreadyTracked.length})
                    </p>
                    {alreadyTracked.map((g: GameInfo) => (
                      <p
                        key={g.auroraGameId}
                        className="
                          ml-3.5 py-0.5 text-[9px] text-muted-foreground/70
                        "
                      >
                        {g.gameName}
                      </p>
                    ))}
                  </div>
                )}
                <div
                  className="
                    flex items-center justify-between border-t
                    border-(--cic-panel-edge) bg-(--cic-void)/30 px-4 py-3
                  "
                >
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-foreground/40"
                      onClick={() => navigate('/')}
                    >
                      <ArrowLeft className="size-3" />
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="
                        text-muted-foreground
                        hover:text-(--cic-cyan-dim)
                      "
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="size-3" />
                      Rescan
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedGame}
                    className="
                      border border-(--cic-amber-dim)/40 bg-(--cic-amber)/10
                      text-(--cic-amber) transition-all
                      hover:bg-(--cic-amber)/20
                      disabled:opacity-20
                    "
                    onClick={() => setStep('government')}
                  >
                    Form Government <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Form Government */}
      {step === 'government' && (
        <div className="flex-1 overflow-y-auto">
          <div className="cic-slide-up mx-auto max-w-5xl space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground/90">
                  Form Government{' '}
                  <span
                    className="ml-2 text-[11px] font-normal text-(--cic-cyan)"
                  >
                    {selectedGame?.gameName}
                  </span>
                </h2>
                <p className="mt-0.5 text-[10px] text-foreground/35">
                  Select a government profile — this defines how your AI government speaks and thinks.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" className="text-foreground/40" onClick={() => setStep('pick-game')}>
                  <ArrowLeft className="size-3" /> Back
                </Button>
                <div
                  className="
                    flex items-center gap-2 rounded-md border
                    border-(--cic-panel-edge) bg-(--cic-panel) px-2.5 py-1.5
                  "
                >
                  <BrainCog
                    className={`
                      size-3
                      ${noAi ? `text-(--cic-amber)` : `text-muted-foreground`}
                    `}
                  />
                  <span
                    className={`
                      text-[9px] font-medium
                      ${noAi ? `text-(--cic-amber)` : `text-foreground/30`}
                    `}
                  >
                    No AI
                  </span>
                  <Switch
                    checked={noAi}
                    onCheckedChange={(val) => {
                      if (!val && aiUnavailable) return // Can't enable AI if provider is unavailable
                      setNoAi(val)
                    }}
                    disabled={aiUnavailable && !noAi}
                  />
                </div>
              </div>
            </div>

            {/* No AI warning banner */}
            {noAi && (
              <div
                className={`
                  flex items-start gap-3 rounded-md border px-4 py-3
                  ${
                    aiUnavailable
                      ? 'border-(--cic-red)/30 bg-(--cic-red)/5'
                      : `border-(--cic-amber-dim)/40 bg-(--cic-amber-glow)`
                  }
                `}
              >
                <AlertTriangle
                  className={`
                    mt-0.5 size-4 shrink-0
                    ${aiUnavailable ? `text-(--cic-red)` : `text-(--cic-amber)`}
                  `}
                />
                <div>
                  <p
                    className={`
                      text-[10px] font-semibold
                      ${
                        aiUnavailable
                          ? `text-(--cic-red)`
                          : `text-(--cic-amber)`
                      }
                    `}
                  >
                    {aiUnavailable ? 'AI Provider Not Available' : 'AI Advisor Disabled'}
                  </p>
                  <p
                    className="
                      mt-0.5 text-[9px] leading-relaxed text-foreground/40
                    "
                  >
                    {aiUnavailable
                      ? 'No AI provider is configured or reachable. Configure one in Settings to enable AI-generated briefings. You can still create ministries for event routing.'
                      : 'Events will display as raw data only — no AI-generated briefings, analysis, or in-character responses. You can still create ministries for event routing and categorization.'}{' '}
                    This can be changed later in government settings.
                  </p>
                </div>
              </div>
            )}

            {/* Ideology — disabled when noAi */}
            <section
              className={`
                relative
                ${noAi ? 'pointer-events-none' : ''}
              `}
            >
              {noAi && (
                <div
                  className="
                    absolute inset-0 z-10 flex items-center justify-center
                    rounded-md bg-(--cic-void)/70
                  "
                >
                  <span className="font-mono text-[10px] text-muted-foreground">AI features disabled</span>
                </div>
              )}
              <SectionDivider icon={Scroll} label="Ideology" tag="GOV.IDL" />
              <div className={noAi ? 'opacity-30' : ''}>
                <IdeologySliders
                  ideology={ideology}
                  onChange={(key, value) => setIdeology((prev) => ({ ...prev, [key]: value }))}
                />
              </div>
            </section>

            {/* Government Profile — disabled when noAi */}
            <section
              className={`
                relative
                ${noAi ? 'pointer-events-none' : ''}
              `}
            >
              {noAi && (
                <div
                  className="
                    absolute inset-0 z-10 flex items-center justify-center
                    rounded-md bg-(--cic-void)/70
                  "
                >
                  <span className="font-mono text-[10px] text-muted-foreground">AI features disabled</span>
                </div>
              )}
              <SectionDivider icon={Crown} label="Government Profile" tag="GOV.PRF" />
              <div className={noAi ? 'opacity-30' : ''}>
                <ProfileSelector
                  selectedProfile={selectedProfile}
                  creatingCustom={creatingCustom}
                  archetypes={archetypes ?? []}
                  ideology={ideology}
                  onSelectProfile={applyProfile}
                  onStartCustom={startCustom}
                  onCustomUpdate={handleCustomUpdate}
                />
              </div>
            </section>

            {/* Ministries — always available */}
            <section>
              <SectionDivider icon={Landmark} label="Ministries" tag="GOV.MIN" />
              <MinistryEditor ministries={ministries} onChange={setMinistries} />
            </section>

            {/* Validation + Footer */}
            {!noEmptyMinistries && ministries.length > 0 && (
              <div
                className="
                  flex items-start gap-2 rounded-md border border-(--cic-red)/20
                  bg-(--cic-red)/5 px-4 py-2.5
                "
              >
                <AlertTriangle
                  className="mt-0.5 size-3 shrink-0 text-(--cic-red)"
                />
                <p className="text-[9px] text-(--cic-red)/70">
                  {ministries
                    .filter((m) => m.tags.length === 0)
                    .map((m) => m.name)
                    .join(', ')}{' '}
                  {ministries.filter((m) => m.tags.length === 0).length === 1 ? 'has' : 'have'} no domains assigned.
                  Every ministry needs at least one domain.
                </p>
              </div>
            )}
            {!allTagsCovered && noEmptyMinistries && (
              <div
                className="
                  flex items-start gap-2 rounded-md border border-(--cic-red)/20
                  bg-(--cic-red)/5 px-4 py-2.5
                "
              >
                <AlertTriangle
                  className="mt-0.5 size-3 shrink-0 text-(--cic-red)"
                />
                <p className="text-[9px] text-(--cic-red)/70">
                  Unassigned domains:{' '}
                  {EVENT_TAGS.filter((t) => !allAssignedTags.has(t.id))
                    .map((t) => t.label)
                    .join(', ')}
                  . All domains must be assigned to a ministry.
                </p>
              </div>
            )}
            {!noAi && !activeProfile && (
              <div
                className="
                  flex items-start gap-2 rounded-md border
                  border-(--cic-amber-dim)/20 bg-(--cic-amber-glow) px-4 py-2.5
                "
              >
                <Crown className="mt-0.5 size-3 shrink-0 text-(--cic-amber-dim)" />
                <p className="text-[9px] text-(--cic-amber-dim)/70">
                  Select a government profile above, or create a custom one.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between pb-4">
              <p className="text-[9px] text-muted-foreground">
                {noAi
                  ? 'Raw Data Mode'
                  : `${resolvedArchetypeInfo?.name ?? 'Custom'} Government${activeProfile?.name ? ` — ${activeProfile.name}` : ''}`}
                {ministries.length > 0 &&
                  ` — ${ministries.length} ${ministries.length === 1 ? 'ministry' : 'ministries'}`}
              </p>
              <Button
                size="sm"
                disabled={!canEstablish}
                className="
                  border border-(--cic-amber-dim)/50 bg-(--cic-amber)/15 px-6
                  text-(--cic-amber) transition-all
                  hover:border-(--cic-amber)/70 hover:bg-(--cic-amber)/25
                  disabled:opacity-20
                "
                onClick={finishSetup}
              >
                <Check className="size-3.5" /> Establish Government
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
