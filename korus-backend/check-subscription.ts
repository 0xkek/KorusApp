import prisma from './src/config/database'

async function checkSubscriptions() {
  try {
    const users = await prisma.user.findMany({
      where: {
        subscriptionStatus: {
          in: ['active', 'cancelled']
        }
      },
      select: {
        walletAddress: true,
        tier: true,
        subscriptionStatus: true,
        subscriptionType: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true
      },
      take: 10
    })

    console.log('\n=== Active/Cancelled Subscriptions ===')
    console.log(JSON.stringify(users, null, 2))
    console.log(`\nTotal: ${users.length}`)

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkSubscriptions()
