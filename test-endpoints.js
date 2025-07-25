const axios = require('axios');

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
// Use a valid Solana wallet format (base58 encoded, 32-44 chars)
const TEST_WALLET = 'So11111111111111111111111111111111111111112';
const TEST_SIGNATURE = 'H' + 'x'.repeat(87); // Valid base58 signature format
const TEST_MESSAGE = `Sign in to Korus\n\nTimestamp: ${Date.now()}`;

let authToken = null;
let createdPostId = null;

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, testFn) {
  try {
    log(`\nTesting: ${name}`, 'blue');
    await testFn();
    log(`✅ ${name} - PASSED`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} - FAILED`, 'red');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test functions
const tests = {
  async healthCheck() {
    const response = await axios.get(`${API_URL.replace('/api', '/health')}`);
    if (response.data.status !== 'OK') {
      throw new Error('Health check failed');
    }
  },

  async connectWallet() {
    const response = await axios.post(`${API_URL}/auth/connect`, {
      walletAddress: TEST_WALLET,
      signature: TEST_SIGNATURE,
      message: TEST_MESSAGE
    });
    
    if (!response.data.success || !response.data.token) {
      throw new Error('No auth token received');
    }
    
    authToken = response.data.token;
    log(`  Token received: ${authToken.substring(0, 20)}...`, 'yellow');
  },

  async getProfile() {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.user) {
      throw new Error('No user profile returned');
    }
    
    log(`  User wallet: ${response.data.user.walletAddress}`, 'yellow');
  },

  async getPosts() {
    const response = await axios.get(`${API_URL}/posts`);
    
    if (!response.data.success) {
      throw new Error('Failed to get posts');
    }
    
    log(`  Found ${response.data.posts.length} posts`, 'yellow');
  },

  async createPost() {
    const response = await axios.post(`${API_URL}/posts`, {
      content: `Test post created at ${new Date().toISOString()}`,
      topic: 'GENERAL',
      subtopic: 'general'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success || !response.data.post) {
      throw new Error('Failed to create post');
    }
    
    createdPostId = response.data.post.id;
    log(`  Created post with ID: ${createdPostId}`, 'yellow');
  },

  async createDuplicatePost() {
    try {
      // Try to create same post within 30 seconds (should fail due to rate limit)
      await axios.post(`${API_URL}/posts`, {
        content: `Another test post at ${new Date().toISOString()}`,
        topic: 'GENERAL',
        subtopic: 'general'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      throw new Error('Rate limiting not working - duplicate post was created');
    } catch (error) {
      if (error.response?.status === 429) {
        log('  Rate limiting working correctly (429 error)', 'yellow');
        return;
      }
      throw error;
    }
  },

  async getSinglePost() {
    if (!createdPostId) {
      throw new Error('No post ID to test with');
    }
    
    const response = await axios.get(`${API_URL}/posts/${createdPostId}`);
    
    if (!response.data.success || !response.data.post) {
      throw new Error('Failed to get single post');
    }
    
    log(`  Retrieved post: "${response.data.post.content.substring(0, 50)}..."`, 'yellow');
  },

  async likePost() {
    if (!createdPostId) {
      throw new Error('No post ID to test with');
    }
    
    const response = await axios.post(
      `${API_URL}/interactions/posts/${createdPostId}/like`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to like post');
    }
    
    log(`  Post liked: ${response.data.liked}`, 'yellow');
  },

  async createReply() {
    if (!createdPostId) {
      throw new Error('No post ID to test with');
    }
    
    const response = await axios.post(
      `${API_URL}/posts/${createdPostId}/replies`,
      { content: 'Test reply to the post' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!response.data.success || !response.data.reply) {
      throw new Error('Failed to create reply');
    }
    
    log(`  Created reply with ID: ${response.data.reply.id}`, 'yellow');
  },

  async getUserInteractions() {
    if (!createdPostId) {
      throw new Error('No post ID to test with');
    }
    
    const response = await axios.post(
      `${API_URL}/interactions/user`,
      { postIds: [createdPostId] },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!response.data.success || !response.data.interactions) {
      throw new Error('Failed to get user interactions');
    }
    
    const interaction = response.data.interactions[createdPostId];
    log(`  User interaction - Liked: ${interaction?.liked || false}`, 'yellow');
  },

  async testValidation() {
    try {
      // Test content too long
      await axios.post(`${API_URL}/posts`, {
        content: 'a'.repeat(501), // 501 characters
        topic: 'GENERAL',
        subtopic: 'general'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      throw new Error('Validation not working - accepted content over 500 chars');
    } catch (error) {
      if (error.response?.status === 400) {
        log('  Content validation working correctly (400 error)', 'yellow');
        return;
      }
      throw error;
    }
  }
};

// Run all tests
async function runTests() {
  log('\n🧪 Starting Korus Backend API Tests', 'blue');
  log('=====================================\n', 'blue');
  
  const results = [];
  
  // Run tests in order
  const testOrder = [
    'healthCheck',
    'connectWallet',
    'getProfile',
    'getPosts',
    'createPost',
    'createDuplicatePost',
    'getSinglePost',
    'likePost',
    'createReply',
    'getUserInteractions',
    'testValidation'
  ];
  
  for (const testName of testOrder) {
    const passed = await testEndpoint(testName, tests[testName]);
    results.push({ name: testName, passed });
  }
  
  // Summary
  log('\n=====================================', 'blue');
  log('Test Summary:', 'blue');
  log('=====================================\n', 'blue');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    log(`${r.passed ? '✅' : '❌'} ${r.name}`, r.passed ? 'green' : 'red');
  });
  
  log(`\nTotal: ${results.length} tests`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if backend is running
axios.get(`${API_URL.replace('/api', '/health')}`)
  .then(() => {
    log('✅ Backend is running', 'green');
    runTests();
  })
  .catch(() => {
    log('❌ Backend is not running. Please start it with: cd korus-backend && npm run dev', 'red');
    process.exit(1);
  });