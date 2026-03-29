/**
 * Typed push event system for main-to-renderer communication.
 *
 * Main process uses `broadcast()` to send events.
 * Renderer uses `subscribe()` (exposed via preload) to listen.
 */

// ── Event definitions ──────────────────────────────────────────────

export interface PushEvents {
  'session:stateChanged': SessionState
  'empire:tick': EmpireTick
  'advisor:alert': AdvisorAlert
}

export interface SessionState {
  currentGame: unknown // GameSession | null
  isConnected: boolean
  lockedCampaignId: string | null
  bridgeUrl: string | null
}

export interface EmpireTick {
  gameDate: string | null
  bodies?: unknown[]
  fleets?: unknown[]
}

export interface AdvisorAlert {
  id: string
  severity: 'briefing' | 'warning' | 'alert'
  title: string
  content: string
  timestamp: number
}

// ── Main process: broadcast to all windows ─────────────────────────

export function broadcast<K extends keyof PushEvents>(
  channel: K,
  data: PushEvents[K],
): void {
  // Dynamic import to avoid pulling Electron into preload bundle
  const { BrowserWindow } = require('electron') as { BrowserWindow: typeof import('electron').BrowserWindow }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

// ── Preload: subscribe helper (used by API classes) ────────────────

export type Unsubscribe = () => void

export function createSubscriber(ipcRenderer: {
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
}) {
  return function subscribe<K extends keyof PushEvents>(
    channel: K,
    callback: (data: PushEvents[K]) => void,
  ): Unsubscribe {
    const listener = (_event: unknown, data: PushEvents[K]) => callback(data)
    ipcRenderer.on(channel, listener as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener(channel, listener as (...args: unknown[]) => void)
  }
}
