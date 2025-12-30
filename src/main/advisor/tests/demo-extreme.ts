/**
 * Demo file showcasing extreme personality patterns
 * Run with: npx ts-node src/main/advisor/demo-extreme.ts
 */

import { IdeologyProfile } from '../ideology/types'
import { matchPersonality } from '../ideology/pattern-matcher'

console.log('='.repeat(70))
console.log('AURORA 4X ADVISOR - EXTREME PERSONALITIES SHOWCASE')
console.log('='.repeat(70))
console.log('')

// Test 1: Xenophobic Warmonger Nationalist
console.log('🔥 TEST 1: XENOPHOBIC WARMONGER NATIONALIST')
console.log('-'.repeat(70))

const ideology1: IdeologyProfile = {
  xenophobia: 90,
  diplomacy: 25,
  militancy: 95,
  expansionism: 80,
  determination: 85,
  trade: 20,
  translation: -10
}

console.log('Ideology: Genocidal Xenophobia + Bloodthirsty Militancy')
const match1 = matchPersonality('staunch-nationalist', ideology1)
console.log(`✅ Detected: ${match1.primary.patternName} (${match1.primary.confidence}% match)`)
console.log('')

// Test 2: Galactic Merchant Republic
console.log('💰 TEST 2: GALACTIC MERCHANT REPUBLIC')
console.log('-'.repeat(70))

const ideology2: IdeologyProfile = {
  xenophobia: 15,
  diplomacy: 90,
  militancy: 20,
  expansionism: 85,
  determination: 60,
  trade: 95,
  translation: 18
}

console.log('Ideology: Welcoming Xenophilia + Merchant Republic Trade')
const match2 = matchPersonality('corporate-executive', ideology2)
console.log(`✅ Detected: ${match2.primary.patternName} (${match2.primary.confidence}% match)`)
console.log('')

// Test 3: Revolutionary Expansionist Commissar
console.log('⚒️  TEST 3: REVOLUTIONARY EXPANSIONIST COMMISSAR')
console.log('-'.repeat(70))

const ideology3: IdeologyProfile = {
  xenophobia: 50,
  diplomacy: 55,
  militancy: 75,
  expansionism: 90,
  determination: 95,
  trade: 40,
  translation: 0
}

console.log('Ideology: Fanatical Determination + Lebensraum Expansion')
const match3 = matchPersonality('communist-commissar', ideology3)
console.log(`✅ Detected: ${match3.primary.patternName} (${match3.primary.confidence}% match)`)
console.log('')

// Test 4: Total War Strategist
console.log('⚔️  TEST 4: TOTAL WAR STRATEGIST')
console.log('-'.repeat(70))

const ideology4: IdeologyProfile = {
  xenophobia: 85,
  diplomacy: 15,
  militancy: 98,
  expansionism: 75,
  determination: 92,
  trade: 25,
  translation: -15
}

console.log('Ideology: Bloodthirsty Militancy + Fanatical Determination')
const match4 = matchPersonality('military-strategist', ideology4)
console.log(`✅ Detected: ${match4.primary.patternName} (${match4.primary.confidence}% match)`)
console.log('')

// Test 5: Research-Obsessed Technocrat
console.log('🔬 TEST 5: RESEARCH-OBSESSED TECHNOCRAT')
console.log('-'.repeat(70))

const ideology5: IdeologyProfile = {
  xenophobia: 65,
  diplomacy: 40,
  militancy: 35,
  expansionism: 25,
  determination: 88,
  trade: 30,
  translation: 5
}

console.log('Ideology: Unbreakable Research Focus + Isolationist Fortress')
const match5 = matchPersonality('technocrat-admin', ideology5)
console.log(`✅ Detected: ${match5.primary.patternName} (${match5.primary.confidence}% match)`)
console.log('')

// Test 6: Imperial Conqueror
console.log('👑 TEST 6: IMPERIAL CONQUEROR')
console.log('-'.repeat(70))

const ideology6: IdeologyProfile = {
  xenophobia: 75,
  diplomacy: 50,
  militancy: 85,
  expansionism: 92,
  determination: 88,
  trade: 35,
  translation: -5
}

console.log('Ideology: Lebensraum Expansion + Warmonger Militancy')
const match6 = matchPersonality('monarchist-advisor', ideology6)
console.log(`✅ Detected: ${match6.primary.patternName} (${match6.primary.confidence}% match)`)
console.log('')

// Test 7: Galactic Peace Unifier
console.log('🕊️  TEST 7: GALACTIC PEACE UNIFIER')
console.log('-'.repeat(70))

const ideology7: IdeologyProfile = {
  xenophobia: 8,
  diplomacy: 95,
  militancy: 12,
  expansionism: 55,
  determination: 60,
  trade: 85,
  translation: 22
}

console.log('Ideology: Naive Xenophilia + Master Negotiator Diplomacy')
const match7 = matchPersonality('diplomatic-envoy', ideology7)
console.log(`✅ Detected: ${match7.primary.patternName} (${match7.primary.confidence}% match)`)
console.log('')

// Test 8: Holy Crusader
console.log('✝️  TEST 8: HOLY CRUSADER')
console.log('-'.repeat(70))

const ideology8: IdeologyProfile = {
  xenophobia: 80,
  diplomacy: 20,
  militancy: 90,
  expansionism: 85,
  determination: 98,
  trade: 30,
  translation: -8
}

console.log('Ideology: Fanatical Determination + Bloodthirsty Holy War')
const match8 = matchPersonality('religious-zealot', ideology8)
console.log(`✅ Detected: ${match8.primary.patternName} (${match8.primary.confidence}% match)`)
console.log('')

// Test 9: Fanatic Purifier (THE MOST EXTREME)
console.log('💀 TEST 9: FANATIC PURIFIER (GENOCIDAL EXTREMIST)')
console.log('-'.repeat(70))

const ideology9: IdeologyProfile = {
  xenophobia: 98,
  diplomacy: 5,
  militancy: 95,
  expansionism: 85,
  determination: 98,
  trade: 10,
  translation: -22
}

console.log('Ideology: Genocidal + Bloodthirsty + Fanatical + Incomprehensible')
const match9 = matchPersonality('religious-zealot', ideology9)
console.log(`✅ Detected: ${match9.primary.patternName} (${match9.primary.confidence}% match)`)
console.log('')

console.log('='.repeat(70))
console.log('🎉 All 9 extreme personality patterns showcased!')
console.log('   (Including the most genocidal: Fanatic Purifier 💀)')
console.log('='.repeat(70))
