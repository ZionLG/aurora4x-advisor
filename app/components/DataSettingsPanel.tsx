/**
 * Shared data settings panel — configures refresh interval, force offline,
 * auto-refresh on tick, and per-type toggles. Used by Production and Game Log pages.
 */

import { useState } from 'react'
import { Settings2, RefreshCw, WifiOff, Timer } from 'lucide-react'
import { Switch } from '@/app/components/ui/switch'
import { useRecapSettingsStore, type RefreshInterval } from '@/app/stores/recap-settings-store'
import { queryClient } from '@/app/lib/query-client'

const INTERVAL_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '60s' },
  { value: 0, label: 'Manual' },
]

interface DataSettingsButtonProps {
  /** Which query keys to invalidate on "Refresh All Now" */
  invalidateKey?: string[]
}

export function DataSettingsButton({ invalidateKey = ['empire'] }: DataSettingsButtonProps) {
  const [open, setOpen] = useState(false)
  const recapInterval = useRecapSettingsStore((s) => s.refreshInterval)
  const forceOffline = useRecapSettingsStore((s) => s.forceOffline)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded px-2 py-1 text-[9px] transition-all ${
          open
            ? 'bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan)]'
            : forceOffline
              ? 'text-[var(--cic-amber)]'
              : 'text-muted-foreground/40 hover:text-muted-foreground/60'
        }`}
      >
        <Settings2 className="h-3.5 w-3.5" />
        {recapInterval === 0 && <span className="text-[7px] font-mono">Manual</span>}
        {forceOffline && <WifiOff className="h-2.5 w-2.5" />}
      </button>
      {open && <DataSettingsPanel invalidateKey={invalidateKey} onClose={() => setOpen(false)} />}
    </div>
  )
}

function DataSettingsPanel({ invalidateKey, onClose }: { invalidateKey: string[]; onClose: () => void }) {
  const {
    refreshInterval,
    forceOffline,
    autoRefreshOnTick,
    setRefreshInterval,
    setForceOffline,
    setAutoRefreshOnTick,
  } = useRecapSettingsStore()

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--cic-panel-edge)] px-3 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/50">Data Settings</span>
        <button onClick={onClose} className="text-[10px] text-muted-foreground/50 hover:text-foreground/70">
          Done
        </button>
      </div>

      <div className="space-y-3 p-3">
        {/* Refresh interval */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Timer className="h-3 w-3 text-[var(--cic-cyan-dim)]" />
            <span className="text-[9px] font-medium text-foreground/50">Refresh Interval</span>
          </div>
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRefreshInterval(opt.value)}
                className={`rounded px-2 py-0.5 font-mono text-[8px] transition-all ${
                  refreshInterval === opt.value
                    ? 'border border-[var(--cic-cyan-dim)]/30 bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan)]'
                    : 'border border-transparent text-muted-foreground/50 hover:text-foreground/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Force offline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-3 w-3 text-[var(--cic-amber-dim)]" />
            <span className="text-[9px] font-medium text-foreground/50">Force Offline</span>
          </div>
          <Switch checked={forceOffline} onCheckedChange={setForceOffline} />
        </div>

        {/* Auto-refresh on tick */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-[var(--cic-green)]" />
            <span className="text-[9px] font-medium text-foreground/50">Auto-refresh on Tick</span>
          </div>
          <Switch checked={autoRefreshOnTick} onCheckedChange={setAutoRefreshOnTick} />
        </div>

        {/* Manual refresh */}
        <button
          onClick={async () => {
            await window.conveyor.empire.markStale().catch(() => {})
            queryClient.invalidateQueries({ queryKey: invalidateKey, refetchType: 'all' })
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--cic-cyan-dim)]/30 px-2 py-1.5 text-[9px] font-semibold text-[var(--cic-cyan-dim)] transition-all hover:bg-[var(--cic-cyan-glow)] hover:text-[var(--cic-cyan)]"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Now
        </button>
      </div>
    </div>
  )
}
