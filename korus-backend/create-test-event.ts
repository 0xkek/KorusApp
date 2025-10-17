/**
 * Create a test event with proper dates for display
 * Run with: npx ts-node create-test-event.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const API_BASE = 'http://localhost:4000/api';

// Create test wallet
const testKeypair = Keypair.generate();
const testWallet = testKeypair.publicKey.toString();

console.log('\n🎨 Creating Test Event\n');
console.log('Test Wallet:', testWallet);
console.log('==========================================\n');

async function authenticateWallet(): Promise<string> {
  console.log('🔐 Authenticating wallet...\n');

  const timestamp = Date.now();
  const message = `Sign this message to authenticate with Korus.\nWallet: ${testWallet}\nTimestamp: ${timestamp}`;

  const messageUint8 = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageUint8, testKeypair.secretKey);
  const signatureBase58 = bs58.encode(signature);

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

  console.log('  ✅ Authenticated!\n');
  return connectData.token;
}

async function createEvent(token: string): Promise<void> {
  console.log('📝 Creating event...\n');

  // Create event that:
  // - Started 1 hour ago (definitely active)
  // - Ends in 7 days
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days from now

  const eventData = {
    type: 'whitelist',
    projectName: 'CyberPunks NFT',
    title: 'CyberPunks Genesis Whitelist - Limited Spots!',
    description: 'Join the exclusive whitelist for our upcoming CyberPunks NFT collection. First-come-first-serve with only 500 spots available. Early supporters will receive special perks and benefits!',
    externalLink: 'https://cyberpunks.io',
    imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&q=80',
    maxSpots: 500,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    selectionMethod: 'fcfs',
    requirements: ['Hold 0.1+ SOL', 'Connect Solana wallet'],
    minReputation: 0, // No reputation required
    minAccountAge: 0 // No account age required
  };

  console.log('Event Details:');
  console.log('  Project:', eventData.projectName);
  console.log('  Title:', eventData.title);
  console.log('  Start Date:', startDate.toLocaleString());
  console.log('  End Date:', endDate.toLocaleString());
  console.log('  Max Spots:', eventData.maxSpots);
  console.log('');

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
  console.log('  📊 Status:', data.event.status);
  console.log('  📊 Registration Count:', data.event.registrationCount);
  console.log('');
  console.log('==========================================\n');
  console.log('✅ Test event is ready!');
  console.log('🌐 Open http://localhost:3000/events to see it\n');
}

async function run() {
  try {
    const token = await authenticateWallet();
    await createEvent(token);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

run();
