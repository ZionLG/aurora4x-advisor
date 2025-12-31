import { watch, FSWatcher } from 'fs'
import { copyFile, mkdir } from 'fs/promises'
import { app } from 'electron'
import path from 'path'

/**
 * Database Watcher Service
 *
 * Monitors the Aurora 4X database file for changes and creates snapshots
 * when changes are detected. Snapshots are stored per-game to allow
 * tracking game progress over time.
 */

export class DatabaseWatcher {
  private watcher: FSWatcher | null = null
  private auroraDbPath: string | null = null
  private currentGameId: string | null = null
  private isProcessing = false
  private onSnapshotCreated?: (snapshotPath: string) => void

  /**
   * Set the path to the Aurora database file to watch
   */
  setAuroraDbPath(dbPath: string): void {
    if (this.auroraDbPath === dbPath) {
      return
    }

    // Stop watching previous path
    this.stop()

    this.auroraDbPath = dbPath
    this.start()
  }

  /**
   * Set the current game ID - this determines which folder to save snapshots to
   */
  setCurrentGameId(gameId: string | null): void {
    this.currentGameId = gameId
  }

  /**
   * Set callback for when a snapshot is created
   */
  onSnapshot(callback: (snapshotPath: string) => void): void {
    this.onSnapshotCreated = callback
  }

  /**
   * Start watching the Aurora database file
   */
  private start(): void {
    if (!this.auroraDbPath) {
      console.warn('Cannot start watcher: Aurora DB path not set')
      return
    }

    try {
      console.log(`Starting database watcher for: ${this.auroraDbPath}`)

      this.watcher = watch(this.auroraDbPath, async (eventType) => {
        if (eventType === 'change') {
          await this.handleDatabaseChange()
        }
      })

      this.watcher.on('error', (error) => {
        console.error('Database watcher error:', error)
      })
    } catch (error) {
      console.error('Failed to start database watcher:', error)
    }
  }

  /**
   * Stop watching the database file
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      console.log('Database watcher stopped')
    }
  }

  /**
   * Handle database file change event
   */
  private async handleDatabaseChange(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return
    }

    // Only create snapshots if we know which game is active
    if (!this.currentGameId) {
      console.log('Database changed but no active game - skipping snapshot')
      return
    }

    if (!this.auroraDbPath) {
      console.error('Database changed but path not set')
      return
    }

    this.isProcessing = true

    try {
      // Create snapshot
      const snapshotPath = await this.createSnapshot(this.currentGameId, this.auroraDbPath)
      console.log(`Created database snapshot: ${snapshotPath}`)

      // Notify listeners
      if (this.onSnapshotCreated) {
        this.onSnapshotCreated(snapshotPath)
      }
    } catch (error) {
      console.error('Failed to create database snapshot:', error)
    } finally {
      // Add a small delay before allowing next snapshot to prevent rapid-fire saves
      setTimeout(() => {
        this.isProcessing = false
      }, 2000)
    }
  }

  /**
   * Create a snapshot of the Aurora database for a specific game
   */
  private async createSnapshot(gameId: string, sourcePath: string): Promise<string> {
    // Get app data directory
    const userDataPath = app.getPath('userData')
    const gamesPath = path.join(userDataPath, 'games', gameId, 'snapshots')

    // Ensure directory exists
    await mkdir(gamesPath, { recursive: true })

    // Create snapshot filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotFilename = `aurora-${timestamp}.db`
    const snapshotPath = path.join(gamesPath, snapshotFilename)

    // Copy the database file
    await copyFile(sourcePath, snapshotPath)

    return snapshotPath
  }

  /**
   * Get the path where snapshots are stored for a game
   */
  getSnapshotsPath(gameId: string): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'games', gameId, 'snapshots')
  }

  /**
   * Get current watcher status
   */
  getStatus(): {
    isWatching: boolean
    auroraDbPath: string | null
    currentGameId: string | null
  } {
    return {
      isWatching: this.watcher !== null,
      auroraDbPath: this.auroraDbPath,
      currentGameId: this.currentGameId
    }
  }
}

// Singleton instance
export const dbWatcher = new DatabaseWatcher()
