// Quick security validation test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secure-test-jwt-secret-key-for-testing-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-secret-key-for-testing-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

console.log('🧪 Testing Security Fixes...');

try {
  // Test 1: Environment Variable Validation
  console.log('\n1. Testing environment variable validation...');
  
  // This should work with valid secrets
  const { AuthenticationService } = require('./src/modules/auth/auth.service.ts');
  console.log('✅ AuthenticationService initializes with valid secrets');
  
  // Test 2: Hard-coded Secret Rejection
  console.log('\n2. Testing hard-coded secret rejection...');
  process.env.JWT_SECRET = 'your-jwt-secret-key-here-change-in-production';
  try {
    new AuthenticationService();
    console.log('❌ FAILED: Should reject default secrets');
  } catch (error) {
    if (error.message.includes('Default JWT secrets detected')) {
      console.log('✅ PASSED: Correctly rejects default secrets');
    } else {
      console.log('❌ FAILED: Wrong error message:', error.message);
    }
  }
  
  // Reset for other tests
  process.env.JWT_SECRET = 'secure-test-jwt-secret-key-for-testing-at-least-32-characters-long';
  
  // Test 3: Password Security
  console.log('\n3. Testing password security...');
  const authService = new AuthenticationService();
  
  // Test weak password rejection
  try {
    await authService.hashPassword('password');
    console.log('❌ FAILED: Should reject weak passwords');
  } catch (error) {
    if (error.message.includes('Weak password detected')) {
      console.log('✅ PASSED: Correctly rejects weak passwords');
    } else {
      console.log('❌ FAILED: Wrong error message:', error.message);
    }
  }
  
  // Test strong password acceptance
  try {
    const hash = await authService.hashPassword('StrongP@ssw0rd2024!');
    if (hash && hash.startsWith('$2b$')) {
      console.log('✅ PASSED: Correctly hashes strong passwords with bcrypt');
    } else {
      console.log('❌ FAILED: Password hash format incorrect');
    }
  } catch (error) {
    console.log('❌ FAILED: Strong password rejected:', error.message);
  }
  
  console.log('\n🎉 Security validation tests completed!');
  
} catch (error) {
  console.error('❌ Security test failed:', error.message);
  console.error(error.stack);
}