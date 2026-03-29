import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  ArrowLeft,
  Database,
  Bot,
  Settings2,
  ChevronRight,
  CircleDot,
  Folder,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react'

function AiConnectionStatus() {
  const [status, setStatus] = useState<{
    configured: boolean
    provider: string | null
    model: string | null
    connected: boolean
    error: string | null
  } | null>(null)
  const [checking, setChecking] = useState(false)

  const verify = async () => {
    setChecking(true)
    try {
      const result = await window.conveyor.settings.verifyAi()
      setStatus(result)
      if (result.connected) {
        toast.success('AI connection verified')
      } else if (result.error) {
        toast.error('AI connection failed', { description: result.error })
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        {status === null ? (
          <>
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--cic-amber)]" />
            <span className="text-[10px] font-mono text-[var(--cic-amber-dim)]">Not verified</span>
          </>
        ) : status.connected ? (
          <>
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--cic-green)] shadow-[0_0_4px_var(--cic-green)]" />
            <span className="text-[10px] font-mono text-[var(--cic-green)]">
              Connected: {status.provider}{status.model && ` / ${status.model}`}
            </span>
          </>
        ) : (
          <>
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--cic-red)]" />
            <span className="text-[10px] font-mono text-[var(--cic-red)]">
              {status.error ?? 'Connection failed'}
            </span>
          </>
        )}
      </div>
      <Button
        size="xs"
        variant="ghost"
        className="text-[9px] text-muted-foreground hover:text-[var(--cic-cyan)]"
        onClick={verify}
        disabled={checking}
      >
        {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        {checking ? 'Verifying...' : 'Verify'}
      </Button>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  tag,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  tag?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded bg-[var(--cic-amber-glow)] border border-[var(--cic-amber-dim)]/30">
        <Icon className="h-4 w-4 text-[var(--cic-amber)]" />
      </div>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cic-amber)]">
          {label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--cic-amber-dim)]/40 to-transparent" />
        {tag && (
          <span className="text-[10px] font-mono text-[var(--cic-amber-dim)]/60 uppercase">
            {tag}
          </span>
        )}
      </div>
    </div>
  )
}

function SettingRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-4 transition-colors hover:border-[var(--cic-cyan-dim)]/30 ${className}`}
    >
      {children}
    </div>
  )
}

function DataReadout({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{label}</span>
      <div
        className={`mt-1 rounded border border-[var(--cic-panel-edge)] bg-[var(--cic-void)] px-3 py-2 text-xs break-all ${mono ? 'font-mono text-[var(--cic-cyan)]' : 'text-foreground'}`}
      >
        {value}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentGame = useSessionStore((s) => s.currentGame)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.conveyor.settings.load(),
  })

  const { data: providers } = useQuery({
    queryKey: ['settings', 'providers'],
    queryFn: () => window.conveyor.settings.getProviders(),
  })

  const { data: activeProvider } = useQuery({
    queryKey: ['settings', 'activeProvider'],
    queryFn: () => window.conveyor.settings.getActiveProvider(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      window.conveyor.settings.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const pickFileMutation = useMutation({
    mutationFn: () => window.conveyor.settings.pickDbFile(),
    onSuccess: async (filePath) => {
      if (!filePath) return
      await window.conveyor.settings.update('auroraDbPath', filePath)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Database path updated')
    },
  })

  const [aiModel, setAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434/api')

  useEffect(() => {
    if (settings) {
      setAiModel(settings.aiModel ?? '')
      setAiApiKey(settings.aiApiKey ?? '')
      setOllamaUrl(settings.ollamaBaseUrl ?? 'http://localhost:11434/api')
    }
  }, [settings])

  const saveProviderMutation = useMutation({
    mutationFn: ({
      id,
      model,
      apiKey,
      baseUrl,
    }: {
      id: string
      model: string
      apiKey: string
      baseUrl: string
    }) =>
      window.conveyor.settings.setProvider(id, model || null, apiKey || null, baseUrl || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'activeProvider'] })
      toast.success('AI provider updated')
    },
  })

  const selectedProvider = providers?.find((p) => p.id === (settings?.aiProvider ?? ''))

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--cic-cyan-dim)] text-xs font-mono animate-pulse">
          <CircleDot className="h-3 w-3" />
          Loading configuration...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--cic-void)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-[var(--cic-cyan)]"
            onClick={() => navigate(currentGame ? '/dashboard' : '/')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-[var(--cic-panel-edge)]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
              System Configuration
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[10px] font-mono text-[var(--cic-cyan-dim)]">
              v{settings?.bridgePort ?? '47842'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-8 p-6">
        {/* ── Aurora Database ──────────────────────────────── */}
        <section>
          <SectionHeader icon={Database} label="Aurora Database" tag="SYS.DB" />

          <SettingRow>
            <DataReadout
              label="Database Path"
              value={settings?.auroraDbPath ?? 'No database path configured'}
            />

            <div className="flex items-center gap-2 mt-4">
              <Button
                size="sm"
                className="bg-[var(--cic-amber)]/10 text-[var(--cic-amber)] border border-[var(--cic-amber-dim)]/40 hover:bg-[var(--cic-amber)]/20 hover:border-[var(--cic-amber)]/60"
                onClick={() => pickFileMutation.mutate()}
                disabled={pickFileMutation.isPending}
              >
                <Folder className="h-3.5 w-3.5" />
                {pickFileMutation.isPending ? 'Selecting...' : 'Select Database'}
              </Button>
              {settings?.auroraDbPath && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-muted-foreground border-[var(--cic-panel-edge)] hover:text-[var(--cic-red)] hover:border-[var(--cic-red)]/40 hover:bg-[var(--cic-red)]/10"
                  onClick={() => updateMutation.mutate({ key: 'auroraDbPath', value: null })}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-4 rounded border-l-2 border-[var(--cic-amber-dim)]/30 bg-[var(--cic-amber-glow)] px-3 py-2">
              <p className="text-[10px] leading-relaxed text-[var(--cic-amber-dim)]">
                Locate <span className="font-mono text-[var(--cic-amber)]">AuroraDB.db</span> in
                your Aurora 4X installation folder. The companion monitors this file for save events.
              </p>
            </div>
          </SettingRow>
        </section>

        {/* ── AI Advisor Provider ─────────────────────────── */}
        <section>
          <SectionHeader icon={Bot} label="AI Advisor" tag="ADV.LLM" />

          <div className="space-y-3">
            <SettingRow>
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    Provider
                  </Label>
                  <Select
                    value={settings?.aiProvider ?? ''}
                    onValueChange={(value) => {
                      saveProviderMutation.mutate({
                        id: value,
                        model: aiModel,
                        apiKey: aiApiKey,
                        baseUrl: ollamaUrl,
                      })
                    }}
                  >
                    <SelectTrigger className="mt-1 bg-[var(--cic-void)] border-[var(--cic-panel-edge)]">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProvider?.requiresApiKey && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      API Key
                    </Label>
                    <Input
                      type="password"
                      className="mt-1 font-mono text-xs bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      onBlur={() =>
                        saveProviderMutation.mutate({
                          id: settings?.aiProvider ?? '',
                          model: aiModel,
                          apiKey: aiApiKey,
                          baseUrl: ollamaUrl,
                        })
                      }
                      placeholder="sk-..."
                    />
                  </div>
                )}

                {selectedProvider?.requiresBaseUrl && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      Ollama Endpoint
                    </Label>
                    <Input
                      className="mt-1 font-mono text-xs bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      onBlur={() =>
                        saveProviderMutation.mutate({
                          id: settings?.aiProvider ?? '',
                          model: aiModel,
                          apiKey: aiApiKey,
                          baseUrl: ollamaUrl,
                        })
                      }
                    />
                  </div>
                )}

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    Model
                  </Label>
                  <Input
                    className="mt-1 text-xs bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    onBlur={() =>
                      saveProviderMutation.mutate({
                        id: settings?.aiProvider ?? '',
                        model: aiModel,
                        apiKey: aiApiKey,
                        baseUrl: ollamaUrl,
                      })
                    }
                    placeholder={
                      settings?.aiProvider === 'anthropic'
                        ? 'claude-sonnet-4-20250514'
                        : settings?.aiProvider === 'openai'
                          ? 'gpt-4o'
                          : 'llama3.2'
                    }
                  />
                </div>
              </div>
            </SettingRow>

            {activeProvider && <AiConnectionStatus />}
          </div>
        </section>

        {/* ── General ─────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Settings2} label="General" tag="SYS.CFG" />

          <div className="space-y-3">
            <SettingRow className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Developer Tools</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Table Explorer and Memory Inspector
                </p>
              </div>
              <Switch
                checked={settings?.enableDevTools ?? false}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ key: 'enableDevTools', value: checked })
                }
              />
            </SettingRow>

            <SettingRow className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Database Watcher</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Monitor Aurora database for save events
                </p>
              </div>
              <Switch
                checked={settings?.watchEnabled ?? true}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ key: 'watchEnabled', value: checked })
                }
              />
            </SettingRow>

            <SettingRow>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">Bridge Port</span>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Must match AdvisorBridge configuration
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-28 text-xs text-center font-mono bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
                  value={settings?.bridgePort ?? 47842}
                  onChange={(e) =>
                    updateMutation.mutate({ key: 'bridgePort', value: Number(e.target.value) })
                  }
                />
              </div>
            </SettingRow>
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  )
}
