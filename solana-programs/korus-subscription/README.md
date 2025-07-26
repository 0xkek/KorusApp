# Korus Subscription Smart Contract

A Solana smart contract for managing premium subscriptions with a request-to-pay model.

## Features

- **Request-to-Pay Model**: Smart contract creates payment requests that users approve in their wallet
- **Two Payment Options**: 
  - Monthly: 0.1 SOL per month
  - Yearly: 1 SOL per year (10 months for the price of 12!)
- **Grace Period**: 2-day grace period for late payments
- **Auto-expiration**: Subscriptions expire if payment requests aren't approved
- **Flexible Payment Type**: Switch between monthly and yearly anytime

## Subscription Tiers

### Basic Tier (Free)
- Default tier for all users
- Limited features
- Can upgrade to Premium anytime

### Premium Tier
- **Monthly**: 0.1 SOL per month
- **Yearly**: 1 SOL per year (save 2 months!)
- Access to all premium features
- 12-hour early access to events
- Higher reputation multipliers

## How Request-to-Pay Works

1. **Payment Due**: On the day subscription expires, a payment request is created
2. **Wallet Notification**: User receives a payment request in their wallet
3. **User Approval**: User reviews and approves/rejects the payment
4. **Auto-renewal**: Upon approval, subscription extends for another period
5. **Grace Period**: 2 days to pay after due date before losing premium status

## Integration Flow

```typescript
// 1. Create payment request when due
const createPaymentRequest = async (subscriberWallet: PublicKey) => {
  await program.methods
    .createPaymentRequest()
    .accounts({
      config: configPDA,
      subscription: subscriptionPDA,
      paymentRequest: paymentRequestPDA,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};

// 2. User approves payment request in their wallet
const approvePaymentRequest = async () => {
  await program.methods
    .approvePaymentRequest()
    .accounts({
      subscription: subscriptionPDA,
      paymentRequest: paymentRequestPDA,
      subscriber: wallet.publicKey,
      treasury: treasuryPubkey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};

// 3. Check subscription status
const getSubscriptionStatus = async (userWallet: PublicKey) => {
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  const now = Date.now() / 1000;
  
  return {
    tier: subscription.tier,
    isActive: subscription.isActive,
    paymentType: subscription.paymentType,
    nextPaymentDue: subscription.nextPaymentDue,
    inGracePeriod: now > subscription.nextPaymentDue && 
                   now < subscription.nextPaymentDue + GRACE_PERIOD,
  };
};
```

## Frontend Implementation

```typescript
// Background job to create payment requests
const checkPaymentsDue = async () => {
  const subscribers = await getAllPremiumSubscribers();
  const now = Date.now() / 1000;
  
  for (const sub of subscribers) {
    const dueToday = now >= sub.nextPaymentDue;
    if (dueToday && !sub.hasActivePaymentRequest) {
      await createPaymentRequest(sub.wallet);
    }
  }
};

// Show subscription status in UI
const SubscriptionStatus = ({ subscription }) => {
  const daysUntilDue = Math.floor(
    (subscription.nextPaymentDue - Date.now() / 1000) / (24 * 60 * 60)
  );
  
  if (!subscription.isActive) {
    return <Text>Basic Account - Upgrade to Premium</Text>;
  }
  
  if (daysUntilDue < 0) {
    return <Text>⚠️ Payment overdue! {2 + daysUntilDue} days left to pay</Text>;
  }
  
  return <Text>Premium until {formatDate(subscription.nextPaymentDue)}</Text>;
};
```

## Wallet Integration

The payment request will appear in supported Solana wallets as:
```
Payment Request from Korus
Amount: 0.1 SOL (Monthly) or 1 SOL (Yearly)
Description: Premium subscription renewal
[Approve] [Reject]
```

## Benefits of Request-to-Pay

1. **User Control**: Users explicitly approve each payment
2. **Transparency**: Clear payment amounts and timing
3. **Wallet Native**: Works with existing wallet interfaces
4. **No Surprises**: Users see and approve all charges
5. **Flexible**: Can reject and resubscribe later

## Security Features

- On-chain payment requests with expiration
- Only subscribers can approve their own requests
- Automatic status updates prevent zombie subscriptions
- PDA-based account derivation for safety