import { z } from 'zod'
import {
  IdeologyProfileSchema,
  GovernmentSchema,
  MinistrySchema,
  BriefingSchema,
  ArchetypeIdSchema,
} from '@/shared/schemas'

const ArchetypeOutputSchema = z.object({
  id: ArchetypeIdSchema,
  name: z.string(),
  description: z.string(),
  toneDescriptors: z.array(z.string()),
  vocabularyTags: z.array(z.string()),
})

const MatchResultSchema = z.object({
  archetypeId: ArchetypeIdSchema,
  archetypeName: z.string(),
  confidence: z.number(),
})

const PersonalityMatchOutputSchema = z.object({
  archetype: ArchetypeIdSchema,
  primary: MatchResultSchema,
  allMatches: z.array(MatchResultSchema),
})

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const EventTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  desc: z.string(),
})

export const governmentIpcSchema = {
  // Archetype/ideology matching
  'government:getArchetypes': {
    args: z.tuple([]),
    return: z.array(ArchetypeOutputSchema),
  },
  'government:matchPersonality': {
    args: z.tuple([IdeologyProfileSchema]),
    return: PersonalityMatchOutputSchema,
  },

  // Government CRUD
  'government:getGovernment': {
    args: z.tuple([]),
    return: GovernmentSchema.nullable(),
  },
  'government:setGovernment': {
    args: z.tuple([GovernmentSchema]),
    return: z.void(),
  },

  // Ministry CRUD
  'government:addMinistry': {
    args: z.tuple([MinistrySchema]),
    return: z.void(),
  },
  'government:updateMinistry': {
    args: z.tuple([z.string(), MinistrySchema.partial()]),
    return: z.void(),
  },
  'government:removeMinistry': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },

  // Briefings
  'government:getBriefings': {
    args: z.tuple([]),
    return: z.array(BriefingSchema),
  },
  'government:getBriefingsForMinistry': {
    args: z.tuple([z.string()]),
    return: z.array(BriefingSchema),
  },
  'government:clearBriefings': {
    args: z.tuple([]),
    return: z.void(),
  },

  // Chat (per ministry)
  'government:chat': {
    args: z.tuple([z.string(), z.string()]), // ministryId, message
    return: z.string(),
  },
  'government:getConversation': {
    args: z.tuple([z.string()]), // ministryId
    return: z.array(ChatMessageSchema),
  },
  'government:clearConversation': {
    args: z.tuple([z.string()]), // ministryId
    return: z.void(),
  },

  // Tags
  'government:getTags': {
    args: z.tuple([]),
    return: z.array(EventTagSchema),
  },

  // Custom profile persistence
  'government:getCustomProfiles': {
    args: z.tuple([]),
    return: z.any(),
  },
  'government:saveCustomProfile': {
    args: z.tuple([z.any()]),
    return: z.void(),
  },
  'government:removeCustomProfile': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
}
