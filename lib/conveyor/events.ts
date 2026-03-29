/**
 * Preload-safe push event subscriber.
 * Uses only ipcRenderer — no Electron main process imports.
 */

import type { PushEvents, Unsubscribe } from '@/shared/push-events'

export type { PushEvents, Unsubscribe }

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
