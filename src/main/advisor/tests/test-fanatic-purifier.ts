/**
 * Test Fanatic Purifier personality - the most extreme xenophobic profile
 * Run with: npx ts-node src/main/advisor/test-fanatic-purifier.ts
 */

import { IdeologyProfile, getIdeologyTier } from '../ideology/types'
import { validateIdeology } from '../ideology/validator'
import { ArchetypeId, getArchetype } from '../archetypes/types'
import { matchPersonality } from '../ideology/pattern-matcher'

console.log('='.repeat(70))
console.log('💀 FANATIC PURIFIER TEST 💀')
console.log('='.repeat(70))
console.log('')

// Fanatic Purifier: Maximum xenophobia, militancy, and determination
const ideology: IdeologyProfile = {
  xenophobia: 98, // Genocidal
  diplomacy: 5, // Incapable
  militancy: 95, // Bloodthirsty
  expansionism: 85, // Manifest Destiny
  determination: 98, // Fanatical
  trade: 10 // Autarky
}

console.log('IDEOLOGY VALUES:')
console.log('-'.repeat(70))
console.log(
  `  Xenophobia: ${ideology.xenophobia} (${getIdeologyTier('xenophobia', ideology.xenophobia)})`
)
console.log(
  `  Diplomacy: ${ideology.diplomacy} (${getIdeologyTier('diplomacy', ideology.diplomacy)})`
)
console.log(
  `  Militancy: ${ideology.militancy} (${getIdeologyTier('militancy', ideology.militancy)})`
)
console.log(
  `  Expansionism: ${ideology.expansionism} (${getIdeologyTier('expansionism', ideology.expansionism)})`
)
console.log(
  `  Determination: ${ideology.determination} (${getIdeologyTier('determination', ideology.determination)})`
)
console.log(`  Trade: ${ideology.trade} (${getIdeologyTier('trade', ideology.trade)})`)
console.log()
console.log('')

const validation = validateIdeology(ideology)
if (!validation.valid) {
  console.error('❌ Validation failed:', validation.errors)
  process.exit(1)
}
console.log('✅ Ideology validated successfully')
console.log('')

const archetype: ArchetypeId = 'religious-zealot'
const archetypeInfo = getArchetype(archetype)
console.log(`ARCHETYPE: ${archetypeInfo.name}`)
console.log(`Description: ${archetypeInfo.description}`)
console.log('')

const match = matchPersonality(archetype, ideology)

console.log('PERSONALITY MATCH:')
console.log('-'.repeat(70))
console.log(`🔥 PRIMARY: ${match.primary.profileName} (${match.primary.confidence}% match)`)
console.log('')

console.log('ALL RELIGIOUS ZEALOT PATTERNS:')
console.log('-'.repeat(70))
match.allMatches.forEach((m, i) => {
  const emoji = i === 0 ? '🔥' : '  '
  console.log(`${emoji} ${m.profileName}: ${m.confidence}%`)
})
console.log('')

console.log('='.repeat(70))
console.log('💀 PURGE THE XENOS! NO MERCY! NO SURVIVORS! 💀')
console.log('='.repeat(70))
