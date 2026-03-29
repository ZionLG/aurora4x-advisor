import { z } from 'zod'
import { ArchetypeIdSchema, IdeologyProfileSchema } from '@/shared/schemas'

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

const AlertSchema = z.object({
  id: z.string(),
  severity: z.enum(['briefing', 'warning', 'alert']),
  title: z.string(),
  content: z.string(),
  timestamp: z.number(),
})

export const advisorIpcSchema = {
  'advisor:getArchetypes': {
    args: z.tuple([]),
    return: z.array(ArchetypeOutputSchema),
  },
  'advisor:matchPersonality': {
    args: z.tuple([IdeologyProfileSchema]),
    return: PersonalityMatchOutputSchema,
  },
  'advisor:chat': {
    args: z.tuple([z.string()]),
    return: z.string(), // Full response (non-streaming fallback)
  },
  'advisor:getAlerts': {
    args: z.tuple([]),
    return: z.array(AlertSchema),
  },
  'advisor:clearAlerts': {
    args: z.tuple([]),
    return: z.void(),
  },
  'advisor:getConversation': {
    args: z.tuple([]),
    return: z.array(ChatMessageSchema),
  },
  'advisor:clearConversation': {
    args: z.tuple([]),
    return: z.void(),
  },
}
