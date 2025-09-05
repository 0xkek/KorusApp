/**
 * Script to set up moderator and admin accounts
 * Run with: npx ts-node src/scripts/setupModerators.ts
 */

import prisma from '../config/database'
import dotenv from 'dotenv'

dotenv.config()

// IMPORTANT: Replace these with actual wallet addresses of your moderators/admins
const ADMIN_WALLETS: string[] = [
  // Add admin wallet addresses here
  // Example: 'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W'
]

const MODERATOR_WALLETS: string[] = [
  // Add moderator wallet addresses here  
]

async function setupModerators() {
  console.log('Setting up moderator and admin accounts...')
  
  try {
    // Update admin accounts
    for (const walletAddress of ADMIN_WALLETS) {
      const result = await prisma.user.upsert({
        where: { walletAddress },
        update: { tier: 'admin' },
        create: {
          walletAddress,
          tier: 'admin',
          allyBalance: 0
        }
      })
      console.log(`✅ Set ${walletAddress} as admin`)
    }
    
    // Update moderator accounts
    for (const walletAddress of MODERATOR_WALLETS) {
      const result = await prisma.user.upsert({
        where: { walletAddress },
        update: { tier: 'moderator' },
        create: {
          walletAddress,
          tier: 'moderator',
          allyBalance: 0
        }
      })
      console.log(`✅ Set ${walletAddress} as moderator`)
    }
    
    console.log('✅ Moderator setup complete!')
    
    // Show summary
    const adminCount = await prisma.user.count({ where: { tier: 'admin' } })
    const modCount = await prisma.user.count({ where: { tier: 'moderator' } })
    
    console.log(`\n📊 Summary:`)
    console.log(`- Admins: ${adminCount}`)
    console.log(`- Moderators: ${modCount}`)
    
  } catch (error) {
    console.error('❌ Error setting up moderators:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  setupModerators()
}