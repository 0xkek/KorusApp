import prisma from './src/config/database'

async function updateUserTheme() {
  try {
    // Update korus.sol to have an orange theme
    const result = await prisma.user.update({
      where: {
        walletAddress: '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
      },
      data: {
        themeColor: '#FF6B35' // Orange
      }
    })

    console.log('✅ Updated korus.sol theme color')
    console.log('  Old color: #43E97B (green)')
    console.log('  New color:', result.themeColor, '(orange)')
    console.log('\n🎨 Current theme colors:')
    console.log('  korus.sol: #FF6B35 (orange)')
    console.log('  korusfun.sol: #9945FF (purple)')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserTheme()
