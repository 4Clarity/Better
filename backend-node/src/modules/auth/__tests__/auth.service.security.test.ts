/**
 * SECURITY-FOCUSED UNIT TESTS FOR AUTHENTICATION SERVICE
 * 
 * These tests target the critical vulnerabilities identified in the QA review:
 * 1. Hard-coded JWT secrets
 * 2. Weak password validation 
 * 3. Incomplete Keycloak validation
 * 4. Missing token validation
 * 5. Rate limiting gaps
 */

import { AuthService } from '../auth.service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('AuthService - Critical Security Vulnerabilities', () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    authService = new AuthService(mockPrisma);
  });

  describe('🚨 CRITICAL: JWT Secret Security', () => {
    it('should FAIL to initialize with missing JWT_SECRET', () => {
      // Clear the test environment variables
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        new AuthService(mockPrisma);
      }).toThrow('JWT secrets must be configured via environment variables');
    });

    it('should FAIL to initialize with empty JWT_SECRET', () => {
      process.env.JWT_SECRET = '';
      process.env.JWT_REFRESH_SECRET = '';

      expect(() => {
        new AuthService(mockPrisma);
      }).toThrow('JWT secrets must be configured via environment variables');
    });

    it('should REJECT hard-coded default secrets', () => {
      process.env.JWT_SECRET = 'your-jwt-secret-key-here-change-in-production';
      process.env.JWT_REFRESH_SECRET = 'your-refresh-token-secret-key-here-change-in-production';

      expect(() => {
        new AuthService(mockPrisma);
      }).toThrow('Default JWT secrets detected - configure secure secrets');
    });

    it('should ACCEPT properly configured secrets', () => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';

      expect(() => {
        new AuthService(mockPrisma);
      }).not.toThrow();
    });
  });

  describe('🚨 CRITICAL: Password Security', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
      authService = new AuthService(mockPrisma);
    });

    it('should REJECT plain text passwords from the vulnerable list', async () => {
      const vulnerablePasswords = ['demo', 'password', 'admin', '123456', 'password123'];

      for (const password of vulnerablePasswords) {
        await expect(authService.hashPassword(password))
          .rejects.toThrow('Weak password detected - please choose a stronger password');
      }
    });

    it('should REQUIRE password hashing with bcrypt', async () => {
      const password = 'StrongP@ssw0rd2024!';
      const hashedPassword = await authService.hashPassword(password);

      // Verify it's bcrypt hashed
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
      expect(hashedPassword).not.toBe(password);
      
      // Verify we can validate it
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should ENFORCE minimum password complexity', async () => {
      const weakPasswords = [
        'short',           // Too short
        'alllowercase',    // No uppercase
        'ALLUPPERCASE',    // No lowercase  
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        'simple123',       // Too simple
      ];

      for (const password of weakPasswords) {
        await expect(authService.hashPassword(password))
          .rejects.toThrow('Password does not meet complexity requirements');
      }
    });

    it('should ACCEPT strong passwords', async () => {
      const strongPasswords = [
        'StrongP@ssw0rd2024!',
        'MySecure#Pass123',
        'Complex$Password456',
      ];

      for (const password of strongPasswords) {
        const hashedPassword = await authService.hashPassword(password);
        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(password);
      }
    });
  });

  describe('🚨 HIGH RISK: Keycloak Token Validation', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
    });

    it('should FAIL when KEYCLOAK_JWT_PUBLIC_KEY is missing', async () => {
      delete process.env.KEYCLOAK_JWT_PUBLIC_KEY;
      authService = new AuthService(mockPrisma);

      const mockToken = jwt.sign({ sub: 'test-user' }, 'fake-secret');

      await expect(authService.validateKeycloakToken(mockToken, 'test-ip', 'test-agent'))
        .rejects.toThrow('Keycloak JWT public key not configured');
    });

    it('should FAIL when KEYCLOAK_JWT_PUBLIC_KEY is empty', async () => {
      process.env.KEYCLOAK_JWT_PUBLIC_KEY = '';
      authService = new AuthService(mockPrisma);

      const mockToken = jwt.sign({ sub: 'test-user' }, 'fake-secret');

      await expect(authService.validateKeycloakToken(mockToken, 'test-ip', 'test-agent'))
        .rejects.toThrow('Keycloak JWT public key not configured');
    });

    it('should PROPERLY validate Keycloak token structure', async () => {
      process.env.KEYCLOAK_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4qiXIh0HN0eKnVc8NtOa
test-key-for-testing-purposes-only-do-not-use-in-production
-----END PUBLIC KEY-----`;
      
      authService = new AuthService(mockPrisma);

      // Test with invalid token
      await expect(authService.validateKeycloakToken('invalid.token.format', 'test-ip', 'test-agent'))
        .rejects.toThrow('Invalid token format');

      // Test with malformed JWT
      await expect(authService.validateKeycloakToken('malformed-token', 'test-ip', 'test-agent'))
        .rejects.toThrow('Invalid token format');
    });
  });

  describe('🚨 CRITICAL: Token Validation Completeness', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
      authService = new AuthService(mockPrisma);
    });

    it('should VALIDATE access token expiry', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { 
          userId: 'test-user', 
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        process.env.JWT_SECRET as string
      );

      const result = await authService.validateAccessToken(expiredToken);
      expect(result).toBeNull();
    });

    it('should VALIDATE token signature integrity', async () => {
      // Create token with wrong signature
      const tamperedToken = jwt.sign(
        { userId: 'test-user' },
        'wrong-secret'
      );

      const result = await authService.validateAccessToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should VALIDATE token payload structure', async () => {
      // Create token with missing required fields
      const invalidPayloadToken = jwt.sign(
        { randomField: 'value' }, // Missing userId
        process.env.JWT_SECRET as string
      );

      const result = await authService.validateAccessToken(invalidPayloadToken);
      expect(result).toBeNull();
    });

    it('should VALIDATE refresh token rotation', async () => {
      const refreshToken = jwt.sign(
        { userId: 'test-user', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET as string
      );

      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: '1', refreshToken: 'old-token', userId: 'test-user' }
      ]);

      // Should invalidate old refresh tokens when issuing new ones
      const result = await authService.refreshAccessToken(refreshToken, 'test-ip', 'test-agent');
      
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'test-user', refreshToken: { not: refreshToken } }
      });
    });
  });

  describe('🔒 SESSION SECURITY', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
      authService = new AuthService(mockPrisma);
    });

    it('should LIMIT concurrent sessions per user', async () => {
      const userId = 'test-user';
      
      // Mock user with 5 existing sessions (at limit)
      mockPrisma.userSession.findMany.mockResolvedValue(
        Array(5).fill(null).map((_, i) => ({ id: `session-${i}`, userId }))
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        roles: []
      });

      // Should remove oldest session when creating new one
      await authService.createUserSession(userId, 'new-refresh-token', 'test-agent', 'test-ip');
      
      expect(mockPrisma.userSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-0' }
      });
    });

    it('should TRACK session security metadata', async () => {
      const userId = 'test-user';
      const userAgent = 'Mozilla/5.0 (Test Browser)';
      const ipAddress = '192.168.1.100';

      mockPrisma.userSession.findMany.mockResolvedValue([]);
      
      await authService.createUserSession(userId, 'refresh-token', userAgent, ipAddress);

      expect(mockPrisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          userAgent,
          ipAddress,
          createdAt: expect.any(Date),
          lastUsedAt: expect.any(Date),
        })
      });
    });

    it('should DETECT suspicious session activity', async () => {
      const userId = 'test-user';
      
      // Mock sessions from different IPs
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: '1', userId, ipAddress: '192.168.1.100', userAgent: 'Chrome' },
        { id: '2', userId, ipAddress: '10.0.0.50', userAgent: 'Firefox' },
        { id: '3', userId, ipAddress: '172.16.0.10', userAgent: 'Safari' },
      ]);

      const suspiciousActivity = await authService.detectSuspiciousActivity(userId);
      
      expect(suspiciousActivity).toEqual({
        multipleIPs: true,
        multipleBrowsers: true,
        riskScore: expect.any(Number),
      });
    });
  });

  describe('🛡️ RATE LIMITING & ATTACK PREVENTION', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
      authService = new AuthService(mockPrisma);
    });

    it('should TRACK failed login attempts', async () => {
      const email = 'test@example.com';
      const ipAddress = '192.168.1.100';

      // Simulate failed login
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(email, 'wrong-password', ipAddress, 'test-agent'))
        .rejects.toThrow('Invalid credentials');

      // Should increment failure count
      expect(authService.getFailedAttempts).toBeDefined();
      const failures = await authService.getFailedAttempts(email, ipAddress);
      expect(failures).toBeGreaterThan(0);
    });

    it('should LOCK account after maximum failed attempts', async () => {
      const email = 'test@example.com';
      const ipAddress = '192.168.1.100';

      // Mock user exists but simulate 10 failed attempts
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email,
        hashedPassword: await bcrypt.hash('correct-password', 10),
      });

      // Simulate max failed attempts reached
      jest.spyOn(authService, 'getFailedAttempts').mockResolvedValue(10);

      await expect(authService.login(email, 'wrong-password', ipAddress, 'test-agent'))
        .rejects.toThrow('Account temporarily locked due to too many failed attempts');
    });

    it('should IMPLEMENT exponential backoff', async () => {
      const email = 'test@example.com';
      const ipAddress = '192.168.1.100';

      // Mock progressive failed attempts
      for (let attempts = 1; attempts <= 5; attempts++) {
        jest.spyOn(authService, 'getFailedAttempts').mockResolvedValue(attempts);
        
        const backoffTime = await authService.calculateBackoffTime(attempts);
        
        // Should increase exponentially: 1s, 2s, 4s, 8s, 16s
        expect(backoffTime).toBe(Math.pow(2, attempts - 1) * 1000);
      }
    });
  });

  describe('🔍 INPUT VALIDATION & SANITIZATION', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
      authService = new AuthService(mockPrisma);
    });

    it('should SANITIZE email input', async () => {
      const maliciousEmails = [
        'test@example.com<script>alert("xss")</script>',
        'test@example.com\'; DROP TABLE users; --',
        'test@example.com\nBcc: attacker@evil.com',
      ];

      for (const email of maliciousEmails) {
        const sanitized = authService.sanitizeInput(email);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('\n');
      }
    });

    it('should VALIDATE email format strictly', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example..com',
        'test@example.c',
      ];

      for (const email of invalidEmails) {
        expect(authService.isValidEmail(email)).toBe(false);
      }

      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
      ];

      for (const email of validEmails) {
        expect(authService.isValidEmail(email)).toBe(true);
      }
    });

    it('should PREVENT SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const sanitized = authService.sanitizeInput(attempt);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('DROP');
      }
    });
  });
});

/**
 * ADDITIONAL SECURITY TEST UTILITIES
 */
describe('AuthService - Security Utilities', () => {
  let authService: AuthService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'secure-test-secret-key-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'secure-test-refresh-key-32-characters';
    const mockPrisma = {
      user: { findUnique: jest.fn() },
      userSession: { create: jest.fn(), findMany: jest.fn() },
    };
    authService = new AuthService(mockPrisma);
  });

  it('should generate cryptographically secure tokens', () => {
    const token1 = authService.generateSecureToken();
    const token2 = authService.generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token1).toHaveLength(32); // 256 bits in hex
    expect(token1).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should implement secure token comparison', () => {
    const token = 'secure-token-123';
    
    // Should use constant-time comparison to prevent timing attacks
    expect(authService.compareTokensSecurely(token, token)).toBe(true);
    expect(authService.compareTokensSecurely(token, 'wrong-token')).toBe(false);
  });

  it('should validate environment configuration on startup', () => {
    const requiredEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET', 
      'DATABASE_URL'
    ];

    const validation = authService.validateEnvironmentConfig();
    
    expect(validation.isValid).toBe(true);
    expect(validation.missingVars).toHaveLength(0);
  });
});