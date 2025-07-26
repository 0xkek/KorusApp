import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function main() {
  try {
    // Check if database has any posts
    const postCount = await prisma.post.count()
    
    if (postCount === 0) {
      console.log('📊 Database is empty, running seed...')
      execSync('npx prisma db seed', { stdio: 'inherit' })
    } else {
      console.log(`✅ Database already has ${postCount} posts, skipping seed`)
    }
  } catch (error) {
    console.error('❌ Error checking database:', error)
    // Don't fail the deployment if seed check fails
    process.exit(0)
  } finally {
    await prisma.$disconnect()
  }
}

main()