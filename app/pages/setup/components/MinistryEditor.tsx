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
              tags: m.tags.includes(tag)
                ? m.tags.filter((t) => t !== tag)
                : [...m.tags, tag],
            }
          : m,
      ),
    )
  }

  const updateDescription = (tempId: string, description: string) => {
    onChange(ministries.map((m) => (m.tempId === tempId ? { ...m, description } : m)))
  }

  return (
    <div className="space-y-3">
      {/* Ministry cards */}
      {ministries.map((ministry, idx) => {
        const takenTags = new Set(
          ministries.filter((m) => m.tempId !== ministry.tempId).flatMap((m) => m.tags),
        )
        const activeTagCount = ministry.tags.length

        return (
          <div
            key={ministry.tempId}
            className={`rounded-md border bg-[var(--cic-panel)] overflow-hidden ${
              activeTagCount === 0
                ? 'border-[var(--cic-red)]/30'
                : 'border-[var(--cic-panel-edge)]'
            }`}
            style={{
              animationDelay: `${idx * 50}ms`,
            }}
          >
            {/* Department header bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--cic-void)]/60 border-b border-[var(--cic-panel-edge)]">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-[var(--cic-amber-dim)]" />
                <span className="text-[11px] font-semibold text-foreground/80">
                  {ministry.name}
                </span>
                {activeTagCount > 0 ? (
                  <span className="text-[7px] font-mono text-[var(--cic-cyan-dim)] bg-[var(--cic-cyan-glow)] px-1.5 py-px rounded">
                    {activeTagCount} {activeTagCount === 1 ? 'domain' : 'domains'}
                  </span>
                ) : (
                  <span className="text-[7px] font-mono text-[var(--cic-red)] bg-[var(--cic-red)]/10 px-1.5 py-px rounded">
                    No domains
                  </span>
                )}
              </div>
              <button
                onClick={() => removeMinistry(ministry.tempId)}
                className="text-muted-foreground/70 hover:text-[var(--cic-red)] transition-colors p-0.5 rounded hover:bg-[var(--cic-red)]/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Domain tags */}
              <div>
                <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Domain Assignments
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TAGS.map((tag) => {
                    const active = ministry.tags.includes(tag.id)
                    const taken = takenTags.has(tag.id)
                    const dotColor = TAG_COLORS[tag.id] ?? 'var(--foreground)'

                    return (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className={`text-[9px] pl-2 pr-2.5 py-0.5 h-6 gap-1.5 transition-all duration-150 ${
                          active
                            ? 'cursor-pointer border-[var(--cic-cyan-dim)]/60 text-[var(--cic-cyan)] bg-[var(--cic-cyan-glow)]'
                            : taken
                              ? 'cursor-not-allowed border-[var(--cic-panel-edge)]/50 text-muted-foreground/60'
                              : 'cursor-pointer border-[var(--cic-panel-edge)] text-foreground/30 hover:text-foreground/60 hover:border-foreground/20'
                        }`}
                        onClick={() => !taken && toggleTag(ministry.tempId, tag.id)}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            background: active ? dotColor : taken ? 'var(--foreground)' : dotColor,
                            opacity: active ? 1 : taken ? 0.1 : 0.3,
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
                  className="w-full rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-void)] px-3 py-2 text-[10px] text-foreground/45 placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:border-[var(--cic-cyan-dim)]/40 transition-colors"
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

      {/* Add ministry */}
      <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-4 space-y-3">
        {ministries.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
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
  )
}
