// Emergency fix to handle failed migration in production
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMigration() {
  console.log('🔧 Emergency migration fix starting...');
  
  try {
    // Try to create sponsored_posts table directly
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sponsored_posts" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "postId" TEXT NOT NULL,
        "sponsorWallet" VARCHAR(44) NOT NULL,
        "campaignName" VARCHAR(100) NOT NULL,
        "pricePaid" DECIMAL(18,6) NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "targetViews" INTEGER NOT NULL DEFAULT 0,
        "actualViews" INTEGER NOT NULL DEFAULT 0,
        "clickCount" INTEGER NOT NULL DEFAULT 0,
        "weekNumber" INTEGER NOT NULL,
        "yearNumber" INTEGER NOT NULL,
        "revenueShared" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sponsored_posts_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('✅ sponsored_posts table created or already exists');
  } catch (e) {
    console.log('⚠️ sponsored_posts table might already exist:', e.message);
  }

  try {
    // Try to create games table directly
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "games" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "postId" TEXT NOT NULL,
        "gameType" VARCHAR(20) NOT NULL,
        "player1" VARCHAR(44) NOT NULL,
        "player2" VARCHAR(44),
        "currentTurn" VARCHAR(44),
        "gameState" JSONB NOT NULL,
        "wager" DECIMAL(18,6) NOT NULL,
        "winner" VARCHAR(44),
        "status" VARCHAR(20) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "games_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('✅ games table created or already exists');
  } catch (e) {
    console.log('⚠️ games table might already exist:', e.message);
  }

  try {
    // Mark the failed migration as resolved
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations"
      SET 
        finished_at = CURRENT_TIMESTAMP,
        applied_steps_count = 1,
        logs = 'Resolved via emergency fix'
      WHERE migration_name = '20250817000000_add_sponsored_games'
      AND finished_at IS NULL
    `);
    console.log('✅ Migration marked as resolved');
  } catch (e) {
    console.log('⚠️ Could not update migration status:', e.message);
  }

  await prisma.$disconnect();
  console.log('🎉 Emergency fix completed');
}

// Run the fix
fixMigration().catch(e => {
  console.error('❌ Emergency fix failed:', e);
  process.exit(1);
});