import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { verifyWalletSignature } from './utils/solana';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Simple auth endpoint
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    console.log('Auth request received:', { walletAddress });
    
    // Verify signature
    const isValid = await verifyWalletSignature(walletAddress, signature, message);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Generate token
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
  console.log(`Simple auth server running on http://localhost:${PORT}`);
});