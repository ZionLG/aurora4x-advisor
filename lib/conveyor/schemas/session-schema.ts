import { z } from 'zod'
import { GameInfoSchema, GameSessionSchema, GameSnapshotSchema } from '@/shared/schemas'

export const sessionIpcSchema = {
  'session:listGames': {
    args: z.tuple([]),
    return: z.array(GameSessionSchema),
  },
  'session:detectGame': {
    args: z.tuple([]),
    return: z.array(GameInfoSchema),
  },
  'session:selectGame': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'session:addGame': {
    args: z.tuple([GameInfoSchema]),
    return: GameSessionSchema,
  },
  'session:removeGame': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'session:updatePersonality': {
    args: z.tuple([z.string(), z.string().nullable(), z.string().nullable()]),
    return: z.void(),
  },
  'session:updateSnapshot': {
    args: z.tuple([z.string(), GameSnapshotSchema]),
    return: z.void(),
  },
  'session:getState': {
    args: z.tuple([]),
    return: z.object({
      currentGame: GameSessionSchema.nullable(),
      isConnected: z.boolean(),
      lockedCampaignId: z.string().nullable(),
      bridgeUrl: z.string().nullable(),
    }),
  },
  'session:reconnect': {
    args: z.tuple([]),
    return: z.void(),
  },
  'session:goOffline': {
    args: z.tuple([]),
    return: z.void(),
  },
  'session:goOnline': {
    args: z.tuple([]),
    return: z.void(),
  },
}
