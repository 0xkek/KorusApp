import prisma from './src/config/database'

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
      },
      select: {
        walletAddress: true,
        username: true,
        snsUsername: true,
        tier: true
      }
    })

    console.log('\n=== User Data ===')
    console.log(JSON.stringify(user, null, 2))

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkUser()
