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

function computeCompatibility(
  profileIdeology: Record<string, number>,
  currentIdeology: Record<string, number>,
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
  const color =
    value >= 80
      ? 'var(--cic-green)'
      : value >= 50
        ? 'var(--cic-amber)'
        : 'var(--cic-red)'

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-[3px] rounded-full bg-[var(--cic-void)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[8px] font-mono w-6 text-right tabular-nums" style={{ color, opacity: value >= 40 ? 1 : 0.4 }}>
        {value}%
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
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-[var(--cic-cyan-dim)]/50" />
          <span className="text-[8px] font-semibold uppercase tracking-wider text-foreground/30">
            Personality Profile
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[8px] text-muted-foreground hover:text-[var(--cic-cyan-dim)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--cic-cyan-glow)]"
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="text-[10px] text-foreground/50 leading-relaxed pl-3 border-l border-[var(--cic-panel-edge)] whitespace-pre-line">
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ── Profile Dossier List ── */}
      <div className="lg:col-span-2 rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden flex flex-col h-[420px]">
        {/* Header */}
        <div className="shrink-0 px-3 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/40 flex items-center justify-between">
          <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-foreground/30">
            {scoredProfiles.length} Profiles
          </span>
          <span className="text-[7px] font-mono text-muted-foreground/70">% = ideology match</span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {scoredProfiles.map(({ preset, compat, isCustom }, i) => {
            const isSelected =
              selectedProfile?.profile.id === preset.profile.id && !creatingCustom
            const presetArch = archetypes.find((a) => a.id === preset.archetype)

            return (
              <button
                key={preset.profile.id}
                onClick={() => onSelectProfile(preset)}
                className={`w-full text-left px-4 py-3.5 relative group transition-all duration-200 ${
                  i > 0 ? 'border-t border-[var(--cic-panel-edge)]' : ''
                }`}
                style={{
                  background: isSelected
                    ? 'var(--cic-cyan-glow)'
                    : 'transparent',
                }}
              >
                {/* Left accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-200"
                  style={{
                    background: isSelected
                      ? 'var(--cic-cyan)'
                      : 'transparent',
                    boxShadow: isSelected
                      ? '0 0 8px var(--cic-cyan)'
                      : 'none',
                  }}
                />
                {!isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cic-cyan-dim)] opacity-0 group-hover:opacity-60 transition-opacity duration-200" />
                )}

                {/* Delete button for custom profiles */}
                {isCustom && (
                  <div
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(preset.profile.id)
                    }}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-[var(--cic-red)] transition-colors cursor-pointer" />
                  </div>
                )}

                {/* Row 1: Name + Compat gauge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                        isSelected
                          ? 'text-[var(--cic-cyan)]'
                          : 'text-muted-foreground/70 group-hover:text-foreground/30'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold truncate transition-colors duration-200 ${
                        isSelected
                          ? 'text-[var(--cic-cyan)]'
                          : 'text-foreground/65 group-hover:text-foreground/90'
                      }`}
                    >
                      {preset.profile.name}
                    </span>
                  </div>
                  <CompatGauge value={compat} />
                </div>

                {/* Row 2: Badge */}
                <div className="flex items-center gap-2 mt-1.5">
                  {isCustom ? (
                    <span className="shrink-0 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan-dim)] border border-[var(--cic-cyan-dim)]/20">
                      Custom
                    </span>
                  ) : (
                    <span className="shrink-0 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--cic-amber-glow)] text-[var(--cic-amber-dim)] border border-[var(--cic-amber-dim)]/20">
                      {presetArch?.name}
                    </span>
                  )}
                </div>

                {/* Row 3: Description */}
                <p className="text-[9px] text-muted-foreground mt-1 pr-5 line-clamp-2 leading-relaxed">
                  {preset.profile.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Create Custom — pinned */}
        <div className="shrink-0 border-t-2 border-[var(--cic-amber-dim)]/20">
          <button
            onClick={onStartCustom}
            className="w-full text-left px-4 py-3 transition-all duration-200 relative group"
            style={{
              background: creatingCustom ? 'var(--cic-amber-glow)' : 'transparent',
            }}
          >
            {creatingCustom && (
              <div
                className="absolute left-0 top-0 bottom-0 w-[2px]"
                style={{
                  background: 'var(--cic-amber)',
                  boxShadow: '0 0 8px var(--cic-amber)',
                }}
              />
            )}
            <div className="flex items-center gap-2 pl-1">
              <PenLine
                className={`h-3 w-3 transition-colors ${
                  creatingCustom
                    ? 'text-[var(--cic-amber)]'
                    : 'text-muted-foreground group-hover:text-[var(--cic-amber-dim)]'
                }`}
              />
              <span
                className={`text-[11px] font-semibold transition-colors ${
                  creatingCustom
                    ? 'text-[var(--cic-amber)]'
                    : 'text-foreground/35 group-hover:text-foreground/60'
                }`}
              >
                Create Custom Profile
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Detail / Editor Panel ── */}
      <div className="lg:col-span-3 rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden flex flex-col h-[420px]">
        {/* Empty state */}
        {!selectedProfile && !creatingCustom && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <FileText className="h-6 w-6 text-muted-foreground/60" />
            <span className="text-muted-foreground text-[10px]">
              Select a profile to review its dossier
            </span>
          </div>
        )}

        {/* Built-in profile detail */}
        {selectedProfile && !creatingCustom && (
          <div className="flex flex-col h-full">
            {/* Dossier header */}
            <div
              className="shrink-0 px-4 py-3 border-b border-[var(--cic-cyan-dim)]/20"
              style={{
                background:
                  'linear-gradient(135deg, var(--cic-cyan-glow) 0%, transparent 60%)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--cic-cyan)]">
                    {selectedProfile.profile.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-px rounded bg-[var(--cic-amber-glow)] text-[var(--cic-amber)] border border-[var(--cic-amber-dim)]/30">
                      {archetypes.find((a) => a.id === selectedProfile.archetype)?.name}
                    </span>
                    <span className="text-[8px] text-foreground/30">
                      {selectedProfile.profile.description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    className="flex items-center gap-1 text-[8px] text-muted-foreground hover:text-[var(--cic-cyan-dim)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--cic-cyan-glow)]"
                  >
                    <Save className="h-2.5 w-2.5" />
                    Save Copy
                  </button>
                  <span className="text-[7px] font-mono text-muted-foreground/70 uppercase">
                    Dossier
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Personality */}
              <PersonalitySection flavor={selectedProfile.profile.flavor} />

              {/* Keywords */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-3 rounded-full bg-[var(--cic-amber-dim)]/50" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-foreground/30">
                    Signature Keywords
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pl-3">
                  {selectedProfile.profile.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[8px] px-2 py-0.5 rounded-sm bg-[var(--cic-void)] text-[var(--cic-cyan-dim)] border border-[var(--cic-panel-edge)] font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ministries */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-3 rounded-full bg-[var(--cic-green)]/40" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-foreground/30">
                    Default Ministries
                  </span>
                </div>
                <div className="pl-3 space-y-1">
                  {selectedProfile.ministries.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1 px-2 rounded bg-[var(--cic-void)]/50 border border-[var(--cic-panel-edge)]/50"
                    >
                      <div className="w-1 h-1 rounded-full bg-[var(--cic-green)]/60" />
                      <span className="text-[9px] text-foreground/40 font-medium">
                        {m.name}
                      </span>
                      <span className="text-[7px] text-muted-foreground/70 ml-auto font-mono">
                        {m.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
