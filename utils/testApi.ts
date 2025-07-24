import { healthAPI } from './api';

export async function testBackendConnection() {
  console.log('Testing backend connection...');
  
  try {
    const result = await healthAPI.check();
    console.log('✅ Backend is reachable:', result);
    return true;
  } catch (error: any) {
    console.error('❌ Backend connection failed:', error.message);
    console.error('Full error:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.request);
    }
    
    return false;
  }
}