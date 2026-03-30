import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerSessionHandlers } from '@/lib/conveyor/handlers/session-handler'
import { registerEmpireHandlers } from '@/lib/conveyor/handlers/empire-handler'
import { registerGovernmentHandlers } from '@/lib/conveyor/handlers/government-handler'
import { registerSettingsHandlers } from '@/lib/conveyor/handlers/settings-handler'

export function createAppWindow(): void {
  // Register custom protocol for resources
  registerResourcesProtocol()

  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1c1c1c',
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Aurora 4X Companion',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  // Register IPC handlers for all domains
  registerWindowHandlers(mainWindow)
  registerAppHandlers(app)
  registerSessionHandlers()
  registerEmpireHandlers()
  registerGovernmentHandlers()
  registerSettingsHandlers()

  // Keyboard shortcuts for zoom (custom titlebar doesn't register accelerators)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt || input.shift) return
    const wc = mainWindow.webContents
    if (input.key === '=' || input.key === '+') {
      wc.setZoomLevel(wc.zoomLevel + 0.5)
      event.preventDefault()
    } else if (input.key === '-') {
      wc.setZoomLevel(wc.zoomLevel - 0.5)
      event.preventDefault()
    } else if (input.key === '0') {
      wc.setZoomLevel(0)
      event.preventDefault()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Create a pop-out window for a single module (no sidebar, no titlebar, no tabs).
 */
export function createPopoutWindow(moduleId: string, route: string, x: number, y: number, title?: string): void {
  const popout = new BrowserWindow({
    width: 900,
    height: 600,
    x: Math.round(x) - 450,
    y: Math.round(y) - 20,
    frame: true,
    title: title || moduleId,
    icon: appIcon,
    backgroundColor: '#1c1c1c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  popout.removeMenu()

  popout.webContents.on('did-finish-load', () => {
    popout.setTitle(title || moduleId)
  })

  // Keyboard shortcuts for zoom (same as main window)
  popout.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt || input.shift) return
    const wc = popout.webContents
    if (input.key === '=' || input.key === '+') {
      wc.setZoomLevel(wc.zoomLevel + 0.5)
      event.preventDefault()
    } else if (input.key === '-') {
      wc.setZoomLevel(wc.zoomLevel - 0.5)
      event.preventDefault()
    } else if (input.key === '0') {
      wc.setZoomLevel(0)
      event.preventDefault()
    }
  })

  const query = `?mode=popout&module=${encodeURIComponent(moduleId)}&route=${encodeURIComponent(route)}`

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    popout.loadURL(process.env['ELECTRON_RENDERER_URL'] + query)
  } else {
    popout.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'popout', module: moduleId, route },
    })
  }

  popout.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}
