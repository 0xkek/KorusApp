// Test Helius API key
const axios = require('axios');
require('dotenv').config({ path: '.env.production' });

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

console.log('Testing Helius API Key...\n');

if (!HELIUS_API_KEY) {
  console.error('❌ HELIUS_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key found:', HELIUS_API_KEY.substring(0, 8) + '...');

// Test the API key with a simple request
async function testHeliusKey() {
  try {
    // Test fetching a known Solana NFT
    const response = await axios.get(`https://api.helius.xyz/v0/token-metadata`, {
      params: {
        'api-key': HELIUS_API_KEY
      }
    });
    
    console.log('✅ Helius API key is VALID and working!');
    console.log('   API Response:', response.status, response.statusText);
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ API key is INVALID - Authentication failed');
    } else if (error.response?.status === 400) {
      // This is OK - means the key works but needs proper parameters
      console.log('✅ Helius API key is VALID (received expected 400 for test request)');
    } else {
      console.error('❌ Error testing API key:', error.message);
    }
  }
}

testHeliusKey();