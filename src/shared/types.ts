// /**
//  * Shared type definitions for Aurora 4X Advisor
//  * Used across both main and renderer processes
//  */

// // ============================================================================
// // GAME STATE TYPES
// // ============================================================================

// export interface GameState {
//   empireId: number
//   empireName: string
//   currentYear: number
//   currentDate: string
//   ideology: IdeologyStats // Player's race characteristics (from FCT_Race or user input)
//   resources: ResourceSummary
//   research: ResearchStatus
//   fleets: FleetStatus[]
//   colonies: ColonyData[]
//   population: PopulationData[]
//   contacts: AlienContact[]
//   metadata: GameMetadata
// }

// export interface GameMetadata {
//   saveFilePath: string
//   loadedAt: number
//   fileSize: number
//   databaseVersion?: string
// }

// export interface ResourceSummary {
//   fuel: ResourceDetail
//   minerals: MineralStockpile
//   wealth: number
//   production: ProductionSummary
// }

// export interface ResourceDetail {
//   current: number
//   capacity: number
//   percentage: number
//   productionRate: number
//   consumptionRate: number
//   netRate: number
// }

// export interface MineralStockpile {
//   duranium: number
//   neutronium: number
//   corbomite: number
//   tritanium: number
//   boronide: number
//   mercassium: number
//   vendarite: number
//   sorium: number
//   uridium: number
//   corundium: number
//   gallicite: number
// }

// export interface ProductionSummary {
//   activeFactories: number
//   totalFactories: number
//   utilizationRate: number
//   minesActive: number
//   minesTotal: number
//   refineryCapacity: number
// }

// export interface ResearchStatus {
//   activeProjects: ResearchProject[]
//   completedTechs: string[]
//   availableLabs: number
//   usedLabs: number
//   idleLabs: number
//   researchRate: number
// }

// export interface ResearchProject {
//   id: string
//   name: string
//   field: ResearchField
//   progress: number
//   total: number
//   percentage: number
//   labsAssigned: number
//   estimatedCompletion?: number
// }

// export type ResearchField =
//   | 'Biology'
//   | 'Construction'
//   | 'Defences'
//   | 'Energy Weapons'
//   | 'Logistics'
//   | 'Missiles'
//   | 'Power & Propulsion'
//   | 'Sensors'

// export interface FleetStatus {
//   fleetId: number
//   name: string
//   location: string
//   shipCount: number
//   totalTonnage: number
//   fuelPercentage: number
//   maintenanceStatus: MaintenanceStatus
//   currentOrder?: string
//   readinessLevel: ReadinessLevel
// }

// export type MaintenanceStatus = 'optimal' | 'degraded' | 'critical' | 'failure'
// export type ReadinessLevel = 'full' | 'reduced' | 'minimal' | 'inactive'

// export interface ColonyData {
//   colonyId: number
//   name: string
//   systemName: string
//   bodyName: string
//   population: number
//   infrastructure: number
//   factories: number
//   mines: number
//   constructionRate: number
//   growthRate: number
//   stability: number
// }

// export interface PopulationData {
//   colonyId: number
//   totalPopulation: number
//   growthRate: number
//   employmentRate: number
//   civilianTrade: number
// }

// export interface AlienContact {
//   raceId: number
//   raceName: string
//   firstContactDate: string
//   relationshipStatus: RelationshipStatus
//   knownSystems: number
//   intelligence: AlienIntelligence
// }

// export type RelationshipStatus = 'unknown' | 'hostile' | 'neutral' | 'friendly' | 'allied'

// export interface AlienIntelligence {
//   techLevel: 'unknown' | 'inferior' | 'comparable' | 'superior'
//   militaryStrength: 'unknown' | 'weak' | 'moderate' | 'strong' | 'overwhelming'
//   territory: 'unknown' | 'small' | 'moderate' | 'large'
// }

// // ============================================================================
// // PERSONA TYPES
// // ============================================================================

// export interface Persona {
//   id: string // e.g., "staunch-nationalist"
//   archetype: ArchetypeId // Communication style
//   customPhrases?: CustomPhrases // Optional user overrides for greetings, etc.
// }

// // Ideology stats are NOT part of Persona - they're ALWAYS read from:
// // FCT_Race table in AuroraDB.db (player's racial characteristics)

// export type ArchetypeId =
//   | 'staunch-nationalist'
//   | 'communist-commissar'
//   | 'technocrat-admin'
//   | 'monarchist-advisor'
//   | 'military-strategist'
//   | 'corporate-executive'
//   | 'diplomatic-envoy'
//   | 'religious-zealot'

// export interface IdeologyStats {
//   xenophobia: number // 1-100: Fear of other races or governments
//   diplomacy: number // 1-100: Ability to persuade other races (offsets Xenophobia)
//   militancy: number // 1-100: Likelihood to choose military force to achieve goals
//   expansionism: number // 1-100: Desire to increase territory
//   determination: number // 1-100: Determination to proceed despite setbacks
//   trade: number // 1-100: Willingness to trade and establish/allow trading posts
//   translation: number // -25 to +25: Modifier to communication attempts
// }

// export interface CustomPhrases {
//   greeting?: string
//   farewell?: string
//   lowFuel?: string
//   lowMinerals?: string
//   alienContact?: string
//   researchComplete?: string
//   fleetEngagement?: string
//   colonyFounded?: string
//   economicCrisis?: string
//   [key: string]: string | undefined
// }

// export interface Archetype {
//   id: ArchetypeId
//   name: string
//   description: string
//   toneModifiers: ToneModifiers
//   responseTemplates: Record<string, string>
//   vocabulary: string[]
// }

// export interface ToneModifiers {
//   formalityLevel: 'low' | 'medium' | 'high'
//   urgencyMultiplier: number
//   emotionalIntensity: 'low' | 'medium' | 'high'
//   usesMilitaryTerms?: boolean
//   usesEconomicTerms?: boolean
//   usesDiplomaticTerms?: boolean
// }

// // ============================================================================
// // OBSERVATION TYPES
// // ============================================================================

// export interface Observation {
//   id: string
//   category: ObservationCategory
//   severity: ObservationSeverity
//   neutralText: string
//   data: Record<string, any>
//   triggers: string[]
//   timestamp: number
// }

// export type ObservationCategory =
//   | 'resources'
//   | 'research'
//   | 'military'
//   | 'expansion'
//   | 'diplomacy'
//   | 'economy'
//   | 'maintenance'
//   | 'population'

// export type ObservationSeverity = 'info' | 'warning' | 'critical'

// export interface ObservationTemplate {
//   id: string
//   category: ObservationCategory
//   neutralText: string
//   triggers: string[]
//   severityThresholds: SeverityThresholds
//   dataRequirements: string[]
//   detectionLogic: string // Reference to detection function
// }

// export interface SeverityThresholds {
//   critical?: number
//   warning?: number
//   info?: number
// }

// // ============================================================================
// // ADVICE & BRIEFING TYPES
// // ============================================================================

// export interface AdviceItem {
//   observationId: string
//   category: ObservationCategory
//   severity: ObservationSeverity
//   text: string
//   priority: number
//   actions?: SuggestedAction[]
//   metadata?: AdviceMetadata
// }

// export interface SuggestedAction {
//   label: string
//   description: string
//   type: ActionType
//   difficulty?: 'easy' | 'moderate' | 'hard'
// }

// export type ActionType =
//   | 'build'
//   | 'research'
//   | 'diplomatic'
//   | 'military'
//   | 'economic'
//   | 'administrative'

// export interface AdviceMetadata {
//   archetypeInfluence: string[]
//   ideologyInfluence: string[]
//   customPhraseUsed?: string
// }

// export interface Briefing {
//   id: string
//   empireId: number
//   empireName: string
//   archetype: ArchetypeId // Communication style used
//   ideology: IdeologyStats // Ideology stats at time of briefing
//   phase: GamePhase
//   timestamp: number
//   currentDate: string
//   greeting: string
//   adviceItems: AdviceItem[]
//   summary: string
//   phaseGuidance?: PhaseGuidance
// }

// // ============================================================================
// // PHASE TYPES
// // ============================================================================

// export type GamePhase = 'setup' | 'early-expansion' | 'mid-game' | 'late-game' | 'crisis'

// export interface PhaseInfo {
//   phase: GamePhase
//   description: string
//   priorities: string[]
//   checklistItems?: ChecklistItem[]
// }

// export interface ChecklistItem {
//   id: string
//   text: string
//   completed: boolean
//   optional?: boolean
// }

// export interface PhaseGuidance {
//   phase: GamePhase
//   tutorialFocus: string[]
//   recommendedActions: string[]
//   commonMistakes?: string[]
// }

// export interface PhaseDetectionCriteria {
//   yearsElapsed?: number
//   colonyCount?: number
//   techLevel?: number
//   fleetStrength?: number
//   alienContacts?: number
//   inCrisis?: boolean
// }

// // ============================================================================
// // IPC MESSAGE TYPES
// // ============================================================================

// export interface IPCResponse<T = any> {
//   success: boolean
//   data?: T
//   error?: string
// }

// // Game file operations
// export interface LoadFileRequest {
//   path: string
// }

// export interface LoadFileResponse {
//   gameState: GameState
// }

// // Analysis operations
// export interface GenerateBriefingRequest {
//   empireId: number
//   personaId: string
// }

// export interface GenerateBriefingResponse {
//   briefing: Briefing
// }

// export interface GetObservationsRequest {
//   empireId: number
// }

// export interface GetObservationsResponse {
//   observations: Observation[]
// }

// export interface DetectPhaseRequest {
//   empireId: number
// }

// export interface DetectPhaseResponse {
//   phaseInfo: PhaseInfo
// }

// // Persona operations
// export interface ListPersonasResponse {
//   personas: Persona[]
// }

// export interface LoadPersonaRequest {
//   id: string
// }

// export interface LoadPersonaResponse {
//   persona: Persona
// }

// export interface SavePersonaRequest {
//   persona: Persona
// }

// export interface DeletePersonaRequest {
//   id: string
// }

// // Settings operations
// export interface AppSettings {
//   theme: 'light' | 'dark' | 'system'
//   defaultPersonaId?: string
//   autoGenerateBriefing: boolean
//   saveBriefingHistory: boolean
//   maxHistoryItems: number
//   verbosityLevel: 'concise' | 'normal' | 'detailed'
//   enableTutorialMode: boolean
// }

// export interface UpdateSettingsRequest {
//   settings: Partial<AppSettings>
// }

// // ============================================================================
// // ERROR TYPES
// // ============================================================================

// export class AdvisorError extends Error {
//   constructor(
//     message: string,
//     public code: ErrorCode,
//     public details?: any
//   ) {
//     super(message)
//     this.name = 'AdvisorError'
//   }
// }

// export type ErrorCode =
//   | 'DATABASE_ERROR'
//   | 'FILE_NOT_FOUND'
//   | 'INVALID_SAVE_FILE'
//   | 'PERSONA_NOT_FOUND'
//   | 'INVALID_PERSONA'
//   | 'ANALYSIS_ERROR'
//   | 'IPC_ERROR'
//   | 'UNKNOWN_ERROR'

// // ============================================================================
// // UTILITY TYPES
// // ============================================================================

// export interface TimeRange {
//   start: number
//   end: number
// }

// export interface Coordinates {
//   x: number
//   y: number
//   z?: number
// }

// export interface SystemLocation {
//   systemId: number
//   systemName: string
//   bodyId?: number
//   bodyName?: string
//   coordinates?: Coordinates
// }

// // Helper type for partial updates
// export type DeepPartial<T> = {
//   [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
// }

// // Helper type for readonly game state
// export type ReadonlyGameState = Readonly<GameState>
