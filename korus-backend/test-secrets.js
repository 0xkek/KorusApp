// Test script to verify JWT and CSRF secrets are working
// Run this with: node test-secrets.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

console.log('=== TESTING SECRETS ===\n');

// Test JWT Secret
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in environment');
} else {
  console.log('✅ JWT_SECRET found');
  console.log(`   Length: ${process.env.JWT_SECRET.length} characters`);
  
  try {
    // Test creating and verifying a token
    const testPayload = { userId: 'test123', wallet: 'testWallet' };
    const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ JWT token created successfully');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT token verified successfully');
  } catch (error) {
    console.error('❌ JWT operations failed:', error.message);
  }
}

console.log('');

// Test CSRF Secret
if (!process.env.CSRF_SECRET) {
  console.error('❌ CSRF_SECRET not found in environment');
} else {
  console.log('✅ CSRF_SECRET found');
  console.log(`   Length: ${process.env.CSRF_SECRET.length} characters`);
  
  try {
    // Test creating a CSRF token
    const sessionId = 'test-session-123';
    const hash = crypto.createHmac('sha256', process.env.CSRF_SECRET)
      .update(sessionId)
      .digest('hex');
    console.log('✅ CSRF token created successfully');
    console.log(`   Sample token: ${hash.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ CSRF operations failed:', error.message);
  }
}

console.log('\n=== TEST COMPLETE ===');
console.log('If all checks passed, your secrets are properly configured.');
console.log('Remember to add these same values to Render dashboard!');