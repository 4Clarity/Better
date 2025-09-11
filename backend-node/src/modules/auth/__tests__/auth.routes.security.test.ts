/**
 * SECURITY INTEGRATION TESTS FOR AUTH ROUTES
 * 
 * Tests the actual HTTP endpoints for security vulnerabilities
 * Focus on rate limiting, input validation, and proper error handling
 */

import Fastify from 'fastify';
import { AuthRoutes } from '../auth.routes';

describe('Auth Routes - Security Integration Tests', () => {
  let server: any;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    
    // Register rate limiting
    await server.register(import('@fastify/rate-limit'), {
      max: 5,
      timeWindow: '1 minute'
    });

    // Mock auth service
    server.decorate('authService', {
      login: jest.fn(),
      validateAccessToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      logout: jest.fn(),
      sanitizeInput: (input: string) => input.replace(/[<>'"]/g, ''),
      isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    });

    // Register auth routes
    server.register(AuthRoutes);
    
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('🚨 RATE LIMITING PROTECTION', () => {
    it('should BLOCK excessive login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password'
      };

      // Make 6 requests (limit is 5)
      const requests = Array(6).fill(null).map(() => 
        server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: loginData
        })
      );

      const responses = await Promise.all(requests);
      
      // First 5 should be processed, 6th should be rate limited
      expect(responses.slice(0, 5).every(r => r.statusCode !== 429)).toBe(true);
      expect(responses[5].statusCode).toBe(429);
      expect(responses[5].json().error).toContain('Rate limit exceeded');
    });

    it('should RESET rate limit after time window', async () => {
      const loginData = {
        email: 'test@example.com', 
        password: 'password'
      };

      // Hit rate limit
      await Promise.all(Array(5).fill(null).map(() =>
        server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: loginData
        })
      ));

      // 6th request should be blocked
      const blockedResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData
      });
      expect(blockedResponse.statusCode).toBe(429);

      // Mock time passage (in real test, would need to wait or mock timer)
      jest.advanceTimersByTime(61000); // 61 seconds

      // Should allow requests again
      const allowedResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData
      });
      expect(allowedResponse.statusCode).not.toBe(429);
    });

    it('should APPLY rate limiting per IP address', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };

      // Hit limit from IP 1
      await Promise.all(Array(5).fill(null).map(() =>
        server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: loginData,
          headers: { 'x-forwarded-for': '192.168.1.100' }
        })
      ));

      // IP 1 should be blocked
      const ip1Blocked = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });
      expect(ip1Blocked.statusCode).toBe(429);

      // IP 2 should still work
      const ip2Allowed = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
        headers: { 'x-forwarded-for': '192.168.1.200' }
      });
      expect(ip2Allowed.statusCode).not.toBe(429);
    });
  });

  describe('🛡️ INPUT VALIDATION SECURITY', () => {
    it('should REJECT malformed email addresses', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'test@',
        'test..test@domain.com',
        '',
        null,
        undefined
      ];

      for (const email of invalidEmails) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email, password: 'password' }
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().error).toContain('Invalid email format');
      }
    });

    it('should SANITIZE XSS attempts in input', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload="alert(1)"',
        '<img src="x" onerror="alert(1)">',
      ];

      for (const payload of xssPayloads) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { 
            email: `test${payload}@example.com`,
            password: 'password'
          }
        });

        // Should not contain the XSS payload in response
        const responseText = JSON.stringify(response.json());
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror=');
      }
    });

    it('should PREVENT SQL injection in email field', async () => {
      const sqlInjectionPayloads = [
        "test@example.com'; DROP TABLE users; --",
        "test@example.com' OR '1'='1",
        "test@example.com'; UPDATE users SET password='hacked'; --",
        "test@example.com' UNION SELECT password FROM users --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email: payload, password: 'password' }
        });

        // Should sanitize and not execute SQL
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toContain('Invalid email format');
      }
    });

    it('should ENFORCE maximum input lengths', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const longPassword = 'p'.repeat(500);

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { 
          email: longEmail,
          password: longPassword 
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('Input too long');
    });
  });

  describe('🔒 TOKEN SECURITY VALIDATION', () => {
    it('should REJECT requests with missing Authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me'
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Authentication required');
    });

    it('should REJECT malformed Bearer tokens', async () => {
      const invalidTokens = [
        'Bearer',
        'Bearer ',
        'InvalidTokenFormat',
        'Bearer not.a.jwt',
        'Bearer ' + 'a'.repeat(1000), // Extremely long token
      ];

      for (const authHeader of invalidTokens) {
        const response = await server.inject({
          method: 'GET',
          url: '/auth/me',
          headers: { authorization: authHeader }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error).toContain('Invalid token');
      }
    });

    it('should VALIDATE token signature integrity', async () => {
      // Mock service to reject tampered tokens
      server.authService.validateAccessToken.mockResolvedValue(null);

      const tamperedToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';

      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: tamperedToken }
      });

      expect(response.statusCode).toBe(401);
      expect(server.authService.validateAccessToken).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature');
    });

    it('should PROPERLY handle expired tokens', async () => {
      server.authService.validateAccessToken.mockResolvedValue(null);

      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: 'Bearer expired.token.here' }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain('Token expired or invalid');
    });
  });

  describe('🔐 SECURE LOGOUT FUNCTIONALITY', () => {
    it('should INVALIDATE all user sessions on logout', async () => {
      server.authService.logout.mockResolvedValue({ success: true });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: 'Bearer valid.token.here' }
      });

      expect(response.statusCode).toBe(200);
      expect(server.authService.logout).toHaveBeenCalledWith('valid.token.here');
    });

    it('should HANDLE logout without valid token gracefully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout'
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Authentication required');
    });
  });

  describe('🚨 ERROR HANDLING SECURITY', () => {
    it('should NOT leak sensitive information in error messages', async () => {
      server.authService.login.mockRejectedValue(new Error('Database connection failed: user password hash revealed'));

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'password' }
      });

      const errorMessage = response.json().message;
      
      // Should not contain sensitive database information
      expect(errorMessage).not.toContain('Database connection');
      expect(errorMessage).not.toContain('password hash');
      expect(errorMessage).not.toContain('revealed');
      expect(errorMessage).toBe('Authentication failed');
    });

    it('should USE consistent error responses to prevent user enumeration', async () => {
      // Mock different scenarios that should return same error
      server.authService.login
        .mockResolvedValueOnce(null) // User not found
        .mockRejectedValueOnce(new Error('Invalid password')); // Wrong password

      const response1 = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nonexistent@example.com', password: 'password' }
      });

      const response2 = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'existing@example.com', password: 'wrongpassword' }
      });

      // Both should return identical error messages and timing
      expect(response1.statusCode).toBe(response2.statusCode);
      expect(response1.json().message).toBe(response2.json().message);
      expect(response1.json().message).toBe('Invalid credentials');
    });

    it('should PREVENT stack trace leakage in production', async () => {
      process.env.NODE_ENV = 'production';
      
      server.authService.login.mockRejectedValue(new Error('Internal error with sensitive data'));

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'password' }
      });

      const responseBody = response.json();
      
      // Should not contain stack trace in production
      expect(responseBody.stack).toBeUndefined();
      expect(responseBody.message).not.toContain('sensitive data');
      expect(responseBody.error).toBe('Internal Server Error');
    });
  });

  describe('🛡️ CSRF PROTECTION', () => {
    it('should REQUIRE CSRF token for state-changing operations', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'password' },
        headers: {
          'content-type': 'application/json',
          'origin': 'http://evil-site.com'
        }
      });

      // Should require CSRF protection
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toContain('CSRF token required');
    });

    it('should VALIDATE origin header', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'password' },
        headers: {
          'origin': 'http://malicious-site.com',
          'referer': 'http://malicious-site.com'
        }
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toContain('Invalid origin');
    });
  });
});