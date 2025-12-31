import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ArchetypeId,
  Archetype,
  IdeologyProfile,
  PersonalityMatch,
  GameInfo,
  GameSession,
  AppSettings
} from '@shared/types'

interface Profile {
  id: string
  archetype: string
  name: string
  keywords: string[]
  description: string
}

interface TutorialAdvice {
  id: string
  conditions: Record<string, unknown>
  body: string
}

interface GameState {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  warStatus: 'peace' | 'active'
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
}

interface AdvicePackage {
  gameState: GameState
  tutorials: TutorialAdvice[]
  analyzedAt: number
}

interface AdvisorAPI {
  getAllArchetypes: () => Promise<Archetype[]>
  getArchetype: (id: ArchetypeId) => Promise<Archetype>
  matchPersonality: (archetype: ArchetypeId, ideology: IdeologyProfile) => Promise<PersonalityMatch>
  // V2 Profile API
  loadProfile: (profileId: string) => Promise<Profile>
  loadAllProfiles: () => Promise<Profile[]>
  getGreeting: (profileId: string, isInitial: boolean) => Promise<string>
  getObservationMessage: (
    profileId: string,
    observationId: string,
    observation: unknown,
    gameState: unknown
  ) => Promise<string>
  getTutorialAdvice: (profileId: string, gameState: unknown) => Promise<TutorialAdvice[]>
  triggerInitialAnalysis: (dbPath: string, profileId: string) => Promise<AdvicePackage>
  onAdviceUpdate: (callback: (advice: AdvicePackage) => void) => () => void
}

interface GameAPI {
  detectGame: (gameName: string) => Promise<GameInfo>
}

interface GamesAPI {
  load: () => Promise<GameSession[]>
  save: (games: GameSession[]) => Promise<void>
  addOrUpdate: (game: GameSession) => Promise<GameSession[]>
  remove: (gameId: string) => Promise<GameSession[]>
  updatePersonality: (
    gameId: string,
    archetype: string,
    name: string
  ) => Promise<GameSession | null>
  updateLastAccessed: (gameId: string) => Promise<GameSession | null>
  clearAll: () => Promise<void>
}

interface SettingsAPI {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<AppSettings>
}

interface DbWatcherStatus {
  isWatching: boolean
  auroraDbPath: string | null
  currentGameId: string | null
}

interface DbWatcherAPI {
  setPath: (dbPath: string | null) => Promise<DbWatcherStatus>
  setCurrentGame: (gameId: string | null) => Promise<DbWatcherStatus>
  getStatus: () => Promise<DbWatcherStatus>
  pickFile: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      advisor: AdvisorAPI
      game: GameAPI
      games: GamesAPI
      settings: SettingsAPI
      dbWatcher: DbWatcherAPI
    }
  }
}
