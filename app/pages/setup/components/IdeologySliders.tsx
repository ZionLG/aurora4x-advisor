import { Slider } from '@/app/components/ui/slider'
import { IDEOLOGY_STATS } from './profile-presets'

interface IdeologySlidersProps {
  ideology: Record<string, number>
  onChange: (key: string, value: number) => void
}

export function IdeologySliders({ ideology, onChange }: IdeologySlidersProps) {
  return (
    <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-4 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
      {IDEOLOGY_STATS.map(({ key, label, desc }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground/70">{label}</span>
              <span className="text-[8px] text-muted-foreground">{desc}</span>
            </div>
            <span
              className="text-[11px] font-mono font-bold tabular-nums w-7 text-right"
              style={{
                color: ideology[key] >= 75 ? 'var(--cic-amber)' : ideology[key] >= 50 ? 'var(--cic-cyan)' : 'var(--foreground)',
                opacity: ideology[key] >= 50 ? 1 : 0.4,
              }}
            >
              {ideology[key]}
            </span>
          </div>
          <Slider min={1} max={100} step={1} value={[ideology[key]]} onValueChange={([v]) => onChange(key, v)} />
        </div>
      ))}
    </div>
  )
}
