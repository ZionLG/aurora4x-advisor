export const MINERAL_NAMES: Record<number, string> = {
  1: 'Duranium',
  2: 'Neutronium',
  3: 'Corbomite',
  4: 'Tritanium',
  5: 'Boronide',
  6: 'Mercassium',
  7: 'Vendarite',
  8: 'Sorium',
  9: 'Uridium',
  10: 'Corundium',
  11: 'Gallicite',
}

export const MINERAL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export interface MineralDeposit {
  materialId: number
  amount: number
  accessibility: number
  halfOriginalAmount: number
  originalAcc: number
}

export interface BodyMinerals {
  systemBodyId: number
  systemName: string
  bodyName: string
  bodyClass: number
  planetNumber: number
  orbitNumber: number
  groundSurvey: number
  minerals: Map<number, MineralDeposit>
  totalAmount: number
  totalAccessibility: number
  potential: number
  hasColony: boolean
}
