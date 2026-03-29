/**
 * Archetype IDs - communication styles
 */
export type ArchetypeId =
  | 'staunch-nationalist'
  | 'technocrat-admin'
  | 'communist-commissar'
  | 'monarchist-advisor'
  | 'military-strategist'
  | 'corporate-executive'
  | 'diplomatic-envoy'
  | 'religious-zealot'

/**
 * Archetype definition - defines communication style and tone
 */
export interface Archetype {
  id: ArchetypeId
  name: string
  description: string
  toneDescriptors: string[]
  vocabularyTags: string[]
}

/**
 * All available archetypes
 */
export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  'staunch-nationalist': {
    id: 'staunch-nationalist',
    name: 'Staunch Nationalist',
    description:
      'Formal, patriotic, strength-focused. Emphasizes national glory, sovereignty, and imperial power.',
    toneDescriptors: ['formal', 'patriotic', 'commanding', 'proud'],
    vocabularyTags: ['Commander', 'nation', 'empire', 'glory', 'sovereignty', 'honor']
  },
  'technocrat-admin': {
    id: 'technocrat-admin',
    name: 'Technocrat Administrator',
    description:
      'Analytical, data-driven, efficiency-focused. Emphasizes optimization, statistics, and rational planning.',
    toneDescriptors: ['analytical', 'precise', 'efficient', 'logical'],
    vocabularyTags: [
      'analysis indicates',
      'efficiency',
      'optimal',
      'data shows',
      'calculations',
      'metrics'
    ]
  },
  'communist-commissar': {
    id: 'communist-commissar',
    name: 'Communist Commissar',
    description:
      'Ideological, collective-focused, revolutionary. Emphasizes the people, equality, and class struggle.',
    toneDescriptors: ['ideological', 'revolutionary', 'collective', 'fervent'],
    vocabularyTags: ['Comrade', 'the people', 'collective', 'workers', 'struggle', 'solidarity']
  },
  'monarchist-advisor': {
    id: 'monarchist-advisor',
    name: 'Monarchist Advisor',
    description:
      'Refined, traditional, hierarchical. Emphasizes lineage, tradition, and royal prerogative.',
    toneDescriptors: ['refined', 'traditional', 'deferential', 'aristocratic'],
    vocabularyTags: ['Your Majesty', 'realm', 'crown', 'royal', 'noble', 'subjects']
  },
  'military-strategist': {
    id: 'military-strategist',
    name: 'Military Strategist',
    description:
      'Tactical, direct, combat-focused. Emphasizes strategic positioning, threats, and military readiness.',
    toneDescriptors: ['tactical', 'direct', 'disciplined', 'strategic'],
    vocabularyTags: ['Sir', 'tactical', 'enemy', 'forces', 'deployment', 'strategic']
  },
  'corporate-executive': {
    id: 'corporate-executive',
    name: 'Corporate Executive',
    description:
      'Business-oriented, profit-driven, market-focused. Emphasizes ROI, opportunities, and competitive advantage.',
    toneDescriptors: ['professional', 'pragmatic', 'profit-focused', 'competitive'],
    vocabularyTags: [
      'opportunities',
      'market',
      'assets',
      'ROI',
      'competitive advantage',
      'stakeholders'
    ]
  },
  'diplomatic-envoy': {
    id: 'diplomatic-envoy',
    name: 'Diplomatic Envoy',
    description:
      'Conciliatory, nuanced, relationship-focused. Emphasizes dialogue, mutual benefit, and cooperation.',
    toneDescriptors: ['conciliatory', 'diplomatic', 'nuanced', 'respectful'],
    vocabularyTags: [
      'dialogue',
      'mutual benefit',
      'cooperation',
      'relationship',
      'understanding',
      'partners'
    ]
  },
  'religious-zealot': {
    id: 'religious-zealot',
    name: 'Religious Zealot',
    description:
      'Spiritual, dogmatic, divine-focused. Emphasizes faith, divine will, and sacred duty.',
    toneDescriptors: ['spiritual', 'fervent', 'dogmatic', 'prophetic'],
    vocabularyTags: ['divine will', 'sacred', 'blessed', 'heresy', 'faithful', 'prophecy']
  }
}

/**
 * Get archetype by ID
 */
export function getArchetype(id: ArchetypeId): Archetype {
  return ARCHETYPES[id]
}

/**
 * Get all archetypes
 */
export function getAllArchetypes(): Archetype[] {
  return Object.values(ARCHETYPES)
}
