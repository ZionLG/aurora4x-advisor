import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import { useSettingsStore } from '@/app/stores/settings-store'
import { Button } from '@/app/components/ui/button'
import { CircleDot } from 'lucide-react'
import { toast } from 'sonner'

type BootStatus = 'ok' | 'warn' | 'fail' | 'wait'

const STATUS_COLORS: Record<BootStatus, string> = {
  ok: 'var(--cic-green)',
  warn: 'var(--cic-amber)',
  fail: 'var(--cic-red)',
  wait: 'var(--cic-cyan-dim)',
}

const STATUS_LABELS: Record<BootStatus, string> = {
  ok: '[  OK  ]',
  warn: '[ WARN ]',
  fail: '[ FAIL ]',
  wait: '[ .... ]',
}

function BootLine({ children, status, delay = 0 }: { children: React.ReactNode; status: BootStatus; delay?: number }) {
  const [visible, setVisible] = useState(delay === 0)

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(t)
    }
    return undefined
  }, [delay])

  return (
    <div
      className="flex h-[18px] items-center gap-3"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease-out' }}
    >
      <span className="w-[60px] shrink-0 font-mono text-[10px]" style={{ color: STATUS_COLORS[status] }}>
        {STATUS_LABELS[status]}
      </span>
      <span className="font-mono text-[10px] text-foreground/50">{children}</span>
    </div>
  )
}

export function WelcomePage() {
  const navigate = useNavigate()
  const connectionMode = useSessionStore((s) => s.connectionMode)
  const settings = useSettingsStore((s) => s.settings)
  const [bootDone, setBootDone] = useState(false)

  // Load settings on mount
  useEffect(() => {
    window.conveyor.settings.load().then((s) => {
      useSettingsStore.getState().setSettings(s)
    })
  }, [])

  const { data: savedGames } = useQuery({
    queryKey: ['session', 'games'],
    queryFn: () => window.conveyor.session.listGames(),
  })

  const { data: dbGames } = useQuery({
    queryKey: ['session', 'detectGame'],
    queryFn: () => window.conveyor.session.detectGame(),
    enabled: !!settings?.auroraDbPath,
  })

  // Boot sequence completion
  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1100)
    return () => clearTimeout(t)
  }, [])

  const hasDbPath = !!settings?.auroraDbPath
  const campaignCount = savedGames?.length ?? 0

  const handleNewCampaign = () => {
    if (!hasDbPath) {
      toast.info('Configure your Aurora database path first')
      navigate('/settings')
      return
    }
    navigate('/setup')
  }

  return (
    <div className="flex h-full items-center justify-center bg-(--cic-void) p-8">
      <div className="w-full max-w-xl">
        {/* Terminal header */}
        <div
          className="flex items-center justify-between rounded-t-md px-4 py-2.5"
          style={{
            background: 'var(--cic-panel)',
            borderTop: '1px solid var(--cic-cyan)',
            borderLeft: '1px solid var(--cic-panel-edge)',
            borderRight: '1px solid var(--cic-panel-edge)',
            boxShadow: '0 -1px 12px hsl(195 80% 55% / 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <CircleDot className="cic-glow-pulse size-3 text-(--cic-cyan)" />
            <span className="
              text-[10px] font-semibold tracking-[0.25em] text-(--cic-cyan)
              uppercase
            ">
              Aurora 4X Companion
            </span>
          </div>
          <span className="font-mono text-[9px] text-foreground/20">v0.2.0</span>
        </div>

        {/* Terminal body */}
        <div
          className="relative overflow-hidden rounded-b-md"
          style={{
            background: 'linear-gradient(180deg, var(--cic-panel) 0%, var(--cic-void) 100%)',
            border: '1px solid var(--cic-panel-edge)',
            borderTop: 'none',
          }}
        >
          {/* Scanline overlay */}
          <div className="
            cic-scanline pointer-events-none absolute inset-0 z-20
          " />

          <div className="relative z-10 space-y-1.5 p-5">
            {/* Boot sequence */}
            <BootLine status="ok" delay={0}>
              Initializing Aurora 4X Companion...
            </BootLine>
            <BootLine status="ok" delay={150}>
              Core systems loaded
            </BootLine>
            <BootLine status={hasDbPath ? 'ok' : 'fail'} delay={300}>
              Aurora database: {hasDbPath ? settings?.auroraDbPath?.split(/[\\/]/).pop() : 'NOT CONFIGURED'}
            </BootLine>
            <BootLine
              status={connectionMode === 'bridge' ? 'ok' : connectionMode === 'offline' ? 'warn' : 'wait'}
              delay={450}
            >
              Bridge:{' '}
              {connectionMode === 'bridge'
                ? 'LINK ACTIVE'
                : connectionMode === 'offline'
                  ? 'OFFLINE MODE'
                  : 'Awaiting Aurora'}
            </BootLine>
            <BootLine status={hasDbPath ? (dbGames && dbGames.length > 0 ? 'ok' : 'warn') : 'wait'} delay={600}>
              Games in Aurora DB: {hasDbPath ? (dbGames ? String(dbGames.length) : 'scanning...') : 'N/A'}
            </BootLine>
            <BootLine status={campaignCount > 0 ? 'ok' : 'warn'} delay={750}>
              Tracked campaigns: {campaignCount}
            </BootLine>

            {/* Animated divider */}
            {bootDone && (
              <div className="py-3">
                <div className="cic-line-draw" />
              </div>
            )}

            {/* Action area */}
            {bootDone && (
              <div className="cic-slide-up space-y-4">
                {!hasDbPath ? (
                  <div
                    className="rounded-sm p-3"
                    style={{
                      background: 'var(--cic-amber-glow)',
                      border: '1px solid var(--cic-amber-dim)',
                      borderLeft: '2px solid var(--cic-amber)',
                    }}
                  >
                    <p className="
                      mb-1.5 text-[9px] font-semibold tracking-[0.15em]
                      text-(--cic-amber) uppercase
                    ">
                      First-Time Setup Required
                    </p>
                    <p className="
                      mb-3 text-[10px] leading-relaxed text-foreground/40
                    ">
                      Configure the path to your Aurora 4X database to begin. The companion reads this file to track
                      your game state.
                    </p>
                    <Button
                      size="sm"
                      className="
                        border border-(--cic-amber-dim)/40 bg-(--cic-amber)/10
                        text-(--cic-amber) transition-all
                        hover:border-(--cic-amber)/60 hover:bg-(--cic-amber)/20
                      "
                      onClick={() => navigate('/settings')}
                    >
                      Configure Database Path
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      className="
                        border border-(--cic-amber-dim)/40 bg-(--cic-amber)/10
                        text-(--cic-amber) transition-all
                        hover:border-(--cic-amber)/60 hover:bg-(--cic-amber)/20
                      "
                      onClick={handleNewCampaign}
                    >
                      + Initialize New Campaign
                    </Button>
                    {campaignCount > 0 && (
                      <span className="font-mono text-[9px] text-foreground/20">or select from sidebar</span>
                    )}
                  </div>
                )}

                {/* Terminal footer */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid var(--cic-panel-edge)' }}
                >
                  <span className="font-mono text-[9px] text-foreground/15">
                    Ready for input
                    <span className="cic-cursor ml-1">_</span>
                  </span>
                  <span className="font-mono text-[8px] text-foreground/10">Aurora 4X Companion</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
