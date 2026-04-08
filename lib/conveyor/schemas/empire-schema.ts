import { z } from 'zod'
import { ActionRequestSchema, ReadCollectionParamsSchema } from '@/shared/schemas'

// Pass-through: compute module and bridge return strongly typed data.
// We use z.any() here to avoid forcing index signatures on typed interfaces.
// Type safety is enforced at the compute/bridge layer, not the IPC layer.

export const empireIpcSchema = {
  // Fleet & ship data (merged SQL + realtime)
  'empire:getFleets': { args: z.tuple([]), return: z.any() },
  'empire:getShips': { args: z.tuple([]), return: z.any() },

  // Ship classes
  'empire:getClasses': { args: z.tuple([]), return: z.any() },
  'empire:getClassDetail': { args: z.tuple([z.number()]), return: z.any() },

  // System / map data (realtime memory)
  'empire:getBodies': { args: z.tuple([z.number()]), return: z.any() },
  'empire:getSystems': { args: z.tuple([]), return: z.any() },
  'empire:getRealtimeFleets': { args: z.tuple([]), return: z.any() },

  // Economy
  'empire:getMinerals': { args: z.tuple([]), return: z.any() },
  'empire:getMineralHistory': {
    args: z.tuple([z.string(), z.number().nullable()]),
    return: z.any(),
  },
  'empire:getMineralBreakdown': {
    args: z.tuple([z.number(), z.string()]),
    return: z.any(),
  },
  'empire:getMineralColonies': { args: z.tuple([]), return: z.any() },

  // Research
  'empire:getResearch': { args: z.tuple([]), return: z.any() },

  // Navigation
  'empire:getWaypoints': { args: z.tuple([]), return: z.any() },
  'empire:getGameDate': { args: z.tuple([]), return: z.any() },

  // Route planning
  'empire:computeRoute': { args: z.tuple([z.any()]), return: z.any() },
  'empire:computeFleetRoute': { args: z.tuple([z.any()]), return: z.any() },

  // Route persistence
  'empire:saveRoute': { args: z.tuple([z.any()]), return: z.void() },
  'empire:loadRoutes': { args: z.tuple([]), return: z.any() },
  'empire:removeRoute': { args: z.tuple([z.string()]), return: z.void() },
  'empire:updateRoute': { args: z.tuple([z.string(), z.any()]), return: z.void() },

  // Fleet filter persistence
  'empire:loadFilters': { args: z.tuple([]), return: z.any() },
  'empire:saveFilters': { args: z.tuple([z.any()]), return: z.void() },

  // Raw SQL query (dev tools)
  'empire:query': { args: z.tuple([z.string()]), return: z.any() },

  // Actions (bridge UI automation)
  'empire:executeAction': { args: z.tuple([ActionRequestSchema]), return: z.any() },

  // Production recap (monolithic - kept for compat)
  'empire:getProductionRecap': { args: z.tuple([]), return: z.any() },

  // Production recap (granular - shared cache, forceOffline param)
  'empire:getBodyMap': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getPopCapacities': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapResearch': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapIndustrial': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapShips': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapShipyards': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapTraining': { args: z.tuple([z.boolean()]), return: z.any() },
  'empire:getRecapTerraforming': { args: z.tuple([z.boolean()]), return: z.any() },

  // Production & shipyards
  'empire:getProduction': { args: z.tuple([]), return: z.any() },
  'empire:getShipyards': { args: z.tuple([]), return: z.any() },

  // Habitability
  'empire:getHabitability': { args: z.tuple([]), return: z.any() },
  'empire:getSpeciesRequirements': { args: z.tuple([]), return: z.any() },

  // Warnings
  'empire:getWarnings': { args: z.tuple([z.boolean()]), return: z.any() },

  // Game log
  'empire:getGameLog': {
    args: z.tuple([
      z.number().optional(),
      z.number().optional(),
      z.array(z.number()).optional(),
      z.boolean().optional(),
      z.boolean().optional(),
      z.boolean().optional(), // forceOffline
    ]),
    return: z.any(),
  },
  'empire:getEventTypes': { args: z.tuple([]), return: z.any() },

  // Minerals
  'empire:getMinerals': { args: z.tuple([z.boolean()]), return: z.any() },

  // Tech tree
  'empire:getTechTree': { args: z.tuple([z.boolean()]), return: z.any() },

  // Bridge diagnostics
  'empire:getTableMapping': { args: z.tuple([]), return: z.any() },
  'empire:rediscoverMapping': { args: z.tuple([]), return: z.any() },
  'empire:markStale': { args: z.tuple([]), return: z.any() },
  'empire:dumpBodyRaw': { args: z.tuple([z.number()]), return: z.any() },

  // Memory explorer (dev tools)
  'empire:enumerateGameState': { args: z.tuple([]), return: z.any() },
  'empire:enumerateCollections': { args: z.tuple([]), return: z.any() },
  'empire:readCollection': { args: z.tuple([ReadCollectionParamsSchema]), return: z.any() },
}
