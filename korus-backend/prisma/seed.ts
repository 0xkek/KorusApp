import { PrismaClient } from '@prisma/client'
import { Keypair } from '@solana/web3.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const testWallets = [
    'BKJRSuAqF8tpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe',
    'RPS5yK9tgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
    'CoiN5yK9tgLpQeN4eSkVHgfr6k6pVxZfO3syhFlip'
  ]

  const users = []
  for (const wallet of testWallets) {
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: {
        walletAddress: wallet,
        tier: Math.random() > 0.5 ? 'premium' : 'standard',
        walletSource: 'app',
        genesisVerified: false
      }
    })
    users.push(user)
    console.log(`✅ Created/Updated user: ${wallet}`)
  }

  // Create test posts
  const testPosts = [
    {
      content: "Just discovered the gaming tab! The mini-games are so much fun! 🎮",
      topic: 'general',
      subtopic: 'discussion'
    },
    {
      content: "The new game room feature is amazing! Just won my first match 👀",
      topic: 'general',
      subtopic: 'announcement'
    },
    {
      content: "Love how the gaming tab is separate now! Much better experience 🎯",
      topic: 'crypto',
      subtopic: 'defi'
    },
    {
      content: "The coin flip game is my favorite! So simple yet thrilling 🪙",
      topic: 'gaming',
      subtopic: 'strategy'
    },
    {
      content: "Who else is addicted to the new gaming features? 🎲",
      topic: 'general',
      subtopic: 'question'
    }
  ]

  for (let i = 0; i < testPosts.length; i++) {
    const post = await prisma.post.create({
      data: {
        ...testPosts[i],
        authorWallet: users[i % users.length].walletAddress
      }
    })
    console.log(`✅ Created post: ${post.content.substring(0, 50)}...`)
  }

  console.log('🎉 Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })