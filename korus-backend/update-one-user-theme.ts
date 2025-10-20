import prisma from './src/config/database'

async function updateUserTheme() {
  try {
    // Update korusfun.sol to have a purple theme instead of green
    const result = await prisma.user.update({
      where: {
        walletAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
      },
      data: {
        themeColor: '#9945FF' // Purple color
      }
    })

    console.log('✅ Updated korusfun.sol theme to purple:', result.themeColor)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserTheme()
