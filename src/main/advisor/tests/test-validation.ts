/**
 * Test Zod validation with invalid data
 * Run with: npx ts-node src/main/advisor/test-validation.ts
 */

import { validateIdeology } from '../ideology/validator'

console.log('='.repeat(70))
console.log('ZOD VALIDATION TESTS')
console.log('='.repeat(70))
console.log('')

// Test 1: Valid ideology
console.log('TEST 1: Valid Ideology')
console.log('-'.repeat(70))
const valid = {
  xenophobia: 50,
  diplomacy: 55,
  militancy: 48,
  expansionism: 52,
  determination: 60,
  trade: 45,
}
const result1 = validateIdeology(valid)
console.log('Input:', JSON.stringify(valid, null, 2))
console.log(`Result: ${result1.valid ? '✅ Valid' : '❌ Invalid'}`)
if (!result1.valid) {
  console.log('Errors:', result1.errors)
}
console.log('')

// Test 2: Out of range values
console.log('TEST 2: Out of Range Values')
console.log('-'.repeat(70))
const outOfRange = {
  xenophobia: 150, // Too high
  diplomacy: 0, // Too low
  militancy: 48,
  expansionism: 52,
  determination: 60,
  trade: 45,
}
const result2 = validateIdeology(outOfRange)
console.log('Input:', JSON.stringify(outOfRange, null, 2))
console.log(`Result: ${result2.valid ? '✅ Valid' : '❌ Invalid'}`)
if (!result2.valid) {
  console.log('Errors:')
  result2.errors.forEach((err) => console.log(`  - ${err}`))
}
console.log('')

// Test 3: Missing fields
console.log('TEST 3: Missing Required Fields')
console.log('-'.repeat(70))
const missing = {
  xenophobia: 50,
  diplomacy: 55
}
const result3 = validateIdeology(missing)
console.log('Input:', JSON.stringify(missing, null, 2))
console.log(`Result: ${result3.valid ? '✅ Valid' : '❌ Invalid'}`)
if (!result3.valid) {
  console.log('Errors:')
  result3.errors.forEach((err) => console.log(`  - ${err}`))
}
console.log('')

// Test 4: Wrong types
console.log('TEST 4: Wrong Types')
console.log('-'.repeat(70))
const wrongTypes = {
  xenophobia: '50', // String instead of number
  diplomacy: 55,
  militancy: 48,
  expansionism: 52,
  determination: 60,
  trade: true, // Boolean instead of number
}
const result4 = validateIdeology(wrongTypes)
console.log('Input:', JSON.stringify(wrongTypes, null, 2))
console.log(`Result: ${result4.valid ? '✅ Valid' : '❌ Invalid'}`)
if (!result4.valid) {
  console.log('Errors:')
  result4.errors.forEach((err) => console.log(`  - ${err}`))
}
console.log('')

// Test 5: Decimal values (should fail - integers only)
console.log('TEST 5: Decimal Values (Should Fail)')
console.log('-'.repeat(70))
const decimals = {
  xenophobia: 50.5,
  diplomacy: 55.7,
  militancy: 48,
  expansionism: 52,
  determination: 60,
  trade: 45,
}
const result5 = validateIdeology(decimals)
console.log('Input:', JSON.stringify(decimals, null, 2))
console.log(`Result: ${result5.valid ? '✅ Valid' : '❌ Invalid'}`)
if (!result5.valid) {
  console.log('Errors:')
  result5.errors.forEach((err) => console.log(`  - ${err}`))
}
console.log('')

console.log('='.repeat(70))
console.log('Validation tests completed!')
console.log('='.repeat(70))
