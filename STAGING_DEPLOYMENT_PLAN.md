# Korus Staging Deployment Plan

## Phase 1: Development Environment (Current)
- [x] Smart contracts written
- [x] Frontend mainnet configuration
- [x] Backend mainnet configuration
- [ ] Local testing with Anchor

## Phase 2: Devnet Deployment (Week 1)

### Day 1-2: Contract Deployment
1. **Set up Anchor environment**
   ```bash
   cd korus-contracts
   anchor build
   anchor deploy --provider.cluster devnet
   ```

2. **Initialize contracts**
   ```bash
   npx ts-node scripts/deploy.ts
   ```

3. **Update frontend with devnet addresses**
   - Copy IDL files to `/utils/contracts/idl/`
   - Update program IDs in `gameEscrow.ts`

### Day 3-4: Integration Testing
1. **Frontend Integration**
   - Test game creation flow
   - Test game joining flow
   - Test tipping flow
   - Verify transaction confirmations

2. **Backend Integration**
   - Update game endpoints to verify on-chain state
   - Add webhook listeners for program events
   - Sync database with on-chain data

### Day 5: Staging Environment
1. **Deploy staging app**
   ```bash
   # Build staging APK
   eas build -p android --profile staging
   ```

2. **Test with real wallets**
   - Phantom wallet integration
   - Seed Vault integration
   - Transaction signing flow

## Phase 3: Testnet Release (Week 2)

### Staging Checklist
- [ ] All game flows working on devnet
- [ ] Tipping functioning correctly
- [ ] Error handling for failed transactions
- [ ] Loading states for blockchain operations
- [ ] Transaction history display

### Performance Testing
1. **Load Testing**
   - Create 100+ games
   - Concurrent users testing
   - Transaction throughput

2. **Edge Cases**
   - Network failures
   - Timeout handling
   - Insufficient funds
   - Invalid game states

## Phase 4: Mainnet Preparation (Week 3)

### Security Audit Prep
1. **Code Review**
   - Smart contract security patterns
   - Access control verification
   - Arithmetic overflow checks

2. **Documentation**
   - Contract specifications
   - Security considerations
   - Upgrade procedures

### Mainnet Deployment Requirements
1. **Funding**
   - ~5 SOL for program deployment
   - ~1 SOL for initialization
   - Treasury wallet funding

2. **Multi-sig Setup**
   - Create multi-sig authority
   - Treasury management
   - Emergency procedures

## Phase 5: Mainnet Launch (Week 4)

### Pre-Launch Checklist
- [ ] Contracts audited (if budget allows)
- [ ] Multi-sig wallets configured
- [ ] Monitoring systems ready
- [ ] Support documentation complete
- [ ] Emergency procedures documented

### Launch Day
1. **Deploy Contracts**
   ```bash
   anchor deploy --provider.cluster mainnet-beta
   ```

2. **Initialize Programs**
   - Use multi-sig for initialization
   - Verify all parameters
   - Test with small amounts first

3. **Update Production App**
   - Update program IDs
   - Enable smart contract features
   - Remove "Coming Soon" banners

### Post-Launch Monitoring
1. **On-chain Metrics**
   - Transaction success rate
   - Gas usage
   - Error frequency

2. **User Metrics**
   - Adoption rate
   - Transaction volume
   - User feedback

## Rollback Plan

### If Issues Arise:
1. **Immediate Actions**
   - Disable contract features in app
   - Pause program if critical
   - Communicate with users

2. **Recovery Steps**
   - Identify issue
   - Deploy fix to devnet
   - Test thoroughly
   - Upgrade mainnet program

## Success Criteria

### Week 1: Devnet Success
- [ ] 50+ successful test games
- [ ] 100+ test tips
- [ ] Zero critical bugs

### Week 2: Staging Success
- [ ] 10+ beta testers
- [ ] All features working
- [ ] Performance acceptable

### Week 4: Mainnet Success
- [ ] Smooth deployment
- [ ] First 100 real games
- [ ] Positive user feedback

## Timeline Summary

```
Week 1: Devnet deployment and testing
Week 2: Staging release to beta testers
Week 3: Audit prep and mainnet preparation
Week 4: Mainnet launch
```

## Budget Estimate

- Development: Completed ✓
- Devnet Testing: ~10 SOL
- Mainnet Deployment: ~10 SOL
- Audit (optional): $10-30k
- Total: ~20 SOL + audit costs