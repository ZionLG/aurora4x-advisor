import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import type { GameSession } from '@shared/types'

const GAMES_FILE = 'games.json'

function getGamesFilePath(): string {
  return join(app.getPath('userData'), GAMES_FILE)
}

export async function loadGames(): Promise<GameSession[]> {
  try {
    const filePath = getGamesFilePath()
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or is corrupted, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    console.error('Failed to load games:', error)
    return []
  }
}

export async function saveGames(games: GameSession[]): Promise<void> {
  try {
    const filePath = getGamesFilePath()
    const data = JSON.stringify(games, null, 2)
    await fs.writeFile(filePath, data, 'utf-8')
  } catch (error) {
    console.error('Failed to save games:', error)
    throw error
  }
}

export async function addOrUpdateGame(game: GameSession): Promise<GameSession[]> {
  const games = await loadGames()

  // Check if game exists (by game name)
  const existingIndex = games.findIndex((g) => g.gameInfo.gameName === game.gameInfo.gameName)

  if (existingIndex !== -1) {
    // Update existing game
    games[existingIndex] = game
  } else {
    // Add new game
    games.push(game)
  }

  await saveGames(games)
  return games
}

export async function removeGame(gameId: string): Promise<GameSession[]> {
  const games = await loadGames()
  const filtered = games.filter((g) => g.id !== gameId)
  await saveGames(filtered)
  return filtered
}

export async function updateGamePersonality(
  gameId: string,
  archetype: string,
  personalityName: string
): Promise<GameSession | null> {
  const games = await loadGames()
  const game = games.find((g) => g.id === gameId)

  if (game) {
    game.personalityArchetype = archetype
    game.personalityName = personalityName
    await saveGames(games)
    return game
  }

  return null
}

export async function updateGameLastAccessed(gameId: string): Promise<GameSession | null> {
  const games = await loadGames()
  const game = games.find((g) => g.id === gameId)

  if (game) {
    game.lastAccessedAt = Date.now()
    await saveGames(games)
    return game
  }

  return null
}

export async function clearAllGames(): Promise<void> {
  const filePath = getGamesFilePath()
  try {
    await fs.unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to clear games:', error)
      throw error
    }
  }
}
