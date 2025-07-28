const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { PublicKey } = require('@solana/web3.js');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'test-secret';

app.post('/api/auth/connect', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    console.log('=== AUTH REQUEST ===');
    console.log('Wallet:', walletAddress);
    console.log('Message:', message);
    console.log('Signature:', signature);
    
    // Verify signature
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(walletAddress).toBytes();
      
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      console.log('Signature valid:', isValid);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return res.status(401).json({ error: 'Signature verification failed' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return success
    res.json({
      token,
      user: {
        walletAddress,
        tier: 'standard',
        allyBalance: '5000',
      }
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test auth server running on http://localhost:${PORT}`);
});