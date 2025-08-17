const { execSync } = require('child_process');

console.log('Checking for failed migrations...');

try {
  // Check migration status
  const status = execSync('npx prisma migrate status', { encoding: 'utf8' });
  
  if (status.includes('20250817000000_add_sponsored_games') && status.includes('failed')) {
    console.log('Found failed sponsored_games migration, resolving...');
    try {
      execSync('npx prisma migrate resolve --applied 20250817000000_add_sponsored_games');
      console.log('Migration resolved successfully');
    } catch (e) {
      console.log('Could not resolve migration:', e.message);
    }
  }
  
  if (status.includes('20250803000000_add_notifications') && status.includes('failed')) {
    console.log('Found failed notifications migration, resolving...');
    try {
      execSync('npx prisma migrate resolve --applied 20250803000000_add_notifications');
      console.log('Migration resolved successfully');
    } catch (e) {
      console.log('Could not resolve migration:', e.message);
    }
  }
} catch (e) {
  console.log('Could not check migration status:', e.message);
}

console.log('Proceeding with migrations...');