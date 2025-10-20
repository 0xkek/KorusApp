import prisma from './src/config/database'

async function findUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'korusfun', mode: 'insensitive' } },
          { snsUsername: { contains: 'korusfun', mode: 'insensitive' } }
        ]
      },
      select: {
        walletAddress: true,
        username: true,
        snsUsername: true,
        themeColor: true
      }
    })

    if (user) {
      console.log('Found korusfun.sol:')
      console.log('  Wallet:', user.walletAddress)
      console.log('  Username:', user.username)
      console.log('  SNS:', user.snsUsername)
      console.log('  Theme:', user.themeColor)
    } else {
      console.log('korusfun.sol not found')

      // List all users with usernames
      console.log('\nAll users with names:')
      const allUsers = await prisma.user.findMany({
        where: {
          OR: [
            { username: { not: null } },
            { snsUsername: { not: null } }
          ]
        },
        select: {
          walletAddress: true,
          username: true,
          snsUsername: true,
          themeColor: true
        }
      })

      allUsers.forEach(u => {
        const name = u.username || u.snsUsername
        console.log('  ' + name + ' - ' + u.walletAddress)
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findUser()
