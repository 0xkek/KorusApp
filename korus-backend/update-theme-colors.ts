import prisma from './src/config/database'

/**
 * Update all users with null theme colors to have the default green theme
 */
async function updateThemeColors() {
  try {
    console.log('🔍 Finding users with null theme colors...')

    const usersWithNullTheme = await prisma.user.findMany({
      where: {
        themeColor: null
      },
      select: {
        walletAddress: true,
        username: true,
        snsUsername: true
      }
    })

    console.log(`📊 Found ${usersWithNullTheme.length} users with null theme colors`)

    if (usersWithNullTheme.length === 0) {
      console.log('✅ All users already have theme colors set!')
      return
    }

    console.log('\n👥 Users to update:')
    usersWithNullTheme.forEach(user => {
      const displayName = user.username || user.snsUsername || user.walletAddress.slice(0, 8)
      console.log(`  - ${displayName} (${user.walletAddress})`)
    })

    console.log('\n🔄 Updating users with default green theme color (#43E97B)...')

    const result = await prisma.user.updateMany({
      where: {
        themeColor: null
      },
      data: {
        themeColor: '#43E97B'
      }
    })

    console.log(`✅ Successfully updated ${result.count} users!`)
    console.log('\n🎨 All users now have theme colors assigned.')

  } catch (error) {
    console.error('❌ Error updating theme colors:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateThemeColors()
  .then(() => {
    console.log('\n✨ Theme color update completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Theme color update failed:', error)
    process.exit(1)
  })
