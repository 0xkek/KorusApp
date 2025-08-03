const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resolveFailedMigration() {
  try {
    console.log('Resolving failed migration...');
    
    // Mark the failed migration as rolled back
    await prisma.$executeRaw`
      UPDATE _prisma_migrations 
      SET rolled_back_at = NOW() 
      WHERE migration_name = '20250803000000_add_notifications'
    `;
    
    console.log('Failed migration marked as rolled back');
    
    // Check if notifications table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `;
    
    console.log('Notifications table exists:', tableExists[0].exists);
    
    await prisma.$disconnect();
    console.log('Migration issue resolved!');
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

resolveFailedMigration();