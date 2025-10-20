import prisma from './src/config/database'

async function updateKorusToBlue() {
  try {
    // Update korus.sol to blue theme
    const result = await prisma.user.update({
      where: {
        walletAddress: '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
      },
      data: {
        themeColor: '#00D4FF' // Blue
      }
    })

    console.log('✅ Updated korus.sol theme color to blue')
    console.log('  New color:', result.themeColor)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateKorusToBlue()
