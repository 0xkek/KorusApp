import prisma from './src/config/database'

async function resetThemeColors() {
  try {
    // Reset both users back to default green
    await prisma.user.updateMany({
      where: {
        walletAddress: {
          in: ['5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L', 'V5GXkVYn2h1PDKg2kKcXFbn1Fh3WVz13wQVsjYEfB8t']
        }
      },
      data: {
        themeColor: '#43E97B' // Default green
      }
    })

    console.log('✅ Reset korus.sol and korusfun.sol to default green')
    console.log('Now go to Settings → Profile Color to choose your own color!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetThemeColors()
