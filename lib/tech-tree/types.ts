export interface ResearchField {
  id: number
  name: string
  abbreviation: string
  total: number
  researched: number
}

export interface TechType {
  id: number
  name: string
  fieldId: number
}

export interface Technology {
  id: number
  name: string
  description: string
  fieldId: number
  fieldAbbreviation: string
  techTypeId: number
  techTypeName: string
  developCost: number
  prerequisite1: number
  prerequisite2: number
  conventional: boolean
  ruinOnly: boolean
  status: 'researched' | 'in-progress' | 'available' | 'locked'
}

export interface TechTreeData {
  fields: ResearchField[]
  techs: Technology[]
}
