/**
 * Demo file to test the advisor system
 * Run with: npx ts-node src/main/advisor/demo.ts
 */

import { IdeologyProfile, getIdeologyTier } from '../ideology/types'
import { validateIdeology } from '../ideology/validator'
import { ArchetypeId, getArchetype } from '../archetypes/types'
import { matchPersonality } from '../ideology/pattern-matcher'

console.log('='.repeat(70))
console.log('AURORA 4X ADVISOR SYSTEM - DEMO')
console.log('='.repeat(70))
console.log('')

// Test Case 1: Balanced Nationalist
console.log('TEST CASE 1: Balanced Nationalist')
console.log('-'.repeat(70))

const ideology1: IdeologyProfile = {
  xenophobia: 50,
  diplomacy: 55,
  militancy: 48,
  expansionism: 52,
  determination: 60,
  trade: 45,
  translation: 0
}

console.log('Ideology Values:')
console.log(
  `  Xenophobia: ${ideology1.xenophobia} (${getIdeologyTier('xenophobia', ideology1.xenophobia)})`
)
console.log(
  `  Diplomacy: ${ideology1.diplomacy} (${getIdeologyTier('diplomacy', ideology1.diplomacy)})`
)
console.log(
  `  Militancy: ${ideology1.militancy} (${getIdeologyTier('militancy', ideology1.militancy)})`
)
console.log(
  `  Expansionism: ${ideology1.expansionism} (${getIdeologyTier('expansionism', ideology1.expansionism)})`
)
console.log(
  `  Determination: ${ideology1.determination} (${getIdeologyTier('determination', ideology1.determination)})`
)
console.log(`  Trade: ${ideology1.trade} (${getIdeologyTier('trade', ideology1.trade)})`)
console.log(
  `  Translation: ${ideology1.translation} (${getIdeologyTier('translation', ideology1.translation)})`
)
console.log('')

const validation1 = validateIdeology(ideology1)
if (!validation1.valid) {
  console.error('❌ Validation failed:', validation1.errors)
} else {
  console.log('✅ Ideology validated successfully')
}
console.log('')

const archetype1: ArchetypeId = 'staunch-nationalist'
const archetypeInfo1 = getArchetype(archetype1)
console.log(`Selected Archetype: ${archetypeInfo1.name}`)
console.log(`Description: ${archetypeInfo1.description}`)
console.log('')

const match1 = matchPersonality(archetype1, ideology1)
console.log(
  `Detected Personality: ${match1.primary.patternName} (${match1.primary.confidence}% match)`
)
if (match1.alternatives.length > 0) {
  console.log('Alternative matches:')
  match1.alternatives.forEach((alt) => {
    console.log(`  - ${alt.patternName} (${alt.confidence}% match)`)
  })
}
console.log('')
console.log('')

// Test Case 2: Corporate Executive with High Trade
console.log('TEST CASE 2: Corporate Executive with High Trade')
console.log('-'.repeat(70))

const ideology2: IdeologyProfile = {
  xenophobia: 25,
  diplomacy: 70,
  militancy: 30,
  expansionism: 65,
  determination: 55,
  trade: 85,
  translation: 10
}

console.log('Ideology Values:')
console.log(
  `  Xenophobia: ${ideology2.xenophobia} (${getIdeologyTier('xenophobia', ideology2.xenophobia)})`
)
console.log(
  `  Diplomacy: ${ideology2.diplomacy} (${getIdeologyTier('diplomacy', ideology2.diplomacy)})`
)
console.log(
  `  Militancy: ${ideology2.militancy} (${getIdeologyTier('militancy', ideology2.militancy)})`
)
console.log(
  `  Expansionism: ${ideology2.expansionism} (${getIdeologyTier('expansionism', ideology2.expansionism)})`
)
console.log(
  `  Determination: ${ideology2.determination} (${getIdeologyTier('determination', ideology2.determination)})`
)
console.log(`  Trade: ${ideology2.trade} (${getIdeologyTier('trade', ideology2.trade)})`)
console.log(
  `  Translation: ${ideology2.translation} (${getIdeologyTier('translation', ideology2.translation)})`
)
console.log('')

const validation2 = validateIdeology(ideology2)
if (!validation2.valid) {
  console.error('❌ Validation failed:', validation2.errors)
} else {
  console.log('✅ Ideology validated successfully')
}
console.log('')

const archetype2: ArchetypeId = 'corporate-executive'
const archetypeInfo2 = getArchetype(archetype2)
console.log(`Selected Archetype: ${archetypeInfo2.name}`)
console.log(`Description: ${archetypeInfo2.description}`)
console.log('')

const match2 = matchPersonality(archetype2, ideology2)
console.log(
  `Detected Personality: ${match2.primary.patternName} (${match2.primary.confidence}% match)`
)
if (match2.alternatives.length > 0) {
  console.log('Alternative matches:')
  match2.alternatives.forEach((alt) => {
    console.log(`  - ${alt.patternName} (${alt.confidence}% match)`)
  })
}
console.log('')
console.log('')

// Test Case 3: Military Strategist
console.log('TEST CASE 3: Military Strategist')
console.log('-'.repeat(70))

const ideology3: IdeologyProfile = {
  xenophobia: 65,
  diplomacy: 40,
  militancy: 75,
  expansionism: 55,
  determination: 80,
  trade: 35,
  translation: -5
}

console.log('Ideology Values:')
console.log(
  `  Xenophobia: ${ideology3.xenophobia} (${getIdeologyTier('xenophobia', ideology3.xenophobia)})`
)
console.log(
  `  Diplomacy: ${ideology3.diplomacy} (${getIdeologyTier('diplomacy', ideology3.diplomacy)})`
)
console.log(
  `  Militancy: ${ideology3.militancy} (${getIdeologyTier('militancy', ideology3.militancy)})`
)
console.log(
  `  Expansionism: ${ideology3.expansionism} (${getIdeologyTier('expansionism', ideology3.expansionism)})`
)
console.log(
  `  Determination: ${ideology3.determination} (${getIdeologyTier('determination', ideology3.determination)})`
)
console.log(`  Trade: ${ideology3.trade} (${getIdeologyTier('trade', ideology3.trade)})`)
console.log(
  `  Translation: ${ideology3.translation} (${getIdeologyTier('translation', ideology3.translation)})`
)
console.log('')

const validation3 = validateIdeology(ideology3)
if (!validation3.valid) {
  console.error('❌ Validation failed:', validation3.errors)
} else {
  console.log('✅ Ideology validated successfully')
}
console.log('')

const archetype3: ArchetypeId = 'military-strategist'
const archetypeInfo3 = getArchetype(archetype3)
console.log(`Selected Archetype: ${archetypeInfo3.name}`)
console.log(`Description: ${archetypeInfo3.description}`)
console.log('')

const match3 = matchPersonality(archetype3, ideology3)
console.log(
  `Detected Personality: ${match3.primary.patternName} (${match3.primary.confidence}% match)`
)
if (match3.alternatives.length > 0) {
  console.log('Alternative matches:')
  match3.alternatives.forEach((alt) => {
    console.log(`  - ${alt.patternName} (${alt.confidence}% match)`)
  })
}
console.log('')
console.log('='.repeat(70))
console.log('Demo completed successfully!')
console.log('='.repeat(70))
