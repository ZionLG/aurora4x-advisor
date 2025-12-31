import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GameContext } from './game-context'
import type { GameSession } from '@shared/types'

interface GameProviderProps {
  children: React.ReactNode
}

export function GameProvider({ children }: GameProviderProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  // Query: Load all games
  const {
    data: savedGames = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const games = await window.api.games.load()
      // Auto-select the most recently accessed game on first load
      if (games.length > 0 && !currentGameId) {
        const mostRecent = games.reduce((prev, current) =>
          current.lastAccessedAt > prev.lastAccessedAt ? current : prev
        )
        setCurrentGameId(mostRecent.id)
      }
      return games
    }
  })

  // Mutation: Update last accessed
  const updateLastAccessedMutation = useMutation({
    mutationFn: (gameId: string) => window.api.games.updateLastAccessed(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    }
  })

  // Mutation: Add or update game
  const addGameMutation = useMutation({
    mutationFn: (game: GameSession) => window.api.games.addOrUpdate(game),
    onMutate: async (game) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['games'] })

      // Snapshot the previous value
      const previousGames = queryClient.getQueryData<GameSession[]>(['games'])

      // Optimistically update to the new value
      queryClient.setQueryData<GameSession[]>(['games'], (oldGames = []) => {
        const existingIndex = oldGames.findIndex((g) => g.id === game.id)
        if (existingIndex >= 0) {
          // Update existing game
          const newGames = [...oldGames]
          newGames[existingIndex] = game
          return newGames
        } else {
          // Add new game
          return [...oldGames, game]
        }
      })

      // Set as current game
      setCurrentGameId(game.id)

      // Return context with previous value for rollback
      return { previousGames }
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousGames) {
        queryClient.setQueryData(['games'], context.previousGames)
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['games'] })
    }
  })

  // Mutation: Remove game
  const removeGameMutation = useMutation({
    mutationFn: (gameId: string) => window.api.games.remove(gameId),
    onSuccess: (_, removedGameId) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      // If removing current game, select another or set to null
      if (currentGameId === removedGameId) {
        setCurrentGameId(null)
      }
    }
  })

  // Mutation: Update personality
  const updatePersonalityMutation = useMutation({
    mutationFn: ({
      gameId,
      archetype,
      personalityName
    }: {
      gameId: string
      archetype: string
      personalityName: string
    }) => window.api.games.updatePersonality(gameId, archetype, personalityName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    }
  })

  // Mutation: Clear all games
  const clearAllMutation = useMutation({
    mutationFn: () => window.api.games.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      setCurrentGameId(null)
    }
  })

  // Get current game from savedGames
  const currentGame = savedGames.find((g) => g.id === currentGameId) || null

  // Sync current game ID with database watcher
  useEffect(() => {
    window.api.dbWatcher.setCurrentGame(currentGameId)
  }, [currentGameId])

  // Context methods
  const setCurrentGame = async (game: GameSession | null): Promise<void> => {
    if (game) {
      setCurrentGameId(game.id)
      updateLastAccessedMutation.mutate(game.id)
    } else {
      setCurrentGameId(null)
    }
  }

  const addGame = async (game: GameSession): Promise<void> => {
    await addGameMutation.mutateAsync(game)
  }

  const removeGame = async (gameId: string): Promise<void> => {
    removeGameMutation.mutate(gameId)
  }

  const switchGame = (gameId: string): void => {
    const game = savedGames.find((g) => g.id === gameId)
    if (game) {
      setCurrentGameId(game.id)
      updateLastAccessedMutation.mutate(gameId)
    }
  }

  const updateGamePersonality = async (
    archetype: string,
    personalityName: string
  ): Promise<void> => {
    if (!currentGame) return
    updatePersonalityMutation.mutate({
      gameId: currentGame.id,
      archetype,
      personalityName
    })
  }

  const clearAll = async (): Promise<void> => {
    clearAllMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading games...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">
          <p>Failed to load games</p>
          <p className="text-sm mt-2">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <GameContext.Provider
      value={{
        currentGame,
        savedGames,
        setCurrentGame,
        addGame,
        removeGame,
        switchGame,
        updateGamePersonality,
        clearAll
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
