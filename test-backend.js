const axios = require('axios');

const API_URL = 'https://korusapp-production.up.railway.app';

async function testBackend() {
  console.log('🧪 Testing Korus Backend...\n');

  // Test 1: Health Check
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check:', health.data);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
  }

  // Test 2: Get Posts (no auth)
  try {
    console.log('\n📝 Testing GET /api/posts...');
    const posts = await axios.get(`${API_URL}/api/posts`);
    console.log('✅ Posts Response:', JSON.stringify(posts.data, null, 2));
  } catch (error) {
    console.error('❌ Get Posts Failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Error Details:', error.response.data.details);
    }
  }

  // Test 3: Test Auth Endpoint
  try {
    console.log('\n🔐 Testing POST /api/auth/connect...');
    const authData = {
      walletAddress: 'TestWallet123456789',
      signature: 'mock_signature',
      message: 'Test message'
    };
    const auth = await axios.post(`${API_URL}/api/auth/connect`, authData);
    console.log('✅ Auth Response:', auth.data);
  } catch (error) {
    console.error('❌ Auth Failed:', error.response?.data || error.message);
  }
}

testBackend().catch(console.error);