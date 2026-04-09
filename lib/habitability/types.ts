export interface SpeciesRequirements {
  speciesId: number
  speciesName: string
  breatheGasId: number
  breatheGasName: string
  idealPressure: number
  pressureDeviation: number
  maxPressure: number
  idealTemperature: number
  temperatureDeviation: number
  idealGravity: number
  gravityDeviation: number
  populationDensityModifier: number
  terraformingRate: number
  colonizationSkill: number
  totalPopulation: number
}

export interface AtmosphericGas {
  gasId: number
  gasName: string
  amount: number
  atm: number
  frozenOut: boolean
  boilingPoint: number
  isGreenhouse: boolean
  isAntiGreenhouse: boolean
  isDangerous: boolean
  dangerousRating: number
  dangerousLevel: number
}

export interface BodyHabitability {
  systemBodyId: number
  systemName: string
  bodyName: string
  bodyClass: number
  planetNumber: number
  orbitNumber: number
  starComponent: number
  radius: number
  gravity: number
  baseTemp: number
  surfaceTemp: number
  atmosPress: number
  hydroId: number
  hydroExt: number
  tidalLock: boolean
  radiationLevel: number
  dustLevel: number
  groundSurvey: number
  surveyed: boolean
  colonyCost: number
  lowGravity: boolean
  maxPopulation: number
  terraformable: string
  terraformTime: number
  miningPotential: number
  totalMinerals: number
  hasColony: boolean
  population: number
  gases: AtmosphericGas[]
  terraformPlan: {
    breathableTime: number
    breathableTarget: number
    breathableName: string
    toxicTime: number
    toxics: Array<{ gasName: string; atm: number; time: number }>
    greenhouseTime: number
    greenhouseTarget: number
    greenhouseName: string
    antiGreenhouseTime: number
    antiGreenhouseTarget: number
    antiGreenhouseName: string
    neutralTime: number
    neutralTarget: number
    neutralName: string
    waterVapourTime: number
    waterVapourTarget: number
    hydroExtTime: number
    targetTemp: number
    targetPressure: number
    targetHydroExt: number
    isPartial: boolean
    colonyCost: number
  } | null
}

export interface HabitabilityData {
  bodies: BodyHabitability[]
  species: SpeciesRequirements[]
}
