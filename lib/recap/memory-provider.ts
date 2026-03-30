/**
 * Memory-based body data provider.
 *
 * Reads system body data directly from Aurora's RAM via the bridge
 * WebSocket `getbodies` endpoint. Returns the same BodyData shape
 * as SqlRecapProvider.getBodies() so compute functions work identically
 * regardless of source.
 *
 * Used in bridge mode where FCT_SystemBody has no save method and
 * the in-memory SQLite table would be empty/stale.
 */

import type { BodyData } from './types'

type BridgeSendFn = (type: string, payload: unknown) => Promise<unknown>

export class MemoryBodyProvider {
  constructor(private send: BridgeSendFn) {}

  async getBodies(): Promise<Record<number, BodyData>> {
    const bodies = (await this.send('getbodies', null)) as Array<Record<string, unknown>>
    const map: Record<number, BodyData> = {}
    for (const b of bodies) {
      const id = b.SystemBodyID as number
      if (id) {
        map[id] = {
          systemBodyId: id,
          systemId: (b.SystemID as number) || 0,
          name: (b.Name as string) || '',
          bodyClass: (b.BodyClass as string | number) ?? 0,
          radius: (b.Radius as number) || 0,
          gravity: (b.Gravity as number) || 0,
          density: (b.Density as number) || 0,
          xcor: (b.Xcor as number) || 0,
          ycor: (b.Ycor as number) || 0,
          atmosPress: (b.AtmosPress as number) || 0,
          surfaceTemp: (b.SurfaceTemp as number) || 0,
          hydroExt: (b.HydroExt as number) || 0,
          hydroId: (b.HydroType as number) || 0,
          radiationLevel: (b.RadiationLevel as number) || 0,
          dustLevel: (b.DustLevel as number) || 0,
        }
      }
    }
    return map
  }
}
