import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
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
            <div className="size-1.5 rounded-full bg-(--cic-amber)" />
            <span className="font-mono text-[10px] text-(--cic-amber-dim)">Not verified</span>
          </>
        ) : status.connected ? (
          <>
            <div
              className="
                size-1.5 rounded-full bg-(--cic-green)
                shadow-[0_0_4px_var(--cic-green)]
              "
            />
            <span className="font-mono text-[10px] text-(--cic-green)">
              Connected: {status.provider}
              {status.model && ` / ${status.model}`}
            </span>
          </>
        ) : (
          <>
            <div className="size-1.5 rounded-full bg-(--cic-red)" />
            <span className="font-mono text-[10px] text-(--cic-red)">{status.error ?? 'Connection failed'}</span>
          </>
        )}
      </div>
      <Button
        size="xs"
        variant="ghost"
        className="
          text-[9px] text-muted-foreground
          hover:text-(--cic-cyan)
        "
        onClick={verify}
        disabled={checking}
      >
        {checking ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <RefreshCw
            className="size-3"
          />
        )}
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
    <div className="mb-4 flex items-center gap-3">
      <div
        className="
          flex size-8 items-center justify-center rounded-sm border
          border-(--cic-amber-dim)/30 bg-(--cic-amber-glow)
        "
      >
        <Icon className="size-4 text-(--cic-amber)" />
      </div>
      <div className="flex flex-1 items-center gap-2">
        <span
          className="
            text-xs font-semibold tracking-[0.2em] text-(--cic-amber) uppercase
          "
        >
          {label}
        </span>
        <div
          className="
            h-px flex-1 bg-linear-to-r from-(--cic-amber-dim)/40 to-transparent
          "
        />
        {tag && (
          <span
            className="
              font-mono text-[10px] text-(--cic-amber-dim)/60 uppercase
            "
          >
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
      className={`
        relative rounded-md border border-(--cic-panel-edge) bg-(--cic-panel)
        p-4 transition-colors
        hover:border-(--cic-cyan-dim)/30
        ${className}
      `}
    >
      {children}
    </div>
  )
}

function DataReadout({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span
        className="
          text-[10px] tracking-wider text-muted-foreground/60 uppercase
        "
      >
        {label}
      </span>
      <div
        className={`
          mt-1 rounded-sm border border-(--cic-panel-edge) bg-(--cic-void) px-3
          py-2 text-xs break-all
          ${mono ? `font-mono text-(--cic-cyan)` : `text-foreground`}
        `}
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
    mutationFn: ({ key, value }: { key: string; value: unknown }) => window.conveyor.settings.update(key, value),
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
    mutationFn: ({ id, model, apiKey, baseUrl }: { id: string; model: string; apiKey: string; baseUrl: string }) =>
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
        <div
          className="
            flex animate-pulse items-center gap-2 font-mono text-xs
            text-(--cic-cyan-dim)
          "
        >
          <CircleDot className="size-3" />
          Loading configuration...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-(--cic-void)">
      {/* Header */}
      <div
        className="
          sticky top-0 z-10 border-b border-(--cic-panel-edge)
          bg-(--cic-panel)/95 backdrop-blur-sm
        "
      >
        <div className="flex items-center gap-3 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="
              text-muted-foreground
              hover:text-(--cic-cyan)
            "
            onClick={() => navigate(currentGame ? '/dashboard' : '/')}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-(--cic-panel-edge)" />
          <div className="flex items-center gap-2">
            <span
              className="
                text-xs font-semibold tracking-[0.15em] text-foreground
                uppercase
              "
            >
              System Configuration
            </span>
            <ChevronRight className="size-3 text-muted-foreground/40" />
            <span className="font-mono text-[10px] text-(--cic-cyan-dim)">v{settings?.bridgePort ?? '47842'}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-8 p-6">
        {/* ── Aurora Database ──────────────────────────────── */}
        <section>
          <SectionHeader icon={Database} label="Aurora Database" tag="SYS.DB" />

          <SettingRow>
            <DataReadout label="Database Path" value={settings?.auroraDbPath ?? 'No database path configured'} />

            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                className="
                  border border-(--cic-amber-dim)/40 bg-(--cic-amber)/10
                  text-(--cic-amber)
                  hover:border-(--cic-amber)/60 hover:bg-(--cic-amber)/20
                "
                onClick={() => pickFileMutation.mutate()}
                disabled={pickFileMutation.isPending}
              >
                <Folder className="size-3.5" />
                {pickFileMutation.isPending ? 'Selecting...' : 'Select Database'}
              </Button>
              {settings?.auroraDbPath && (
                <Button
                  size="sm"
                  variant="outline"
                  className="
                    border-(--cic-panel-edge) text-muted-foreground
                    hover:border-(--cic-red)/40 hover:bg-(--cic-red)/10
                    hover:text-(--cic-red)
                  "
                  onClick={() => updateMutation.mutate({ key: 'auroraDbPath', value: null })}
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>

            <div
              className="
                mt-4 rounded-sm border-l-2 border-(--cic-amber-dim)/30
                bg-(--cic-amber-glow) px-3 py-2
              "
            >
              <p className="text-[10px] leading-relaxed text-(--cic-amber-dim)">
                Locate <span className="font-mono text-(--cic-amber)">AuroraDB.db</span> in your Aurora 4X installation
                folder. The companion monitors this file for save events.
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
                  <Label
                    className="
                      text-[10px] tracking-wider text-muted-foreground/60
                      uppercase
                    "
                  >
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
                    <SelectTrigger
                      className="mt-1 border-(--cic-panel-edge) bg-(--cic-void)"
                    >
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
                    <Label
                      className="
                        text-[10px] tracking-wider text-muted-foreground/60
                        uppercase
                      "
                    >
                      API Key
                    </Label>
                    <Input
                      type="password"
                      className="
                        mt-1 border-(--cic-panel-edge) bg-(--cic-void) font-mono
                        text-xs
                      "
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
                    <Label
                      className="
                        text-[10px] tracking-wider text-muted-foreground/60
                        uppercase
                      "
                    >
                      Ollama Endpoint
                    </Label>
                    <Input
                      className="
                        mt-1 border-(--cic-panel-edge) bg-(--cic-void) font-mono
                        text-xs
                      "
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
                  <Label
                    className="
                      text-[10px] tracking-wider text-muted-foreground/60
                      uppercase
                    "
                  >
                    Model
                  </Label>
                  <Input
                    className="
                      mt-1 border-(--cic-panel-edge) bg-(--cic-void) text-xs
                    "
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
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">Table Explorer and Memory Inspector</p>
              </div>
              <Switch
                checked={settings?.enableDevTools ?? false}
                onCheckedChange={(checked) => updateMutation.mutate({ key: 'enableDevTools', value: checked })}
              />
            </SettingRow>

            <SettingRow className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Database Watcher</span>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">Monitor Aurora database for save events</p>
              </div>
              <Switch
                checked={settings?.watchEnabled ?? true}
                onCheckedChange={(checked) => updateMutation.mutate({ key: 'watchEnabled', value: checked })}
              />
            </SettingRow>

            <SettingRow>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">Bridge Port</span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">Must match AdvisorBridge configuration</p>
                </div>
                <Input
                  type="number"
                  className="
                    w-28 border-(--cic-panel-edge) bg-(--cic-void) text-center
                    font-mono text-xs
                  "
                  value={settings?.bridgePort ?? 47842}
                  onChange={(e) => updateMutation.mutate({ key: 'bridgePort', value: Number(e.target.value) })}
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
