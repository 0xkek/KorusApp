import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestShoutout() {
  try {
    console.log('Creating test shoutout post...');

    // Create a shoutout post that expires in 2 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const shoutoutPost = await prisma.post.create({
      data: {
        authorWallet: '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L',
        content: '🚀 TEST SHOUTOUT: This is a test shoutout to verify the homepage display! Check out the golden banner and countdown timer! 📢',
        topic: 'general',
        isShoutout: true,
        shoutoutDuration: 120, // 2 hours in minutes
        shoutoutExpiresAt: expiresAt,
        shoutoutPrice: 1.20, // 2 hour price
      },
    });

    console.log('✅ Test shoutout created successfully!');
    console.log('Post ID:', shoutoutPost.id);
    console.log('Expires at:', shoutoutPost.shoutoutExpiresAt);
    console.log('\nGo to http://localhost:3000 to see it at the top of the feed!');
  } catch (error) {
    console.error('❌ Failed to create test shoutout:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestShoutout();
