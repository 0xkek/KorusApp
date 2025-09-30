# Transaction Serialization Error Fix Plan

## Problem Summary
Error: "transaction.serialize is not a function (it is undefined)"
- Occurs when trying to serialize Transaction object before signing with Mobile Wallet Adapter
- Transaction object appears to lose its prototype/methods between creation and usage

## Root Causes Identified

### 1. **Transaction Object Prototype Loss**
The Transaction object from `gameEscrowService.buildCreateGameTransaction()` is losing its prototype chain, likely during:
- Async operations
- Cross-module boundaries
- React Native bridge serialization

### 2. **Polyfill Issues**
Buffer and crypto polyfills may not be properly available when Transaction is instantiated

### 3. **MWA Integration Pattern**
Current pattern tries to serialize transaction before passing to MWA, but MWA might expect raw Transaction objects

## Tomorrow's Fix Priority

### Fix 1: Add Transaction Validation (IMMEDIATE)
```typescript
// In GamesView.tsx before serialize call:
if (!(transaction instanceof Transaction)) {
  // Reconstruct if needed
  const validTx = new Transaction();
  validTx.add(...transaction.instructions);
  validTx.recentBlockhash = transaction.recentBlockhash;
  validTx.feePayer = transaction.feePayer;
  transaction = validTx;
}
```

### Fix 2: Ensure Transaction Integrity in Service
```typescript
// In gameEscrowService.ts after building transaction:
// Force prototype restoration
Object.setPrototypeOf(transaction, Transaction.prototype);

// Validate before returning
if (typeof transaction.serialize !== 'function') {
  throw new Error('Transaction build failed - serialize method missing');
}
```

### Fix 3: Use MWA signAndSendTransactions (RECOMMENDED)
```typescript
// Instead of serialize + signTransactions + sendRawTransaction:
const result = await wallet.signAndSendTransactions({
  transactions: [transaction]
});
return result[0]; // Returns signature directly
```

### Fix 4: Alternative - Use VersionedTransaction
```typescript
import { VersionedTransaction, TransactionMessage } from '@solana/web3.js';

const message = new TransactionMessage({
  payerKey: publicKey,
  recentBlockhash: blockhash,
  instructions: [createGameIx, transferIx]
}).compileToV0Message();

const transaction = new VersionedTransaction(message);
```

## Testing Checklist
- [ ] Verify transaction instanceof Transaction before serialize
- [ ] Log transaction.constructor.name to check type
- [ ] Test with signAndSendTransactions instead of manual flow
- [ ] Check if polyfills are loaded before transaction creation
- [ ] Test with fresh Transaction object creation in transact callback

## Debug Points to Add
1. Log transaction type after creation in gameEscrowService
2. Log transaction type before serialize in GamesView
3. Check if Transaction.prototype.serialize exists at runtime
4. Verify Buffer global is available

## Version Info
- @solana/web3.js: ^1.98.2 ✓
- @solana-mobile/mobile-wallet-adapter-protocol-web3js: ^2.2.2 ✓
- React Native: 0.76.5
- Expo SDK: 53

## Notes
- The error suggests the Transaction object is being stripped of its methods
- This is common when objects cross React Native bridge boundaries
- MWA's signAndSendTransactions might handle this better internally
- Consider keeping transaction building inside the transact() callback scope