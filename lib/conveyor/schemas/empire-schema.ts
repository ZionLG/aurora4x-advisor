import { z } from 'zod'
import {
  SystemBodySchema,
  StarSystemSchema,
  MemoryFleetSchema,
  ActionRequestSchema,
  ActionResultSchema,
  GameStateFieldInfoSchema,
  CollectionInfoSchema,
  ReadCollectionParamsSchema,
} from '@/shared/schemas'

// Flexible row schema for SQL query results
const SqlRowSchema = z.record(z.string(), z.unknown())

export const empireIpcSchema = {
  // Fleet & ship data (merged SQL + realtime)
  'empire:getFleets': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())), // Fleet[] from compute
  },
  'empire:getShips': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())), // Ship[] from compute
  },

  // Ship classes
  'empire:getClasses': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())), // ShipClassSummary[]
  },
  'empire:getClassDetail': {
    args: z.tuple([z.number()]),
    return: z.record(z.string(), z.unknown()), // ShipClassDetail
  },

  // System / map data (realtime memory)
  'empire:getBodies': {
    args: z.tuple([z.number()]),
    return: z.array(SystemBodySchema),
  },
  'empire:getSystems': {
    args: z.tuple([]),
    return: z.array(StarSystemSchema),
  },
  'empire:getRealtimeFleets': {
    args: z.tuple([]),
    return: z.array(MemoryFleetSchema),
  },

  // Economy
  'empire:getMinerals': {
    args: z.tuple([]),
    return: z.record(z.string(), z.unknown()), // MineralTotalsResult
  },
  'empire:getMineralHistory': {
    args: z.tuple([z.string(), z.number().nullable()]),
    return: z.record(z.string(), z.unknown()), // MineralHistoryResult
  },
  'empire:getMineralBreakdown': {
    args: z.tuple([z.number(), z.string()]),
    return: z.record(z.string(), z.unknown()), // MineralBreakdownResult
  },
  'empire:getMineralColonies': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())), // MineralColony[]
  },

  // Research
  'empire:getResearch': {
    args: z.tuple([]),
    return: z.record(z.string(), z.unknown()),
  },

  // Navigation
  'empire:getWaypoints': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())),
  },
  'empire:getGameDate': {
    args: z.tuple([]),
    return: z.record(z.string(), z.unknown()), // GameDate
  },

  // Route planning
  'empire:computeRoute': {
    args: z.tuple([z.record(z.string(), z.unknown())]), // RouteRequest
    return: z.record(z.string(), z.unknown()), // RouteResult
  },
  'empire:computeFleetRoute': {
    args: z.tuple([z.record(z.string(), z.unknown())]), // FleetRouteRequest
    return: z.record(z.string(), z.unknown()), // FleetRouteResult
  },

  // Route persistence
  'empire:saveRoute': {
    args: z.tuple([z.record(z.string(), z.unknown())]),
    return: z.void(),
  },
  'empire:loadRoutes': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())),
  },
  'empire:removeRoute': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'empire:updateRoute': {
    args: z.tuple([z.string(), z.record(z.string(), z.unknown())]),
    return: z.void(),
  },

  // Fleet filter persistence
  'empire:loadFilters': {
    args: z.tuple([]),
    return: z.array(z.record(z.string(), z.unknown())),
  },
  'empire:saveFilters': {
    args: z.tuple([z.array(z.record(z.string(), z.unknown()))]),
    return: z.void(),
  },

  // Raw SQL query (for dev tools / advanced use)
  'empire:query': {
    args: z.tuple([z.string()]),
    return: z.array(SqlRowSchema),
  },

  // Actions (bridge UI automation)
  'empire:executeAction': {
    args: z.tuple([ActionRequestSchema]),
    return: ActionResultSchema,
  },

  // Memory explorer (dev tools)
  'empire:enumerateGameState': {
    args: z.tuple([]),
    return: z.array(GameStateFieldInfoSchema),
  },
  'empire:enumerateCollections': {
    args: z.tuple([]),
    return: z.array(CollectionInfoSchema),
  },
  'empire:readCollection': {
    args: z.tuple([ReadCollectionParamsSchema]),
    return: z.record(z.string(), z.unknown()),
  },
}
