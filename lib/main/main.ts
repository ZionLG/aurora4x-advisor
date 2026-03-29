import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { createAppWindow } from './app'
import { bootstrap } from './bootstrap'
import { dbWatcher } from '@/lib/services/db-watcher'
import { auroraBridge } from '@/lib/services/aurora-bridge'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.aurora4x.companion')
  createAppWindow()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow()
    }
  })

  // Initialize services after window is ready
  await bootstrap()

  // Auto-updater (production only)
  if (!is.dev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('[AutoUpdate] Check failed:', err?.message)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  dbWatcher.stop()
  auroraBridge.disconnect()
})
