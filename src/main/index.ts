import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getAllArchetypes, getArchetype, matchPersonality } from './advisor'
import { detectGame } from './services/game-detection'
import {
  loadGames,
  saveGames,
  addOrUpdateGame,
  removeGame,
  updateGamePersonality,
  updateGameLastAccessed,
  clearAllGames
} from './services/game-persistence'
import { loadSettings, saveSettings, updateSetting } from './services/settings-persistence'
import { dbWatcher } from './services/db-watcher'
import { dialog } from 'electron'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// const reactDevToolsPath = join(
//   homedir(),
//   '/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/7.0.1_0'
// )

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', async (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Advisor API handlers
  ipcMain.handle('advisor:getAllArchetypes', () => {
    return getAllArchetypes()
  })

  ipcMain.handle('advisor:getArchetype', (_event, id) => {
    return getArchetype(id)
  })

  ipcMain.handle('advisor:matchPersonality', (_event, archetype, ideology) => {
    return matchPersonality(archetype, ideology)
  })

  // Game API handlers
  ipcMain.handle('game:detectGame', (_event, gameName: string) => {
    return detectGame(gameName)
  })

  // Game persistence handlers
  ipcMain.handle('games:load', () => {
    return loadGames()
  })

  ipcMain.handle('games:save', (_event, games) => {
    return saveGames(games)
  })

  ipcMain.handle('games:addOrUpdate', (_event, game) => {
    return addOrUpdateGame(game)
  })

  ipcMain.handle('games:remove', (_event, gameId: string) => {
    return removeGame(gameId)
  })

  ipcMain.handle(
    'games:updatePersonality',
    (_event, gameId: string, archetype: string, name: string) => {
      return updateGamePersonality(gameId, archetype, name)
    }
  )

  ipcMain.handle('games:updateLastAccessed', (_event, gameId: string) => {
    return updateGameLastAccessed(gameId)
  })

  ipcMain.handle('games:clearAll', () => {
    return clearAllGames()
  })

  // Settings handlers
  ipcMain.handle('settings:load', () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', (_event, settings) => {
    return saveSettings(settings)
  })

  ipcMain.handle('settings:update', (_event, key, value) => {
    return updateSetting(key, value)
  })

  // Database watcher handlers
  ipcMain.handle('dbWatcher:setPath', async (_event, dbPath: string | null) => {
    if (dbPath) {
      dbWatcher.setAuroraDbPath(dbPath)
      await updateSetting('auroraDbPath', dbPath)
    } else {
      dbWatcher.stop()
      await updateSetting('auroraDbPath', null)
    }
    return dbWatcher.getStatus()
  })

  ipcMain.handle('dbWatcher:setCurrentGame', (_event, gameId: string | null) => {
    dbWatcher.setCurrentGameId(gameId)
    return dbWatcher.getStatus()
  })

  ipcMain.handle('dbWatcher:getStatus', () => {
    return dbWatcher.getStatus()
  })

  ipcMain.handle('dbWatcher:pickFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Aurora 4X Database',
      filters: [{ name: 'Database Files', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Initialize database watcher from settings
  loadSettings().then((settings) => {
    if (settings.auroraDbPath && settings.watchEnabled) {
      dbWatcher.setAuroraDbPath(settings.auroraDbPath)
      console.log('Database watcher initialized from settings')
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup on quit
app.on('before-quit', () => {
  dbWatcher.stop()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
