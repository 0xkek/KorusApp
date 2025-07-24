import { healthAPI } from './utils/api';

async function testAPIConnection() {
  // Skip API test in offline mode
  const isOffline = true; // Force offline mode for company WiFi
  
  if (isOffline) {
    console.log('🔌 Running in OFFLINE MODE - No backend connection needed');
    return true;
  }
  
  console.log('Testing API connection...');
  
  try {
    const response = await healthAPI.check();
    console.log('✅ API Health Check Success:', response);
    return true;
  } catch (error) {
    console.error('❌ API Health Check Failed:', error);
    return false;
  }
}

// Export for use in app
export { testAPIConnection };