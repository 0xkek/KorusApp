const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  console.log('Connected to database.');

  console.log('Creating index: users_username_idx...');
  await c.query('CREATE INDEX IF NOT EXISTS users_username_idx ON users(username)');

  console.log('Creating index: users_snsUsername_idx...');
  await c.query('CREATE INDEX IF NOT EXISTS "users_snsUsername_idx" ON users("snsUsername")');

  console.log('Creating index: replies_postId_isHidden_createdAt_idx...');
  await c.query('CREATE INDEX IF NOT EXISTS "replies_postId_isHidden_createdAt_idx" ON replies("postId", "isHidden", "createdAt" DESC)');

  const res = await c.query(
    "SELECT indexname FROM pg_indexes WHERE tablename IN ('users','replies') ORDER BY indexname"
  );
  console.log('All indexes on users/replies tables:');
  res.rows.forEach(r => console.log('  -', r.indexname));

  await c.end();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
