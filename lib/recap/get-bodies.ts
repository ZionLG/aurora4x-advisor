/**
 * Shared body data fetcher with deduplication.
 *
 * Returns a Record<SystemBodyID, BodyData> map from the best available source:
 *   - Bridge mode:  real-time from Aurora's RAM (MemoryBodyProvider)
 *   - Offline mode:  FCT_SystemBody from the DB file (SqlRecapProvider)
 *   - Force offline: FCT_SystemBody from the DB file (direct read)
 *
 * Cached for 30 seconds. Concurrent calls are deduplicated — if 6 handlers
 * fire simultaneously, only one memory read happens.
 */

import type { BodyData } from './types'
import type { QueryFn } from '../compute/types'
import { MemoryBodyProvider } from './memory-provider'
import { SqlRecapProvider } from './sql-provider'

type BridgeSendFn = (type: string, payload: unknown) => Promise<unknown>

let cache: { data: Record<number, BodyData>; ts: number; bridge: boolean } | null = null
let inflight: Promise<Record<number, BodyData>> | null = null
const CACHE_TTL = 30_000

export async function fetchBodies(opts: {
  bridgeConnected: boolean
  bridgeSend: BridgeSendFn
  query: QueryFn
  gameId: number
  raceId: number
  forceOffline: boolean
}): Promise<Record<number, BodyData>> {
  const useBridge = !opts.forceOffline && opts.bridgeConnected
  const now = Date.now()

  // Return cached data if fresh
  if (cache && cache.bridge === useBridge && now - cache.ts < CACHE_TTL) {
    return cache.data
  }

  // Deduplicate concurrent requests — if already fetching, await the same promise
  if (inflight) return inflight

  inflight = (async () => {
    let data: Record<number, BodyData>
    if (useBridge) {
      data = await new MemoryBodyProvider(opts.bridgeSend).getBodies()
    } else {
      data = await new SqlRecapProvider(opts.query, opts.gameId, opts.raceId).getBodies()
    }
    cache = { data, ts: Date.now(), bridge: useBridge }
    return data
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Clear the cache (call on tick or mode change) */
export function clearBodyCache(): void {
  cache = null
}
