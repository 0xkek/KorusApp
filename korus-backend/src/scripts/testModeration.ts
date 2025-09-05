/**
 * Script to test moderation authorization
 * Run with: npx ts-node src/scripts/testModeration.ts
 */

import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

// Test cases for moderation authorization
const testCases = [
  {
    name: 'Standard user (should be denied)',
    wallet: 'TestWallet111111111111111111111111111111111',
    tier: 'standard',
    expectedResult: '403 Forbidden'
  },
  {
    name: 'Moderator user (should be allowed)',
    wallet: 'ModeratorWallet22222222222222222222222222',
    tier: 'moderator',
    expectedResult: '200 OK (or controller error)'
  },
  {
    name: 'Admin user (should be allowed)',
    wallet: 'AdminWallet333333333333333333333333333333',
    tier: 'admin',
    expectedResult: '200 OK (or controller error)'
  },
  {
    name: 'No token (should be denied)',
    wallet: null,
    tier: null,
    expectedResult: '401 Unauthorized'
  }
]

function generateTestToken(walletAddress: string | null): string | null {
  if (!walletAddress) return null
  
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error('JWT_SECRET not set in environment')
    process.exit(1)
  }
  
  return jwt.sign({ walletAddress }, jwtSecret, { expiresIn: '1h' })
}

console.log('🔐 Moderation Authorization Test Cases')
console.log('=' .repeat(50))

testCases.forEach(testCase => {
  console.log(`\n📋 Test: ${testCase.name}`)
  console.log(`   Wallet: ${testCase.wallet || 'None'}`)
  console.log(`   Tier: ${testCase.tier || 'N/A'}`)
  
  const token = generateTestToken(testCase.wallet)
  
  if (token) {
    console.log(`   Token: ${token.substring(0, 20)}...`)
  } else {
    console.log(`   Token: None`)
  }
  
  console.log(`   Expected: ${testCase.expectedResult}`)
  
  // Instructions for manual testing
  console.log(`\n   To test, create/update user in database:`)
  if (testCase.wallet && testCase.tier) {
    console.log(`   UPDATE users SET tier = '${testCase.tier}' WHERE "walletAddress" = '${testCase.wallet}';`)
  }
  
  console.log(`\n   Then make request:`)
  console.log(`   curl -X POST http://localhost:3000/api/moderation/hide \\`)
  if (token) {
    console.log(`     -H "Authorization: Bearer ${token}" \\`)
  }
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -d '{"targetType": "post", "targetId": "test123", "reason": "test"}'`)
})

console.log('\n' + '=' .repeat(50))
console.log('✅ Test tokens generated. Use the curl commands above to test.')
console.log('\n⚠️  Note: You need to have users with these wallet addresses in your database')
console.log('   with the correct tier set for the tests to work as expected.')