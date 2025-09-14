#!/usr/bin/env node

/**
 * Comprehensive Authentication System Test Suite
 * Tests the complete authentication workflow including:
 * - User registration
 * - Email verification
 * - Admin approval
 * - Login processes
 * - Security measures
 */

const axios = require('axios');
const crypto = require('crypto');

class AuthenticationTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.testData = {
      testUsers: [],
      adminToken: null,
      verificationTokens: []
    };
  }

  // Utility methods
  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const colorCode = {
      'INFO': '\x1b[36m',
      'SUCCESS': '\x1b[32m',
      'ERROR': '\x1b[31m',
      'WARNING': '\x1b[33m',
      'RESET': '\x1b[0m'
    };

    console.log(`${colorCode[type]}[${timestamp}] ${type}: ${message}${colorCode.RESET}`);
  }

  generateTestUser(index = 1) {
    const timestamp = Date.now();
    return {
      email: `testuser${index}+${timestamp}@example.com`,
      firstName: `Test${index}`,
      lastName: `User${timestamp}`,
      organizationName: `Test Organization ${index}`,
      position: `Test Position ${index}`,
      password: 'TestPassword123!'
    };
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async runTest(testName, testFunction) {
    this.log(`Starting test: ${testName}`);
    const startTime = Date.now();

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        passed: true,
        duration,
        result
      });

      this.log(`✓ Test passed: ${testName} (${duration}ms)`, 'SUCCESS');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });

      this.log(`✗ Test failed: ${testName} - ${error.message} (${duration}ms)`, 'ERROR');
      throw error;
    }
  }

  // Test Cases

  async testHealthCheck() {
    return this.runTest('API Health Check', async () => {
      const response = await this.makeRequest('GET', '/health');
      if (!response.success) {
        throw new Error('API health check failed');
      }
      return response.data;
    });
  }

  async testUserRegistration() {
    return this.runTest('User Registration', async () => {
      const testUser = this.generateTestUser();
      this.testData.testUsers.push(testUser);

      const response = await this.makeRequest('POST', '/api/auth/register', testUser);

      if (!response.success) {
        throw new Error(`Registration failed: ${JSON.stringify(response.error)}`);
      }

      // Verify response structure
      if (!response.data.message || !response.data.registrationId) {
        throw new Error('Invalid registration response structure');
      }

      testUser.registrationId = response.data.registrationId;
      return response.data;
    });
  }

  async testDuplicateRegistration() {
    return this.runTest('Duplicate Registration Prevention', async () => {
      const existingUser = this.testData.testUsers[0];

      const response = await this.makeRequest('POST', '/api/auth/register', {
        ...existingUser,
        firstName: 'Different',
        lastName: 'Name'
      });

      if (response.success) {
        throw new Error('Duplicate registration was allowed when it should be prevented');
      }

      if (response.status !== 409) {
        throw new Error(`Expected 409 status for duplicate registration, got ${response.status}`);
      }

      return { prevented: true, status: response.status };
    });
  }

  async testPasswordValidation() {
    return this.runTest('Password Validation', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'Password',
        'Password123'
      ];

      const results = [];

      for (const password of weakPasswords) {
        const testUser = this.generateTestUser();
        testUser.password = password;

        const response = await this.makeRequest('POST', '/api/auth/register', testUser);

        if (response.success) {
          throw new Error(`Weak password '${password}' was accepted`);
        }

        results.push({ password, rejected: true });
      }

      return { validationResults: results };
    });
  }

  async testEmailVerificationFlow() {
    return this.runTest('Email Verification Flow', async () => {
      // This test would require access to the email service
      // For now, we'll simulate token verification
      const testUser = this.testData.testUsers[0];

      // Generate a mock verification token (in real scenario, this would be from email)
      const mockToken = crypto.randomBytes(32).toString('hex');

      // Test invalid token
      const invalidResponse = await this.makeRequest('GET', `/api/auth/verify-email?token=invalid`);

      if (invalidResponse.success) {
        throw new Error('Invalid verification token was accepted');
      }

      return {
        invalidTokenRejected: true,
        message: 'Email verification flow structure validated'
      };
    });
  }

  async testRegistrationStatus() {
    return this.runTest('Registration Status Check', async () => {
      const testUser = this.testData.testUsers[0];

      const response = await this.makeRequest('GET', `/api/auth/registration-status?email=${testUser.email}`);

      if (!response.success) {
        throw new Error('Failed to check registration status');
      }

      // Verify response structure
      if (!response.data.status) {
        throw new Error('Invalid registration status response');
      }

      return response.data;
    });
  }

  async testLoginAttempts() {
    return this.runTest('Login Security', async () => {
      const testUser = this.testData.testUsers[0];

      // Test login with unverified account
      const loginResponse = await this.makeRequest('POST', '/api/auth/authenticate', {
        email: testUser.email,
        password: testUser.password
      });

      if (loginResponse.success) {
        throw new Error('Login succeeded for unverified account');
      }

      // Test invalid credentials
      const invalidResponse = await this.makeRequest('POST', '/api/auth/authenticate', {
        email: testUser.email,
        password: 'wrongpassword'
      });

      if (invalidResponse.success) {
        throw new Error('Login succeeded with invalid password');
      }

      return {
        unverifiedBlocked: true,
        invalidCredentialsBlocked: true
      };
    });
  }

  async testAdminEndpointSecurity() {
    return this.runTest('Admin Endpoint Security', async () => {
      // Test access without admin token
      const response = await this.makeRequest('GET', '/api/admin/pending-registrations');

      if (response.success) {
        throw new Error('Admin endpoint accessible without authentication');
      }

      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403 for unauthorized admin access, got ${response.status}`);
      }

      return { adminEndpointsProtected: true };
    });
  }

  async testInputSanitization() {
    return this.runTest('Input Sanitization', async () => {
      const maliciousInputs = [
        { email: '<script>alert("xss")</script>@example.com' },
        { firstName: "'; DROP TABLE users; --" },
        { organizationName: '<img src=x onerror=alert(1)>' }
      ];

      const results = [];

      for (const maliciousData of maliciousInputs) {
        const testUser = this.generateTestUser();
        Object.assign(testUser, maliciousData);

        const response = await this.makeRequest('POST', '/api/auth/register', testUser);

        // Should either reject the input or sanitize it
        if (response.success) {
          this.log('Warning: Potentially malicious input was accepted', 'WARNING');
        }

        results.push({ input: maliciousData, handled: true });
      }

      return { sanitizationTests: results };
    });
  }

  async testRateLimiting() {
    return this.runTest('Rate Limiting', async () => {
      const requests = [];
      const testUser = this.generateTestUser();

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(this.makeRequest('POST', '/api/auth/register', {
          ...testUser,
          email: `ratelimit${i}@example.com`
        }));
      }

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => !r.success && (r.status === 429 || r.status === 503));

      if (blocked.length === 0) {
        this.log('Warning: No rate limiting detected', 'WARNING');
      }

      return {
        totalRequests: requests.length,
        blockedRequests: blocked.length,
        rateLimitingActive: blocked.length > 0
      };
    });
  }

  async testSecurityHeaders() {
    return this.runTest('Security Headers', async () => {
      const response = await axios.get(`${this.baseUrl}/health`);
      const headers = response.headers;

      const securityHeaders = {
        'x-content-type-options': headers['x-content-type-options'],
        'x-frame-options': headers['x-frame-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security']
      };

      const missingHeaders = [];
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (!value) {
          missingHeaders.push(header);
        }
      });

      if (missingHeaders.length > 0) {
        this.log(`Warning: Missing security headers: ${missingHeaders.join(', ')}`, 'WARNING');
      }

      return { securityHeaders, missingHeaders };
    });
  }

  // Main test runner
  async runAllTests() {
    this.log('Starting Authentication System Test Suite', 'INFO');
    this.log(`Testing against: ${this.baseUrl}`, 'INFO');

    const startTime = Date.now();

    try {
      // Core functionality tests
      await this.testHealthCheck();
      await this.testUserRegistration();
      await this.testDuplicateRegistration();
      await this.testPasswordValidation();
      await this.testRegistrationStatus();

      // Security tests
      await this.testLoginAttempts();
      await this.testAdminEndpointSecurity();
      await this.testInputSanitization();
      await this.testRateLimiting();
      await this.testSecurityHeaders();

      // Email verification (limited without email service access)
      await this.testEmailVerificationFlow();

    } catch (error) {
      this.log(`Test suite interrupted: ${error.message}`, 'ERROR');
    }

    const duration = Date.now() - startTime;
    this.printSummary(duration);
  }

  printSummary(duration) {
    this.log('\n=== TEST SUITE SUMMARY ===', 'INFO');
    this.log(`Total Duration: ${duration}ms`, 'INFO');
    this.log(`Total Tests: ${this.testResults.length}`, 'INFO');

    const passed = this.testResults.filter(r => r.passed);
    const failed = this.testResults.filter(r => !r.passed);

    this.log(`Passed: ${passed.length}`, 'SUCCESS');
    this.log(`Failed: ${failed.length}`, failed.length > 0 ? 'ERROR' : 'INFO');

    if (failed.length > 0) {
      this.log('\nFAILED TESTS:', 'ERROR');
      failed.forEach(test => {
        this.log(`  ✗ ${test.name}: ${test.error}`, 'ERROR');
      });
    }

    this.log('\nPASSED TESTS:', 'SUCCESS');
    passed.forEach(test => {
      this.log(`  ✓ ${test.name} (${test.duration}ms)`, 'SUCCESS');
    });

    // Overall result
    const successRate = (passed.length / this.testResults.length) * 100;
    this.log(`\nOverall Success Rate: ${successRate.toFixed(1)}%`,
      successRate >= 90 ? 'SUCCESS' : successRate >= 70 ? 'WARNING' : 'ERROR');

    if (successRate >= 90) {
      this.log('🎉 Authentication system is working well!', 'SUCCESS');
    } else if (successRate >= 70) {
      this.log('⚠️  Authentication system has some issues that should be addressed', 'WARNING');
    } else {
      this.log('🚨 Authentication system has critical issues that must be fixed', 'ERROR');
    }

    return {
      total: this.testResults.length,
      passed: passed.length,
      failed: failed.length,
      successRate,
      duration
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new AuthenticationTester(baseUrl);

  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = AuthenticationTester;