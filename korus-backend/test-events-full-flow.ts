/**
 * Full flow test for Events API with authentication
 * Run with: npx ts-node test-events-full-flow.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const API_BASE = 'http://localhost:4000/api';

// Create test wallet
const testKeypair = Keypair.generate();
const testWallet = testKeypair.publicKey.toString();

console.log('\n🧪 Testing Events API - Full Flow\n');
console.log('Test Wallet:', testWallet);
console.log('==========================================\n');

/**
 * Step 1: Authenticate and get JWT token
 */
async function authenticateWallet(): Promise<string> {
  console.log('🔐 Step 1: Authenticating wallet...\n');

  try {
    // 1.1: Create message with timestamp
    console.log('  1.1: Creating signature message...');
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with Korus.\nWallet: ${testWallet}\nTimestamp: ${timestamp}`;
    console.log('  ✅ Message created\n');

    // 1.2: Sign the message
    console.log('  1.2: Signing message with wallet...');
    const messageUint8 = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageUint8, testKeypair.secretKey);
    const signatureBase58 = bs58.encode(signature);
    console.log('  ✅ Signature created:', signatureBase58.substring(0, 30) + '...\n');

    // 1.3: Connect wallet and get JWT token
    console.log('  1.3: Connecting wallet and getting JWT token...');
    const connectResponse = await fetch(`${API_BASE}/auth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: testWallet,
        signature: signatureBase58,
        message
      })
    });

    const connectData = await connectResponse.json();

    if (!connectData.token) {
      throw new Error('Failed to get JWT token: ' + JSON.stringify(connectData));
    }

    console.log('  ✅ JWT Token obtained!');
    console.log('  📊 User tier:', connectData.user.tier);
    console.log('  📊 Genesis verified:', connectData.user.genesisVerified);
    console.log('');
    console.log('==========================================\n');

    return connectData.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Step 2: Create a new event
 */
async function createTestEvent(token: string): Promise<any> {
  console.log('📝 Step 2: Creating test event...\n');

  const eventData = {
    type: 'whitelist',
    projectName: 'Test NFT Project',
    title: 'Genesis Mint Whitelist',
    description: 'Get early access to our exclusive NFT collection. Limited spots available!',
    externalLink: 'https://test-nft-project.com',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
    maxSpots: 100,
    startDate: new Date(Date.now() - 1000 * 60).toISOString(), // Started 1 minute ago
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // Ends 1 week from now
    selectionMethod: 'fcfs',
    requirements: ['Hold 1+ SOL', 'Active Korus user'],
    minReputation: 0, // No reputation required for test
    minAccountAge: 0 // No account age required for test
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

    if (!response.ok) {
      throw new Error(`Failed to create event: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Event created successfully!');
    console.log('  📊 Event ID:', data.event.id);
    console.log('  📊 Project:', data.event.projectName);
    console.log('  📊 Max Spots:', data.event.maxSpots);
    console.log('  📊 Selection Method:', data.event.selectionMethod);
    console.log('');
    console.log('==========================================\n');

    return data.event;
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    throw error;
  }
}

/**
 * Step 3: Get event details
 */
async function getEventDetails(eventId: string): Promise<void> {
  console.log('📋 Step 3: Getting event details...\n');

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to get event: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Event details retrieved');
    console.log('  📊 View Count:', data.event.viewCount);
    console.log('  📊 Registration Count:', data.event.registrationCount);
    console.log('  📊 Status:', data.event.status);
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to get event details:', error);
    throw error;
  }
}

/**
 * Step 4: Register for whitelist
 */
async function registerForWhitelist(eventId: string, projectName: string, token: string): Promise<void> {
  console.log('📝 Step 4: Registering for whitelist...\n');

  // Generate signature message
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);
  const message = `I want to join the ${projectName} whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

  console.log('  4.1: Signing registration message...');
  const messageUint8 = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageUint8, testKeypair.secretKey);
  const signatureBase58 = bs58.encode(signature);
  console.log('  ✅ Registration signature created\n');

  const registrationData = {
    signature: signatureBase58,
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

    if (!response.ok) {
      throw new Error(`Failed to register: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Successfully registered for whitelist!');
    console.log('  📊 Position:', data.registration.position || 'N/A');
    console.log('  📊 Status:', data.registration.status);
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to register for whitelist:', error);
    throw error;
  }
}

/**
 * Step 5: Check registration status
 */
async function checkRegistrationStatus(eventId: string, token: string): Promise<void> {
  console.log('📋 Step 5: Checking registration status...\n');

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to check status: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Registration status retrieved');
    console.log('  📊 Registered:', data.registered);
    if (data.registration) {
      console.log('  📊 Position:', data.registration.position || 'N/A');
      console.log('  📊 Status:', data.registration.status);
      console.log('  📊 Registered At:', new Date(data.registration.registeredAt).toLocaleString());
    }
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to check registration status:', error);
    throw error;
  }
}

/**
 * Step 6: Get all registrations (creator only)
 */
async function getEventRegistrations(eventId: string, token: string): Promise<void> {
  console.log('📋 Step 6: Getting all event registrations (creator only)...\n');

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/registrations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to get registrations: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Registrations retrieved');
    console.log('  📊 Total Registrations:', data.registrations.length);
    if (data.event) {
      console.log('  📊 Event:', data.event.projectName);
    }
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to get registrations:', error);
    throw error;
  }
}

/**
 * Step 7: Export registrations as CSV (creator only)
 */
async function exportRegistrations(eventId: string, token: string): Promise<void> {
  console.log('📊 Step 7: Exporting registrations as CSV...\n');

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/export?format=csv`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const csvData = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to export: ${csvData}`);
    }

    console.log('  ✅ CSV export successful!');
    console.log('  📄 CSV Preview:');
    console.log('  ' + csvData.split('\n').slice(0, 3).join('\n  '));
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to export registrations:', error);
    throw error;
  }
}

/**
 * Step 8: Get all events
 */
async function getAllEvents(): Promise<void> {
  console.log('📋 Step 8: Getting all events...\n');

  try {
    const response = await fetch(`${API_BASE}/events`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to get events: ${JSON.stringify(data)}`);
    }

    console.log('  ✅ Events list retrieved');
    console.log('  📊 Total Events:', data.events.length);
    console.log('');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Failed to get events:', error);
    throw error;
  }
}

/**
 * Main test flow
 */
async function runFullTest() {
  console.log('🚀 Starting full integration test...\n');

  try {
    // Step 1: Authenticate
    const token = await authenticateWallet();

    // Step 2: Create event
    const event = await createTestEvent(token);

    // Step 3: Get event details
    await getEventDetails(event.id);

    // Step 4: Register for whitelist
    await registerForWhitelist(event.id, event.projectName, token);

    // Step 5: Check registration status
    await checkRegistrationStatus(event.id, token);

    // Step 6: Get all registrations
    await getEventRegistrations(event.id, token);

    // Step 7: Export registrations
    await exportRegistrations(event.id, token);

    // Step 8: Get all events
    await getAllEvents();

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📝 Summary:');
    console.log('  ✅ Authentication works');
    console.log('  ✅ Event creation works');
    console.log('  ✅ Event details retrieval works');
    console.log('  ✅ Whitelist registration works');
    console.log('  ✅ Registration status check works');
    console.log('  ✅ Registrations list works (creator only)');
    console.log('  ✅ CSV export works (creator only)');
    console.log('  ✅ Events listing works');
    console.log('');
    console.log('🎉 Events API is fully functional!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run all tests
runFullTest().catch(console.error);
