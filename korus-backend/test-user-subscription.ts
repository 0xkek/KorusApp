import prisma from './src/config/database'

const WALLET = 'HbwpdmYvLQLqzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'

async function testUserSubscription() {
  try {
    console.log(`\n🔍 Checking subscription for wallet: ${WALLET}\n`)

    const user = await prisma.user.findUnique({
      where: { walletAddress: WALLET },
      select: {
        walletAddress: true,
        tier: true,
        subscriptionStatus: true,
        subscriptionType: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscriptionPrice: true
      }
    })

    if (!user) {
      console.log('❌ User not found in database')
      await prisma.$disconnect()
      return
    }

    console.log('📊 User Data:')
    console.log(JSON.stringify(user, null, 2))

    // Simulate what the API returns
    const isPremium = user.tier === 'premium' && user.subscriptionStatus === 'active'

    console.log('\n📦 API Would Return:')
    console.log(JSON.stringify({
      hasSubscription: user.subscriptionStatus !== 'inactive',
      status: user.subscriptionStatus,
      type: user.subscriptionType,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      price: user.subscriptionPrice,
      isPremium: isPremium
    }, null, 2))

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

testUserSubscription()
