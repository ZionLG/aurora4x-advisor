import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PenLine, FileText, Copy, Check, X, Save } from 'lucide-react'
import { BUILT_IN_PROFILES, type ProfilePreset } from './profile-presets'
import { CustomProfileForm } from './CustomProfileForm'
import type { ArchetypeId, GovernmentProfile } from '@/shared/types'

interface ProfileSelectorProps {
  selectedProfile: ProfilePreset | null
  creatingCustom: boolean
  archetypes: { id: string; name: string; description: string }[]
  ideology: Record<string, number>
  onSelectProfile: (preset: ProfilePreset) => void
  onStartCustom: () => void
  onCustomUpdate: (profile: GovernmentProfile, archetype: ArchetypeId) => void
}

/** Maps archetype IDs to their signature CIC color */
const ARCHETYPE_COLORS: Record<string, string> = {
  'military-strategist': 'var(--cic-red)',
  'corporate-executive': 'var(--cic-amber)',
  'diplomatic-envoy': 'var(--cic-green)',
  'monarchist-advisor': 'var(--cic-amber)',
  'technocrat-admin': 'var(--cic-cyan)',
  'religious-zealot': 'var(--cic-red)',
  'communist-commissar': 'var(--cic-red)',
  'staunch-nationalist': 'var(--cic-red)',
}

function computeCompatibility(
  profileIdeology: Record<string, number>,
  currentIdeology: Record<string, number>
): number {
  const keys = Object.keys(profileIdeology)
  if (keys.length === 0) return 50
  let totalDist = 0
  for (const key of keys) {
    totalDist += Math.abs((profileIdeology[key] ?? 50) - (currentIdeology[key] ?? 50))
  }
  return Math.round((1 - totalDist / (keys.length * 99)) * 100)
}

function CompatGauge({ value }: { value: number }) {
  const color = value >= 80 ? 'var(--cic-green)' : value >= 50 ? 'var(--cic-amber)' : 'var(--cic-red)'

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="
        relative h-[5px] w-16 overflow-hidden rounded-sm border
        border-(--cic-panel-edge)/30 bg-(--cic-void)
      ">
        <div
          className="
            absolute inset-y-0 left-0 rounded-sm transition-all duration-700
            ease-out
          "
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, transparent 0%, ${color} 100%)`,
            boxShadow: value >= 65 ? `0 0 8px ${color}` : 'none',
          }}
        />
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute inset-y-0 w-px"
            style={{ left: `${tick}%`, background: 'var(--cic-panel-edge)', opacity: 0.15 }}
          />
        ))}
      </div>
      <span
        className="w-6 text-right font-mono text-[9px] font-bold tabular-nums"
        style={{ color, opacity: value >= 25 ? 1 : 0.3 }}
      >
        {value}
      </span>
    </div>
  )
}

function PersonalitySection({ flavor }: { flavor: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(flavor)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-(--cic-cyan-dim)/50" />
          <span className="
            text-[8px] font-semibold tracking-wider text-foreground/30 uppercase
          ">
            Personality Profile
          </span>
          <div className="h-px w-12 bg-(--cic-cyan-dim)/15" />
        </div>
        <button
          onClick={handleCopy}
          className="
            flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[8px]
            text-muted-foreground transition-colors
            hover:bg-(--cic-cyan-glow) hover:text-(--cic-cyan-dim)
          "
        >
          {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div
        className="
          border-l-2 border-(--cic-panel-edge) pl-3 text-[10px] leading-relaxed
          whitespace-pre-line text-foreground/50
        "
        style={{ borderImage: 'linear-gradient(to bottom, var(--cic-cyan-dim), transparent) 1' }}
      >
        {flavor}
      </div>
    </div>
  )
}

export function ProfileSelector({
  selectedProfile,
  creatingCustom,
  archetypes,
  ideology,
  onSelectProfile,
  onStartCustom,
  onCustomUpdate,
}: ProfileSelectorProps) {
  const queryClient = useQueryClient()

  const { data: customProfiles = [] } = useQuery<ProfilePreset[]>({
    queryKey: ['government', 'customProfiles'],
    queryFn: () => window.conveyor.government.getCustomProfiles(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => window.conveyor.government.removeCustomProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['government', 'customProfiles'] })
      toast.success('Custom profile deleted')
    },
  })

  const saveCopyMutation = useMutation({
    mutationFn: (preset: ProfilePreset) => window.conveyor.government.saveCustomProfile(preset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['government', 'customProfiles'] })
      toast.success('Profile saved as custom copy')
    },
  })

  // Fixed order — profiles never shift. Compatibility is shown as info only.
  const scoredProfiles = useMemo(() => {
    const builtIn = BUILT_IN_PROFILES.map((preset) => ({
      preset,
      compat: computeCompatibility(preset.ideology, ideology),
      isCustom: false,
    }))
    const custom = customProfiles.map((preset) => ({
      preset,
      compat: computeCompatibility(preset.ideology, ideology),
      isCustom: true,
    }))
    return [...builtIn, ...custom]
  }, [ideology, customProfiles])

  return (
    <div className="
      grid grid-cols-1 gap-4
      lg:grid-cols-5
    ">
      {/* ── Profile Dossier List ── */}
      <div className="
        flex h-[420px] flex-col overflow-hidden rounded-md border
        border-(--cic-panel-edge) bg-(--cic-panel)
        lg:col-span-2
      ">
        {/* Header */}
        <div className="
          flex shrink-0 items-center justify-between border-b
          border-(--cic-panel-edge) bg-(--cic-void)/40 px-3 py-2
        ">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-(--cic-cyan-dim)/60" />
            <span className="
              text-[8px] font-semibold tracking-[0.15em] text-foreground/30
              uppercase
            ">
              {scoredProfiles.length} Profiles
            </span>
          </div>
          <span className="font-mono text-[7px] text-muted-foreground/50">IDL Match</span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {scoredProfiles.map(({ preset, compat, isCustom }, i) => {
            const isSelected = selectedProfile?.profile.id === preset.profile.id && !creatingCustom
            const presetArch = archetypes.find((a) => a.id === preset.archetype)
            const archColor = ARCHETYPE_COLORS[preset.archetype] ?? 'var(--cic-cyan-dim)'
            const fileNum = String(i + 1).padStart(2, '0')

            return (
              <button
                key={preset.profile.id}
                onClick={() => onSelectProfile(preset)}
                className={`
                  group relative w-full px-4 py-3 text-left transition-all
                  duration-200
                  ${
                  i > 0 ? 'border-t border-(--cic-panel-edge)' : ''
                }
                `}
                style={{
                  background: isSelected ? 'var(--cic-cyan-glow)' : 'transparent',
                }}
              >
                {/* Left accent */}
                <div
                  className="
                    absolute inset-y-0 left-0 transition-all duration-200
                  "
                  style={{
                    width: isSelected ? '3px' : '2px',
                    background: isSelected ? 'var(--cic-cyan)' : 'transparent',
                    boxShadow: isSelected ? '0 0 10px var(--cic-cyan), 0 0 4px var(--cic-cyan)' : 'none',
                  }}
                />
                {!isSelected && (
                  <div className="
                    absolute inset-y-0 left-0 w-[2px] bg-(--cic-cyan-dim)
                    opacity-0 transition-opacity duration-200
                    group-hover:opacity-60
                  " />
                )}

                {/* Top accent line — archetype color, visible on selected */}
                {isSelected && (
                  <div
                    className="absolute top-0 right-0 left-[3px] h-px"
                    style={{ background: archColor, opacity: 0.4 }}
                  />
                )}

                {/* Delete button for custom profiles */}
                {isCustom && (
                  <div
                    className={`
                      absolute top-2 right-2 z-10 transition-opacity
                      duration-200
                      ${
                      isSelected ? 'opacity-70' : `
                        opacity-0
                        group-hover:opacity-100
                      `
                    }
                    `}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(preset.profile.id)
                    }}
                  >
                    <X className="
                      size-3.5 cursor-pointer text-muted-foreground/70
                      transition-colors
                      hover:text-(--cic-red)
                    " />
                  </div>
                )}

                {/* Row 1: Name + Compat gauge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      className={`
                        size-3.5 shrink-0 transition-colors duration-200
                        ${
                        isSelected
                          ? 'text-(--cic-cyan)'
                          : `
                            text-muted-foreground/50
                            group-hover:text-foreground/30
                          `
                      }
                      `}
                    />
                    <span
                      className={`
                        truncate text-xs font-semibold transition-colors
                        duration-200
                        ${
                        isSelected ? 'text-(--cic-cyan)' : `
                          text-foreground/65
                          group-hover:text-foreground/90
                        `
                      }
                      `}
                    >
                      {preset.profile.name}
                    </span>
                  </div>
                  <CompatGauge value={compat} />
                </div>

                {/* Row 2: Badge + File designation */}
                <div className="mt-1.5 flex items-center gap-2">
                  {isCustom ? (
                    <span className="
                      shrink-0 rounded-sm border border-(--cic-cyan-dim)/20
                      bg-(--cic-cyan-glow) px-1.5 py-0.5 text-[7px] font-bold
                      tracking-wider text-(--cic-cyan-dim) uppercase
                    ">
                      Custom
                    </span>
                  ) : (
                    <span
                      className="
                        shrink-0 rounded-sm border px-1.5 py-0.5 text-[7px]
                        font-bold tracking-wider uppercase
                      "
                      style={{
                        color: archColor,
                        borderColor: `color-mix(in srgb, ${archColor} 30%, transparent)`,
                        background: `color-mix(in srgb, ${archColor} 8%, transparent)`,
                      }}
                    >
                      {presetArch?.name}
                    </span>
                  )}
                  <span className="
                    font-mono text-[7px] text-muted-foreground/25
                  ">PRF-{fileNum}</span>
                </div>

                {/* Row 3: Description */}
                <p className="
                  mt-1 line-clamp-2 pr-5 text-[9px] leading-relaxed
                  text-muted-foreground
                ">
                  {preset.profile.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Create Custom — pinned */}
        <div className="shrink-0 border-t-2 border-(--cic-amber-dim)/20">
          <button
            onClick={onStartCustom}
            className="
              group relative w-full px-4 py-3 text-left transition-all
              duration-200
            "
            style={{
              background: creatingCustom ? 'var(--cic-amber-glow)' : 'transparent',
            }}
          >
            {creatingCustom && (
              <div
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{
                  background: 'var(--cic-amber)',
                  boxShadow: '0 0 8px var(--cic-amber)',
                }}
              />
            )}
            <div className="flex items-center gap-2 pl-1">
              <PenLine
                className={`
                  size-3 transition-colors
                  ${
                  creatingCustom
                    ? 'text-(--cic-amber)'
                    : `
                      text-muted-foreground
                      group-hover:text-(--cic-amber-dim)
                    `
                }
                `}
              />
              <span
                className={`
                  text-[11px] font-semibold transition-colors
                  ${
                  creatingCustom ? 'text-(--cic-amber)' : `
                    text-foreground/35
                    group-hover:text-foreground/60
                  `
                }
                `}
              >
                Create Custom Profile
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Detail / Editor Panel ── */}
      <div className="
        flex h-[420px] flex-col overflow-hidden rounded-md border
        border-(--cic-panel-edge) bg-(--cic-panel)
        lg:col-span-3
      ">
        {/* Empty state */}
        {!selectedProfile && !creatingCustom && (
          <div className="
            flex h-full flex-col items-center justify-center gap-3
          ">
            <div className="relative">
              <FileText className="size-8 text-(--cic-panel-edge)" />
            </div>
            <div className="text-center">
              <span className="block text-[10px] text-muted-foreground">No dossier selected</span>
              <span className="mt-0.5 block text-[8px] text-muted-foreground/40">
                Select a profile to review intelligence brief
              </span>
            </div>
          </div>
        )}

        {/* Built-in profile detail */}
        {selectedProfile &&
          !creatingCustom &&
          (() => {
            const detailArchColor = ARCHETYPE_COLORS[selectedProfile.archetype] ?? 'var(--cic-cyan-dim)'
            return (
              <div className="flex h-full flex-col">
                {/* Classification bar */}
                <div className="
                  flex shrink-0 items-center justify-between border-b
                  border-(--cic-panel-edge)/50 bg-(--cic-void)/60 px-4 py-1
                ">
                  <span className="
                    font-mono text-[7px] tracking-wider text-muted-foreground/35
                    uppercase
                  ">
                    Classification: {archetypes.find((a) => a.id === selectedProfile.archetype)?.name ?? 'Custom'}
                  </span>
                  <span className="
                    font-mono text-[7px] text-(--cic-cyan-dim)/40 uppercase
                  ">Dossier Active</span>
                </div>

                {/* Dossier header */}
                <div
                  className="
                    shrink-0 border-b border-(--cic-panel-edge)/30 px-4 py-3
                  "
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${detailArchColor} 6%, transparent) 0%, transparent 60%)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-(--cic-cyan)">{selectedProfile.profile.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className="
                            rounded-sm border px-1.5 py-px text-[7px] font-bold
                            tracking-wider uppercase
                          "
                          style={{
                            color: detailArchColor,
                            borderColor: `color-mix(in srgb, ${detailArchColor} 35%, transparent)`,
                            background: `color-mix(in srgb, ${detailArchColor} 10%, transparent)`,
                          }}
                        >
                          {archetypes.find((a) => a.id === selectedProfile.archetype)?.name}
                        </span>
                        <span className="text-[8px] text-foreground/30">{selectedProfile.profile.description}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const copy: ProfilePreset = {
                          ...selectedProfile,
                          profile: {
                            ...selectedProfile.profile,
                            id: `custom-${Date.now()}`,
                            name: `${selectedProfile.profile.name} (Copy)`,
                          },
                        }
                        saveCopyMutation.mutate(copy)
                      }}
                      className="
                        flex items-center gap-1 rounded-sm border
                        border-transparent px-2 py-1 text-[8px]
                        text-muted-foreground transition-colors
                        hover:border-(--cic-cyan-dim)/20
                        hover:bg-(--cic-cyan-glow) hover:text-(--cic-cyan-dim)
                      "
                    >
                      <Save className="size-2.5" />
                      Save Copy
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                  {/* Personality */}
                  <PersonalitySection flavor={selectedProfile.profile.flavor} />

                  {/* Keywords */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="
                        h-3 w-1 rounded-full bg-(--cic-amber-dim)/50
                      " />
                      <span className="
                        text-[8px] font-semibold tracking-wider
                        text-foreground/30 uppercase
                      ">
                        Signature Keywords
                      </span>
                      <div className="h-px w-12 bg-(--cic-amber-dim)/15" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-3">
                      {selectedProfile.profile.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="
                            rounded-sm border border-(--cic-panel-edge)
                            bg-(--cic-void) px-2 py-0.5 font-mono text-[8px]
                            text-(--cic-cyan-dim)
                          "
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ministries */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-3 w-1 rounded-full bg-(--cic-green)/40" />
                      <span className="
                        text-[8px] font-semibold tracking-wider
                        text-foreground/30 uppercase
                      ">
                        Default Ministries
                      </span>
                      <div className="h-px w-12 bg-(--cic-green)/15" />
                    </div>
                    <div className="space-y-1.5 pl-3">
                      {selectedProfile.ministries.map((m, i) => (
                        <div
                          key={i}
                          className="
                            flex items-center gap-2 rounded-sm border
                            border-(--cic-panel-edge)/50 bg-(--cic-void)/50
                            px-2.5 py-1.5
                          "
                        >
                          <div className="
                            size-1.5 rounded-full bg-(--cic-green)/60
                          " />
                          <span className="
                            text-[9px] font-medium text-foreground/50
                          ">{m.name}</span>
                          <span className="
                            ml-auto font-mono text-[7px]
                            text-muted-foreground/50
                          ">
                            {m.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' \u00b7 ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

        {/* Custom form */}
        {creatingCustom && (
          <div className="flex-1 overflow-y-auto">
            <CustomProfileForm archetypes={archetypes} onUpdate={onCustomUpdate} ideology={ideology} />
          </div>
        )}
      </div>
    </div>
  )
}
