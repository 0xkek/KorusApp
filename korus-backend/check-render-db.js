// Script to check if Render database is configured
console.log('=== Render Database Configuration Check ===\n');

// Check DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL is set');
  
  // Parse the URL to show connection info (without password)
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432'}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   User: ${url.username}`);
    console.log(`   SSL: ${url.searchParams.get('sslmode') || 'not specified'}`);
  } catch (e) {
    console.log('   (Could not parse DATABASE_URL)');
  }
} else {
  console.log('❌ DATABASE_URL is NOT set');
  console.log('   The backend will run in MOCK MODE (no data persistence)');
}

console.log('\n=== Other Environment Variables ===\n');

// Check other important env vars
const envVars = {
  'NODE_ENV': process.env.NODE_ENV || 'not set',
  'JWT_SECRET': process.env.JWT_SECRET ? '✅ Set' : '❌ Not set',
  'PORT': process.env.PORT || '3000',
  'MOCK_MODE': process.env.MOCK_MODE || 'not set'
};

for (const [key, value] of Object.entries(envVars)) {
  console.log(`${key}: ${value}`);
}

console.log('\n=== Recommendations ===\n');

if (!process.env.DATABASE_URL) {
  console.log('To use a real database on Render:');
  console.log('1. Go to your Render dashboard');
  console.log('2. Click on your web service (korus-backend)');
  console.log('3. Go to "Environment" tab');
  console.log('4. Add a PostgreSQL database:');
  console.log('   - Click "Add Environment Variable"');
  console.log('   - Or use Render PostgreSQL addon');
  console.log('5. Set DATABASE_URL to your PostgreSQL connection string');
  console.log('\nExample DATABASE_URL format:');
  console.log('postgresql://user:password@host:5432/database?sslmode=require');
}