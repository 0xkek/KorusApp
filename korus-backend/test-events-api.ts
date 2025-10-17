/**
 * Test script for Events API
 * Run with: npx ts-node test-events-api.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const API_BASE = 'http://localhost:4000/api';

// Test wallet (you can replace with a real keypair for testing)
// For demo purposes, we'll generate a new one
const testKeypair = Keypair.generate();
const testWallet = testKeypair.publicKey.toString();

console.log('\n🧪 Testing Events API\n');
console.log('Test Wallet:', testWallet);
console.log('==========================================\n');

async function getAuthToken(): Promise<string> {
  console.log('📝 Step 1: Getting auth token...');

  // You'll need to authenticate first
  // For now, we'll return a placeholder
  // In real testing, you'd need to:
  // 1. Call /api/auth/challenge to get a message
  // 2. Sign it with the wallet
  // 3. Call /api/auth/verify to get a JWT token

  console.log('⚠️  Note: You need to authenticate first to get a real token');
  console.log('   For now, we\'ll test public endpoints only\n');

  return 'YOUR_JWT_TOKEN_HERE';
}

async function testGetEvents() {
  console.log('📋 Step 2: Testing GET /api/events (public)...');

  try {
    const response = await fetch(`${API_BASE}/events`);
    const data = await response.json();

    console.log('✅ Status:', response.status);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
    console.log('');

    return data.events || [];
  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
}

async function testCreateEvent(token: string) {
  console.log('📝 Step 3: Testing POST /api/events (create event)...');

  if (token === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  Skipping (no auth token)');
    console.log('   To test this, you need a real JWT token\n');
    return null;
  }

  const eventData = {
    type: 'whitelist',
    projectName: 'Test Project',
    title: 'Test Whitelist Event',
    description: 'This is a test event for the Events API',
    externalLink: 'https://test-project.com',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
    maxSpots: 100,
    startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week from now
    selectionMethod: 'fcfs',
    requirements: ['Hold 1+ SOL', 'Active Korus user'],
    minReputation: 100,
    minAccountAge: 7
  };

  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });

    const data = await response.json();

    console.log('✅ Status:', response.status);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
    console.log('');

    return data.event;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

function signMessage(message: string): string {
  console.log('🔏 Signing message with test wallet...');

  const messageUint8 = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageUint8, testKeypair.secretKey);
  const signatureBase58 = bs58.encode(signature);

  console.log('✅ Message signed');
  console.log('📝 Signature:', signatureBase58.substring(0, 20) + '...');
  console.log('');

  return signatureBase58;
}

async function testRegisterForWhitelist(eventId: string, token: string) {
  console.log('📝 Step 4: Testing POST /api/events/:id/register...');

  if (token === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  Skipping (no auth token)');
    console.log('   To test this, you need a real JWT token\n');
    return;
  }

  // Generate signature message
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);
  const message = `I want to join the Test Project whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

  console.log('📄 Message to sign:', message);

  // Sign the message
  const signature = signMessage(message);

  const registrationData = {
    signature,
    signedMessage: message,
    metadata: {
      twitter: '@testuser',
      discord: 'testuser#1234'
    }
  };

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(registrationData)
    });

    const data = await response.json();

    console.log('✅ Status:', response.status);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testGetEventDetails(eventId: string) {
  console.log('📋 Step 5: Testing GET /api/events/:id...');

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`);
    const data = await response.json();

    console.log('✅ Status:', response.status);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...\n');

  // Get auth token (placeholder for now)
  const token = await getAuthToken();

  // Test 1: Get all events (public)
  const events = await testGetEvents();

  // Test 2: Create event (requires auth)
  const newEvent = await testCreateEvent(token);

  if (newEvent) {
    // Test 3: Get event details
    await testGetEventDetails(newEvent.id);

    // Test 4: Register for whitelist
    await testRegisterForWhitelist(newEvent.id, token);
  } else if (events.length > 0) {
    // Use existing event for testing
    console.log('ℹ️  Using existing event for testing...\n');
    await testGetEventDetails(events[0].id);
  }

  console.log('==========================================');
  console.log('✅ Tests complete!\n');
  console.log('📝 To test protected endpoints:');
  console.log('   1. Get a JWT token by authenticating with /api/auth');
  console.log('   2. Replace YOUR_JWT_TOKEN_HERE in the script');
  console.log('   3. Run the script again\n');
}

// Run all tests
runTests().catch(console.error);
