import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Badge } from '@/app/components/ui/badge'
import { Plus, X, Landmark } from 'lucide-react'
import { EVENT_TAGS } from './profile-presets'
import type { Ministry } from '@/shared/types'

export type TempMinistry = Omit<Ministry, 'id'> & { tempId: string }

interface MinistryEditorProps {
  ministries: TempMinistry[]
  onChange: (ministries: TempMinistry[]) => void
}

/** Tag dot color — gives visual identity to each domain */
const TAG_COLORS: Record<string, string> = {
  military: 'var(--cic-red)',
  fleet: 'var(--cic-red)',
  minerals: 'var(--cic-amber)',
  industry: 'var(--cic-amber)',
  research: 'var(--cic-cyan)',
  exploration: 'var(--cic-cyan)',
  diplomacy: 'var(--cic-green)',
  economy: 'var(--cic-green)',
}

/** Derive header accent color from the ministry's assigned tags */
function getMinistryAccent(tags: string[]): string {
  if (tags.length === 0) return 'var(--cic-panel-edge)'
  return TAG_COLORS[tags[0]] ?? 'var(--cic-cyan-dim)'
}

export function MinistryEditor({ ministries, onChange }: MinistryEditorProps) {
  const [newName, setNewName] = useState('')

  const addMinistry = () => {
    if (!newName.trim()) return
    onChange([
      ...ministries,
      { tempId: crypto.randomUUID(), name: newName.trim(), tags: [], description: '', toneOverride: null },
    ])
    setNewName('')
  }

  const removeMinistry = (tempId: string) => {
    onChange(ministries.filter((m) => m.tempId !== tempId))
  }

  const toggleTag = (tempId: string, tag: string) => {
    onChange(
      ministries.map((m) =>
        m.tempId === tempId
          ? {
              ...m,
              tags: m.tags.includes(tag) ? m.tags.filter((t) => t !== tag) : [...m.tags, tag],
            }
          : m
      )
    )
  }

  const updateDescription = (tempId: string, description: string) => {
    onChange(ministries.map((m) => (m.tempId === tempId ? { ...m, description } : m)))
  }

  return (
    <div className="space-y-3">
      {/* Ministry cards */}
      {ministries.map((ministry, idx) => {
        const takenTags = new Set(ministries.filter((m) => m.tempId !== ministry.tempId).flatMap((m) => m.tags))
        const activeTagCount = ministry.tags.length
        const accentColor = getMinistryAccent(ministry.tags)
        const deptNum = String(idx + 1).padStart(2, '0')

        return (
          <div
            key={ministry.tempId}
            className={`rounded-md border bg-[var(--cic-panel)] overflow-hidden ${
              activeTagCount === 0 ? 'border-[var(--cic-red)]/30' : 'border-[var(--cic-panel-edge)]'
            }`}
            style={{
              animationDelay: `${idx * 50}ms`,
            }}
          >
            {/* Colored top accent stripe */}
            <div
              className="h-[3px] transition-all duration-300"
              style={{ background: accentColor, opacity: activeTagCount > 0 ? 0.7 : 0.2 }}
            />

            {/* Department header bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--cic-void)]/60 border-b border-[var(--cic-panel-edge)]">
              <div className="flex items-center gap-2.5">
                <Landmark
                  className="h-3 w-3 transition-colors duration-200"
                  style={{ color: activeTagCount > 0 ? accentColor : 'var(--cic-amber-dim)' }}
                />
                <span className="text-[11px] font-semibold text-foreground/80">{ministry.name}</span>
                <span className="text-[7px] font-mono text-muted-foreground/25">DEPT-{deptNum}</span>
              </div>
              <div className="flex items-center gap-2">
                {activeTagCount > 0 ? (
                  <span className="text-[7px] font-mono text-[var(--cic-cyan-dim)] bg-[var(--cic-cyan-glow)] px-1.5 py-px rounded">
                    {activeTagCount} {activeTagCount === 1 ? 'domain' : 'domains'}
                  </span>
                ) : (
                  <span className="text-[7px] font-mono text-[var(--cic-red)] bg-[var(--cic-red)]/10 px-1.5 py-px rounded">
                    No domains
                  </span>
                )}
                <button
                  onClick={() => removeMinistry(ministry.tempId)}
                  className="text-muted-foreground/50 hover:text-[var(--cic-red)] transition-colors p-0.5 rounded hover:bg-[var(--cic-red)]/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Domain tags */}
              <div>
                <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1.5">Domain Assignments</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TAGS.map((tag) => {
                    const active = ministry.tags.includes(tag.id)
                    const taken = takenTags.has(tag.id)
                    const dotColor = TAG_COLORS[tag.id] ?? 'var(--foreground)'

                    return (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className={`text-[9px] pl-2 pr-2.5 py-0.5 h-7 gap-1.5 transition-all duration-150 ${
                          active
                            ? 'cursor-pointer'
                            : taken
                              ? 'cursor-not-allowed border-[var(--cic-panel-edge)]/40 text-muted-foreground/40'
                              : 'cursor-pointer border-[var(--cic-panel-edge)] text-foreground/30 hover:text-foreground/60 hover:border-foreground/20'
                        }`}
                        style={
                          active
                            ? {
                                borderColor: `color-mix(in srgb, ${dotColor} 50%, transparent)`,
                                color: dotColor,
                                background: `color-mix(in srgb, ${dotColor} 8%, transparent)`,
                              }
                            : undefined
                        }
                        onClick={() => !taken && toggleTag(ministry.tempId, tag.id)}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0 transition-all duration-150"
                          style={{
                            background: active ? dotColor : taken ? 'var(--foreground)' : dotColor,
                            opacity: active ? 1 : taken ? 0.08 : 0.25,
                            boxShadow: active ? `0 0 6px ${dotColor}` : 'none',
                          }}
                        />
                        {taken && !active ? <s>{tag.label}</s> : tag.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1">
                  Mandate <span className="text-muted-foreground/60">(optional)</span>
                </p>
                <textarea
                  className="w-full rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-void)] px-3 py-2 text-[10px] text-foreground/45 placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-[var(--cic-cyan-dim)]/40 transition-colors"
                  rows={2}
                  placeholder="Describe this ministry's mandate and responsibilities..."
                  value={ministry.description}
                  onChange={(e) => updateDescription(ministry.tempId, e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}

      {/* Add ministry — command panel */}
      <div className="rounded-md border border-dashed border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
        {/* Header strip */}
        <div className="px-3 py-1.5 bg-[var(--cic-void)]/40 border-b border-[var(--cic-panel-edge)]/50 flex items-center gap-2">
          <Plus className="h-2.5 w-2.5 text-[var(--cic-amber-dim)]/60" />
          <span className="text-[7px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
            Establish New Ministry
          </span>
        </div>

        <div className="p-3 space-y-3">
          {ministries.length === 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              No ministries established. Select a government profile to get suggested ministries, or create one below.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Input
              className="h-9 text-[11px] bg-[var(--cic-void)] border-[var(--cic-panel-edge)] flex-1 focus-visible:border-[var(--cic-cyan-dim)]/40"
              placeholder="Enter ministry name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMinistry()}
            />
            <Button
              size="sm"
              disabled={!newName.trim()}
              className="bg-[var(--cic-amber)]/10 text-[var(--cic-amber)] border border-[var(--cic-amber-dim)]/30 hover:bg-[var(--cic-amber)]/20 disabled:opacity-20 transition-all shrink-0 h-9 text-[10px] px-4"
              onClick={addMinistry}
            >
              <Plus className="h-3 w-3" />
              Establish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
