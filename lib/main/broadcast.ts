/**
 * Main-process broadcast helper.
 * Sends typed push events to all renderer windows.
 */

import { BrowserWindow } from 'electron'
import type { PushEvents } from '@/shared/push-events'

export function broadcast<K extends keyof PushEvents>(channel: K, data: PushEvents[K]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}
