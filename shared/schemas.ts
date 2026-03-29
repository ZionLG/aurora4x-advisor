import { z } from 'zod'

// ── Advisor / Ideology ─────────────────────────────────────────────

export const ArchetypeIdSchema = z.enum([
  'staunch-nationalist',
  'technocrat-admin',
  'communist-commissar',
  'monarchist-advisor',
  'military-strategist',
  'corporate-executive',
  'diplomatic-envoy',
  'religious-zealot',
])

export const ArchetypeSchema = z.object({
  id: ArchetypeIdSchema,
  name: z.string(),
  description: z.string(),
  toneDescriptors: z.array(z.string()),
  vocabularyTags: z.array(z.string()),
})

export const IdeologyProfileSchema = z.object({
  xenophobia: z.number().int().min(1).max(100),
  diplomacy: z.number().int().min(1).max(100),
  militancy: z.number().int().min(1).max(100),
  expansionism: z.number().int().min(1).max(100),
  determination: z.number().int().min(1).max(100),
  trade: z.number().int().min(1).max(100),
})

export const MatchResultSchema = z.object({
  profileId: z.string(),
  profileName: z.string(),
  confidence: z.number(),
  failedRules: z.array(z.string()),
})

export const PersonalityMatchSchema = z.object({
  archetype: ArchetypeIdSchema,
  primary: MatchResultSchema,
  allMatches: z.array(MatchResultSchema),
})

// ── Game Detection ─────────────────────────────────────────────────

export const GameInfoSchema = z.object({
  gameName: z.string(),
  auroraGameId: z.number(),
  auroraRaceId: z.number(),
  startingYear: z.number(),
  techLevel: z.enum(['TN', 'Industrial']),
  empireName: z.string(),
})

export const GameSnapshotSchema = z.object({
  gameYear: z.number(),
  hasTNTech: z.boolean(),
  alienContact: z.boolean(),
  atWar: z.boolean(),
  hasBuiltFirstShip: z.boolean(),
  hasSurveyedHomeSystem: z.boolean(),
  capturedAt: z.number(),
})

export const GameSessionSchema = z.object({
  id: z.string(),
  gameInfo: GameInfoSchema,
  personalityArchetype: z.string().nullable(),
  personalityName: z.string().nullable(),
  initialSnapshot: GameSnapshotSchema.optional(),
  lastGameDate: z.string().nullable().optional(),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
})

// ── App Settings ───────────────────────────────────────────────────

export const AppSettingsSchema = z.object({
  auroraDbPath: z.string().nullable(),
  watchEnabled: z.boolean(),
  bridgeEnabled: z.boolean(),
  bridgePort: z.number(),
  enableTimeControls: z.boolean(),
  enableDevTools: z.boolean(),
  zoomLevel: z.number(),
  aiProvider: z.enum(['anthropic', 'openai', 'ollama']).nullable(),
  aiModel: z.string().nullable(),
  aiApiKey: z.string().nullable(),
  ollamaBaseUrl: z.string().nullable(),
})

// ── Bridge ─────────────────────────────────────────────────────────

export const BridgeStatusSchema = z.object({
  isConnected: z.boolean(),
  url: z.string(),
  lastError: z.string().nullable(),
})

// ── System / Map ───────────────────────────────────────────────────

export const SystemBodySchema = z.object({
  SystemBodyID: z.number(),
  SystemID: z.number(),
  Name: z.string(),
  OrbitalDistance: z.number(),
  Bearing: z.number(),
  BodyClass: z.number(),
  BodyTypeID: z.number(),
  PlanetNumber: z.number(),
  OrbitNumber: z.number(),
  ParentBodyID: z.number().nullable(),
  Radius: z.number(),
  Xcor: z.number(),
  Ycor: z.number(),
  DistanceToParent: z.number(),
  Eccentricity: z.number(),
  EccentricityDirection: z.number(),
})

export const StarSystemSchema = z.object({
  SystemID: z.number(),
  Name: z.string(),
  Xcor: z.number(),
  Ycor: z.number(),
})

// ── Actions ────────────────────────────────────────────────────────

export const ActionTypeSchema = z.enum([
  'ClickButton',
  'OpenForm',
  'ReadControl',
  'SetControl',
  'InspectForm',
  'Composite',
])

export const ActionRequestSchema: z.ZodType<ActionRequest> = z.lazy(() =>
  z.object({
    Action: ActionTypeSchema,
    Target: z.string().optional(),
    FormName: z.string().optional(),
    ControlName: z.string().optional(),
    Value: z.unknown().optional(),
    Steps: z.array(ActionRequestSchema).optional(),
  }),
)

export const ActionResultSchema = z.object({
  Success: z.boolean(),
  Error: z.string().optional(),
  Data: z.unknown().optional(),
})

export const ControlInfoSchema: z.ZodType<ControlInfo> = z.lazy(() =>
  z.object({
    Name: z.string(),
    Type: z.string(),
    Text: z.string(),
    Value: z.unknown().optional(),
    Enabled: z.boolean(),
    Visible: z.boolean(),
    ParentName: z.string(),
    Children: z.array(ControlInfoSchema).optional(),
  }),
)

// ── Fleet / Ship Memory ────────────────────────────────────────────

export const MemoryFleetSchema = z.object({
  FleetID: z.number(),
  FleetName: z.string(),
  Speed: z.number(),
  Xcor: z.number(),
  Ycor: z.number(),
  RaceID: z.number(),
  ShipCount: z.number(),
  SystemID: z.number(),
  SystemName: z.string(),
  IsCivilian: z.boolean(),
})

export const MemoryShipSchema = z.object({
  ShipID: z.number(),
  ShipName: z.string(),
  Fuel: z.number(),
  FleetID: z.number(),
})

// ── Memory Explorer ────────────────────────────────────────────────

export const GameStateFieldInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.unknown().optional(),
  count: z.number().optional(),
  itemFields: z.number().optional(),
  refFields: z.number().optional(),
})

export const CollectionInfoSchema = z.object({
  field: z.string(),
  collectionType: z.enum(['Dict', 'List']),
  keyType: z.string().nullable(),
  itemType: z.string(),
  count: z.number(),
  fieldCount: z.number(),
  schema: z.array(z.object({ name: z.string(), type: z.string() })),
})

export const ReadCollectionParamsSchema = z.object({
  Field: z.string(),
  Offset: z.number().optional(),
  Limit: z.number().optional(),
  Fields: z.array(z.string()).optional(),
  IncludeRefs: z.boolean().optional(),
  FilterField: z.string().optional(),
  FilterValue: z.string().optional(),
})

// ── Forward type declarations for recursive schemas ────────────────

export type ActionRequest = {
  Action: z.infer<typeof ActionTypeSchema>
  Target?: string
  FormName?: string
  ControlName?: string
  Value?: unknown
  Steps?: ActionRequest[]
}

export type ControlInfo = {
  Name: string
  Type: string
  Text: string
  Value?: unknown
  Enabled: boolean
  Visible: boolean
  ParentName: string
  Children?: ControlInfo[]
}
