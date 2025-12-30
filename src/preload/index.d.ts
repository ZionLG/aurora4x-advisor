import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ArchetypeId,
  Archetype,
  IdeologyProfile,
  ValidationResult,
  PersonalityMatch
} from '../shared/types'

interface AdvisorAPI {
  getAllArchetypeIds: () => Promise<ArchetypeId[]>
  getArchetype: (id: ArchetypeId) => Promise<Archetype>
  validateIdeology: (ideology: unknown) => Promise<ValidationResult>
  matchPersonality: (archetype: ArchetypeId, ideology: IdeologyProfile) => Promise<PersonalityMatch>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      advisor: AdvisorAPI
    }
  }
}
