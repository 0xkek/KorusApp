// Test that token features are properly disabled
const axios = require('axios');
require('dotenv').config({ path: '.env.production' });

const API_URL = 'http://localhost:3000/api';

console.log('=== TESTING TOKEN FEATURES DISABLED ===\n');
console.log('ENABLE_TOKEN_FEATURES:', process.env.ENABLE_TOKEN_FEATURES);

async function testEndpoint(method, path, description) {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${path}`,
      headers: {
        'Authorization': 'Bearer fake-token-for-testing'
      },
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.status === 503 && response.data.comingSoon) {
      console.log(`✅ ${description}: Properly disabled (${response.data.message})`);
    } else if (response.status === 401) {
      console.log(`⚠️  ${description}: Auth check first (need real token to fully test)`);
    } else {
      console.log(`❌ ${description}: Not disabled! Status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ ${description}: Error - ${error.message}`);
  }
}

async function runTests() {
  console.log('\nTesting token-dependent endpoints:\n');
  
  // Distribution endpoints
  await testEndpoint('GET', '/distribution/my', 'Distribution history');
  await testEndpoint('GET', '/distribution/leaderboard', 'Leaderboard');
  await testEndpoint('GET', '/distribution/pool', 'Pool status');
  await testEndpoint('POST', '/distribution/claim', 'Claim tokens');
  
  // Tip endpoint
  await testEndpoint('POST', '/interactions/posts/1/tip', 'Tipping');
  
  // Games with wagers
  await testEndpoint('POST', '/games', 'Create game');
  await testEndpoint('POST', '/games/1/join', 'Join game');
  
  console.log('\n=== SUMMARY ===');
  console.log('Token features should return 503 with "coming soon" message');
  console.log('Regular features (likes, posts, replies) should still work');
}

// Note: This test requires the server to be running
console.log('\n⚠️  Note: Start the server first with: npm run dev');
console.log('Then run this test in another terminal\n');

runTests();