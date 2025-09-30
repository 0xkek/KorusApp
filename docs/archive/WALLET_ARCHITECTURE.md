# Korus Wallet Architecture - Interface Model

## Overview
Korus app acts as an interface to external wallets, never storing private keys. Users authenticate by signing messages with their wallet of choice.

## Architecture Principles

### 1. No Private Key Storage
- App NEVER stores private keys
- All signing happens in external wallets
- Only public addresses stored in app

### 2. One Account Per User
- Each wallet address = one account
- No multiple accounts per wallet
- Profile data tied to wallet address

### 3. Multi-Wallet Support
- Seed Vault (primary for Seeker users)
- Phantom Wallet
- Solflare
- Other Solana wallets via WalletConnect

## User Flows

### New User (No Wallet)
1. User opens app
2. App prompts: "Connect Wallet" or "I'm New"
3. If "I'm New":
   - Redirect to Seed Vault download
   - OR guide to create Phantom wallet
   - Return to app after wallet creation
4. Continue to "Existing Wallet" flow

### Existing Wallet User
1. User taps "Connect Wallet"
2. App shows wallet options:
   - Seed Vault (recommended for Seeker users)
   - Phantom
   - Other wallets
3. User selects wallet
4. App requests signature of login message:
   ```
   Sign this message to authenticate with Korus
   Timestamp: [current timestamp]
   Nonce: [random nonce]
   ```
5. Wallet signs message
6. App sends to backend:
   - Wallet address
   - Signed message
   - Message content
7. Backend verifies signature
8. Backend creates/retrieves user account
9. Returns JWT for session

### Returning User
1. App checks for stored session (JWT)
2. If valid session:
   - Auto-login with stored wallet address
   - No signature needed
3. If expired/invalid:
   - Request new signature
   - Refresh session

## Technical Implementation

### Frontend Changes

#### Remove Private Key Management
```typescript
// REMOVE these functions from WalletContext:
- createNewWallet() // No longer create wallets
- getPrivateKey() // Never expose private keys
- getRecoveryPhrase() // Not our responsibility

// KEEP these functions:
+ connectWallet(provider: WalletProvider) // Connect to external
+ signMessage(message: string) // Request signature
+ disconnect() // Clear session
```

#### Wallet Connection Flow
```typescript
interface WalletProvider {
  name: 'seedvault' | 'phantom' | 'solflare';
  connect: () => Promise<string>; // Returns public key
  signMessage: (message: string) => Promise<string>; // Returns signature
  disconnect: () => void;
}

// Seed Vault Implementation
const seedVaultProvider: WalletProvider = {
  name: 'seedvault',
  connect: async () => {
    const wallet = await solanaMobileService.connect();
    return wallet.address;
  },
  signMessage: async (message: string) => {
    return await solanaMobileService.signMessage(message);
  },
  disconnect: () => {
    solanaMobileService.disconnect();
  }
};

// Phantom Implementation
const phantomProvider: WalletProvider = {
  name: 'phantom',
  connect: async () => {
    const resp = await window.solana.connect();
    return resp.publicKey.toString();
  },
  signMessage: async (message: string) => {
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage);
    return bs58.encode(signedMessage.signature);
  },
  disconnect: () => {
    window.solana.disconnect();
  }
};
```

### Backend Changes

#### Strict One Account Policy
```typescript
// In authController.ts
export const connectWallet = async (req: Request, res: Response) => {
  const { walletAddress, signature, message } = req.body;
  
  // Verify signature
  const isValid = await verifyWalletSignature(
    walletAddress,
    signature,
    message
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Check message freshness (prevent replay attacks)
  const messageData = JSON.parse(message);
  const timestamp = messageData.timestamp;
  const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
  
  if (ageInMinutes > 5) {
    return res.status(401).json({ error: 'Message too old' });
  }
  
  // One account per wallet
  let user = await prisma.user.findUnique({
    where: { walletAddress }
  });
  
  if (!user) {
    // Check Genesis NFT ownership
    const hasGenesis = await checkGenesisTokenOwnership(walletAddress);
    
    user = await prisma.user.create({
      data: {
        walletAddress,
        tier: hasGenesis ? 'premium' : 'standard',
        genesisVerified: hasGenesis
      }
    });
  }
  
  // Generate session JWT
  const token = jwt.sign(
    { walletAddress },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return res.json({ token, user });
};
```

## Migration Strategy

### Phase 1: Dual Support (1 month)
- Keep existing wallet creation for current users
- Add external wallet connection option
- New users directed to external wallets

### Phase 2: Migration Push (1 month)
- Prompt existing users to migrate
- "Connect External Wallet" banner
- Incentive: Bonus reputation for migrating

### Phase 3: Deprecation (2 weeks)
- Disable new wallet creation
- Final migration warnings
- Export wallet helper tool

### Phase 4: External Only
- Remove all private key code
- External wallets only
- Clean, secure architecture

## Benefits

### Security
- No private key liability
- Industry standard wallet security
- User controls their keys

### User Experience
- Use existing wallet across apps
- No seed phrase management in Korus
- Easy device switching

### Seeker Integration
- Seamless for Genesis holders
- Same wallet everywhere
- Unified identity

### Development
- Less security responsibility
- Simpler codebase
- Focus on app features

## Considerations

### Onboarding Friction
- Extra step for new users
- Solution: Clear guides, videos

### Wallet Availability
- Not all users have wallets
- Solution: Partner with wallet providers

### Transaction Signing
- Each transaction needs wallet approval
- Solution: Batch operations, clear UX

## Session Management

### JWT Strategy
```typescript
// Login creates session
POST /api/auth/connect
{
  walletAddress: "...",
  signature: "...",
  message: "{timestamp, nonce}"
}
→ Returns: { token: "jwt...", expiresIn: "7d" }

// All API calls use JWT
GET /api/posts
Headers: { Authorization: "Bearer jwt..." }

// Refresh before expiry
POST /api/auth/refresh
Headers: { Authorization: "Bearer old-jwt..." }
→ Returns: { token: "new-jwt...", expiresIn: "7d" }
```

## Implementation Timeline

### Week 1
- [ ] Add wallet connection UI
- [ ] Implement Seed Vault connector
- [ ] Update authentication flow

### Week 2
- [ ] Add Phantom connector
- [ ] Test signature verification
- [ ] Update user onboarding

### Week 3
- [ ] Migration tools for existing users
- [ ] Documentation update
- [ ] Testing with beta users

### Week 4
- [ ] Full rollout
- [ ] Monitor adoption
- [ ] Remove old wallet code

## Code Changes Summary

### Remove
- Private key generation
- Seed phrase storage
- Wallet encryption logic
- Key derivation code

### Add
- Wallet connectors
- Signature verification
- Session management
- Migration tools

### Keep
- User profiles
- Reputation system
- All app features

This architecture makes Korus a true dApp - secure, decentralized, and user-controlled.