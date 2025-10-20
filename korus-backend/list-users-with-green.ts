import prisma from './src/config/database'

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        themeColor: '#43E97B'
      },
      select: {
        walletAddress: true,
        username: true,
        snsUsername: true,
        themeColor: true
      },
      take: 10
    })

    console.log(`Found ${users.length} users with green theme:`)
    users.forEach(user => {
      const displayName = user.username || user.snsUsername || 'No name'
      console.log(`  ${displayName} - ${user.walletAddress} - ${user.themeColor}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()
