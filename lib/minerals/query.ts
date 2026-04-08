import type { QueryFn } from '../compute/types'
import type { BodyMinerals, MineralDeposit } from './types'

export async function fetchMinerals(query: QueryFn, gameId: number, raceId: number): Promise<BodyMinerals[]> {
  const rows = await query<{
    SystemBodyID: number
    SystemName: string
    SystemBodyName: string
    BodyClass: number
    PlanetNumber: number
    OrbitNumber: number
    GroundMineralSurvey: number
    MaterialID: number
    Amount: number
    Accessibility: number
    HalfOriginalAmount: number
    OriginalAcc: number
    HasColony: number
  }>(`
    SELECT md.SystemBodyID,
      COALESCE(rss.Name, '') as SystemName,
      COALESCE(sbn.Name, '') as SystemBodyName,
      COALESCE(sb.BodyClass, 0) as BodyClass,
      COALESCE(sb.PlanetNumber, 0) as PlanetNumber,
      COALESCE(sb.OrbitNumber, 0) as OrbitNumber,
      COALESCE(sb.GroundMineralSurvey, 0) as GroundMineralSurvey,
      md.MaterialID, md.Amount, md.Accessibility,
      md.HalfOriginalAmount, md.OriginalAcc,
      CASE WHEN p.PopulationID IS NOT NULL THEN 1 ELSE 0 END as HasColony
    FROM FCT_MineralDeposit md
    LEFT JOIN FCT_SystemBody sb ON md.SystemBodyID = sb.SystemBodyID
    LEFT JOIN FCT_SystemBodyName sbn ON sb.SystemBodyID = sbn.SystemBodyID AND sbn.RaceID = ${raceId}
    LEFT JOIN FCT_RaceSysSurvey rss ON sb.SystemID = rss.SystemID AND rss.RaceID = ${raceId}
    LEFT JOIN FCT_Population p ON md.SystemBodyID = p.SystemBodyID
      AND p.GameID = ${gameId} AND p.RaceID = ${raceId} AND p.Population > 0
    WHERE md.GameID = ${gameId}
      AND md.SystemBodyID IN (
        SELECT sbs.SystemBodyID FROM FCT_SystemBodySurveys sbs
        WHERE sbs.GameID = ${gameId} AND sbs.RaceID = ${raceId}
      )
    ORDER BY rss.Name, sb.PlanetNumber, sb.OrbitNumber
  `)

  // Group by body
  const bodyMap = new Map<number, BodyMinerals>()
  for (const row of rows) {
    let body = bodyMap.get(row.SystemBodyID)
    if (!body) {
      body = {
        systemBodyId: row.SystemBodyID,
        systemName: row.SystemName || '',
        bodyName: row.SystemBodyName || '',
        bodyClass: row.BodyClass,
        planetNumber: row.PlanetNumber,
        orbitNumber: row.OrbitNumber,
        groundSurvey: row.GroundMineralSurvey,
        minerals: new Map<number, MineralDeposit>(),
        totalAmount: 0,
        totalAccessibility: 0,
        potential: 0,
        hasColony: row.HasColony === 1,
      }
      bodyMap.set(row.SystemBodyID, body)
    }
    const deposit: MineralDeposit = {
      materialId: row.MaterialID,
      amount: row.Amount,
      accessibility: row.Accessibility,
      halfOriginalAmount: row.HalfOriginalAmount,
      originalAcc: row.OriginalAcc,
    }
    body.minerals.set(row.MaterialID, deposit)
    body.totalAmount += row.Amount
    body.totalAccessibility += row.Accessibility

    // Potential score per Electrons formula
    const acc = row.Accessibility
    const amt = row.Amount
    const exponent = Math.cos((Math.PI / 2) * acc - Math.PI / 2)
    const weight = 0.5 - Math.cos(Math.PI * acc) / 2
    body.potential += Math.atan(Math.pow(amt / 20000, exponent) * weight)
  }

  return Array.from(bodyMap.values())
}
