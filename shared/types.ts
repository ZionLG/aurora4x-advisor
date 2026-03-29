import { z } from 'zod'
import {
  ArchetypeIdSchema,
  ArchetypeSchema,
  IdeologyProfileSchema,
  MatchResultSchema,
  PersonalityMatchSchema,
  GameInfoSchema,
  GameSnapshotSchema,
  GameSessionSchema,
  AppSettingsSchema,
  BridgeStatusSchema,
  SystemBodySchema,
  StarSystemSchema,
  ActionTypeSchema,
  ActionRequestSchema,
  ActionResultSchema,
  ControlInfoSchema,
  MemoryFleetSchema,
  MemoryShipSchema,
  GameStateFieldInfoSchema,
  CollectionInfoSchema,
  ReadCollectionParamsSchema,
} from './schemas'

// Re-export schemas for convenience
export {
  IdeologyProfileSchema,
  AppSettingsSchema,
  GameSessionSchema,
  GameInfoSchema,
  GameSnapshotSchema,
  BridgeStatusSchema,
} from './schemas'

// ── Inferred types ─────────────────────────────────────────────────

export type ArchetypeId = z.infer<typeof ArchetypeIdSchema>
export type Archetype = z.infer<typeof ArchetypeSchema>
export type IdeologyProfile = z.infer<typeof IdeologyProfileSchema>
export type MatchResult = z.infer<typeof MatchResultSchema>
export type PersonalityMatch = z.infer<typeof PersonalityMatchSchema>

export type GameInfo = z.infer<typeof GameInfoSchema>
export type GameSnapshot = z.infer<typeof GameSnapshotSchema>
export type GameSession = z.infer<typeof GameSessionSchema>

export type AppSettings = z.infer<typeof AppSettingsSchema>
export type BridgeStatus = z.infer<typeof BridgeStatusSchema>

export type SystemBody = z.infer<typeof SystemBodySchema>
export type StarSystem = z.infer<typeof StarSystemSchema>

export type ActionType = z.infer<typeof ActionTypeSchema>
export type ActionRequest = z.infer<typeof ActionRequestSchema>
export type ActionResult = z.infer<typeof ActionResultSchema>
export type ControlInfo = z.infer<typeof ControlInfoSchema>

export type MemoryFleet = z.infer<typeof MemoryFleetSchema>
export type MemoryShip = z.infer<typeof MemoryShipSchema>

export type GameStateFieldInfo = z.infer<typeof GameStateFieldInfoSchema>
export type CollectionInfo = z.infer<typeof CollectionInfoSchema>
export type ReadCollectionParams = z.infer<typeof ReadCollectionParamsSchema>

// ── Aurora enums (not schema-derived) ──────────────────────────────

export type AuroraButton =
  | 'SubPulse'
  | 'SubPulse5S'
  | 'SubPulse30S'
  | 'SubPulse2M'
  | 'SubPulse5M'
  | 'SubPulse20M'
  | 'SubPulse1H'
  | 'SubPulse3H'
  | 'SubPulse8H'
  | 'SubPulse1D'
  | 'SubPulse5D'
  | 'SubPulse30D'
  | 'Increment'
  | 'Increment5S'
  | 'Increment30S'
  | 'Increment2M'
  | 'Increment5M'
  | 'Increment20M'
  | 'Increment1H'
  | 'Increment3H'
  | 'Increment8H'
  | 'Increment1D'
  | 'Increment5D'
  | 'Increment30D'
  | 'ToolbarColony'
  | 'ToolbarIndustry'
  | 'ToolbarMining'
  | 'ToolbarResearch'
  | 'ToolbarWealth'
  | 'ToolbarClass'
  | 'ToolbarProject'
  | 'ToolbarFleet'
  | 'ToolbarMissileDesign'
  | 'ToolbarTurrent'
  | 'ToolbarGroundForces'
  | 'ToolbarCommanders'
  | 'ToolbarMedals'
  | 'ToolbarRace'
  | 'ToolbarSystem'
  | 'ToolbarGalactic'
  | 'ToolbarComparison'
  | 'ToolbarIntelligence'
  | 'ToolbarTechnology'
  | 'ToolbarSurvey'
  | 'ToolbarSector'
  | 'ToolbarEvents'
  | 'ToolbarRefreshTactical'
  | 'ToolbarSave'
  | 'ToolbarGame'
  | 'ToolbarAuto'
  | 'ZoomIn'
  | 'ZoomOut'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'

export type AuroraFormType =
  | 'EconomicsForm'
  | 'ClassDesignForm'
  | 'CreateProjectForm'
  | 'FleetWindowForm'
  | 'MissileDesignForm'
  | 'TurretDesignForm'
  | 'GroundUnitDesignForm'
  | 'CommandersWindowForm'
  | 'MedalsForm'
  | 'RaceWindowForm'
  | 'SystemViewForm'
  | 'GalacticMapForm'
  | 'RaceComparisonForm'
  | 'DiplomacyForm'
  | 'TechnologyViewForm'
  | 'MineralsForm'
  | 'SectorsForm'
  | 'EventsForm'
  | 'GameDetailsForm'
