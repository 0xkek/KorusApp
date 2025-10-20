import prisma from './src/config/database'

async function updateUserTheme() {
  try {
    // Update korusfun.sol to have a purple theme
    const result = await prisma.user.update({
      where: {
        walletAddress: 'V5GXkVYn2h1PDKg2kKcXFbn1Fh3WVz13wQVsjYEfB8t'
      },
      data: {
        themeColor: '#9945FF' // Solana purple
      }
    })

    console.log('✅ Updated korusfun.sol theme color')
    console.log('  Old color: #43E97B (green)')
    console.log('  New color:', result.themeColor, '(purple)')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserTheme()
