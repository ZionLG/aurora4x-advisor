import { z } from 'zod'
import { AppSettingsSchema } from '@/shared/schemas'

export const settingsIpcSchema = {
  'settings:load': {
    args: z.tuple([]),
    return: AppSettingsSchema,
  },
  'settings:save': {
    args: z.tuple([AppSettingsSchema]),
    return: z.void(),
  },
  'settings:update': {
    args: z.tuple([z.string(), z.unknown()]),
    return: AppSettingsSchema,
  },
  'settings:pickDbFile': {
    args: z.tuple([]),
    return: z.string().nullable(),
  },
  'settings:getProviders': {
    args: z.tuple([]),
    return: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        requiresApiKey: z.boolean(),
        requiresBaseUrl: z.boolean(),
      }),
    ),
  },
  'settings:getActiveProvider': {
    args: z.tuple([]),
    return: z
      .object({
        id: z.string(),
        name: z.string(),
        model: z.string().nullable(),
      })
      .nullable(),
  },
  'settings:setProvider': {
    args: z.tuple([z.string(), z.string().nullable(), z.string().nullable(), z.string().nullable()]),
    return: z.void(),
  },
  'settings:verifyAi': {
    args: z.tuple([]),
    return: z.object({
      configured: z.boolean(),
      provider: z.string().nullable(),
      model: z.string().nullable(),
      connected: z.boolean(),
      error: z.string().nullable(),
    }),
  },
}
