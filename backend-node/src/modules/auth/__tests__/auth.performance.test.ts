/**
 * PERFORMANCE AND LOAD TESTING FOR AUTHENTICATION SYSTEM
 * 
 * Tests authentication system under various load conditions
 * Identifies performance bottlenecks and scaling limitations
 */

import { performance } from 'perf_hooks';
import Fastify from 'fastify';
import { AuthService } from '../auth.service';

describe('Authentication System - Performance Testing', () => {
  let server: any;
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    server = Fastify({ logger: false });
    authService = new AuthService(mockPrisma);
    server.decorate('authService', authService);
    
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('⚡ AUTHENTICATION RESPONSE TIME', () => {
    it('should AUTHENTICATE within 200ms under normal load', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: '$2b$10$example.hashed.password',
        roles: []
      });

      const iterations = 10;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { 
            email: 'test@example.com', 
            password: 'password' 
          }
        });
        
        const endTime = performance.now();
        timings.push(endTime - startTime);
      }

      const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTime = Math.max(...timings);
      
      expect(averageTime).toBeLessThan(200); // Average under 200ms
      expect(maxTime).toBeLessThan(500);     // No request over 500ms
      
      console.log(`Average auth time: ${averageTime.toFixed(2)}ms`);
      console.log(`Max auth time: ${maxTime.toFixed(2)}ms`);
    });

    it('should MAINTAIN performance with concurrent users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: '$2b$10$example.hashed.password',
        roles: []
      });

      const concurrentUsers = 50;
      const requests = Array(concurrentUsers).fill(null).map((_, index) =>
        server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { 
            email: `user${index}@example.com`, 
            password: 'password' 
          }
        })
      );

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const throughput = concurrentUsers / (totalTime / 1000); // requests per second

      expect(responses.every(r => r.statusCode < 500)).toBe(true); // No server errors
      expect(throughput).toBeGreaterThan(10); // At least 10 req/sec
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds

      console.log(`Concurrent auth throughput: ${throughput.toFixed(2)} req/sec`);
      console.log(`Total time for ${concurrentUsers} concurrent auths: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('🔄 TOKEN VALIDATION PERFORMANCE', () => {
    it('should VALIDATE tokens within 50ms', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        roles: []
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Create valid token for testing
      const token = await authService.generateAccessToken(mockUser);
      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await authService.validateAccessToken(token);
        
        const endTime = performance.now();
        timings.push(endTime - startTime);
      }

      const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      
      expect(averageTime).toBeLessThan(50); // Should be very fast
      
      console.log(`Average token validation time: ${averageTime.toFixed(2)}ms`);
    });

    it('should HANDLE high-frequency token validation', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        roles: []
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const token = await authService.generateAccessToken(mockUser);

      const requestsPerSecond = 1000;
      const duration = 2; // seconds
      const totalRequests = requestsPerSecond * duration;
      
      const requests = Array(totalRequests).fill(null).map(() =>
        authService.validateAccessToken(token)
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const actualDuration = (endTime - startTime) / 1000;
      const actualThroughput = totalRequests / actualDuration;

      expect(results.every(r => r !== null)).toBe(true); // All validations succeed
      expect(actualThroughput).toBeGreaterThan(500); // At least 500 validations/sec

      console.log(`Token validation throughput: ${actualThroughput.toFixed(0)} validations/sec`);
    });
  });

  describe('💾 DATABASE PERFORMANCE', () => {
    it('should OPTIMIZE user lookup queries', async () => {
      const queryTimes: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        mockPrisma.user.findUnique.mockResolvedValueOnce({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          roles: []
        });
        
        await authService.getUserById(`user-${i}`);
        
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      
      expect(averageQueryTime).toBeLessThan(10); // Database queries should be very fast with mocking
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(50);

      console.log(`Average user lookup time: ${averageQueryTime.toFixed(2)}ms`);
    });

    it('should HANDLE session cleanup efficiently', async () => {
      // Mock large number of expired sessions
      const expiredSessions = Array(1000).fill(null).map((_, index) => ({
        id: `session-${index}`,
        userId: `user-${index % 100}`,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        lastUsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7 days old
      }));

      mockPrisma.userSession.findMany.mockResolvedValue(expiredSessions);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1000 });

      const startTime = performance.now();
      await authService.cleanupExpiredSessions();
      const endTime = performance.now();

      const cleanupTime = endTime - startTime;
      
      expect(cleanupTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalled();

      console.log(`Session cleanup time for 1000 sessions: ${cleanupTime.toFixed(2)}ms`);
    });
  });

  describe('🔒 PASSWORD HASHING PERFORMANCE', () => {
    it('should BALANCE security and performance in password hashing', async () => {
      const passwords = Array(10).fill(null).map((_, i) => `password${i}`);
      const hashingTimes: number[] = [];

      for (const password of passwords) {
        const startTime = performance.now();
        await authService.hashPassword(password);
        const endTime = performance.now();
        
        hashingTimes.push(endTime - startTime);
      }

      const averageHashTime = hashingTimes.reduce((sum, time) => sum + time, 0) / hashingTimes.length;
      
      // Password hashing should be intentionally slow for security (100-500ms is acceptable)
      expect(averageHashTime).toBeGreaterThan(50);  // Minimum security threshold
      expect(averageHashTime).toBeLessThan(1000);   // Not too slow for UX

      console.log(`Average password hashing time: ${averageHashTime.toFixed(2)}ms`);
    });

    it('should RESIST timing attacks during password verification', async () => {
      const correctPassword = 'CorrectPassword123!';
      const hashedPassword = await authService.hashPassword(correctPassword);
      
      const testPasswords = [
        correctPassword,           // Correct password
        'WrongPassword123!',       // Wrong password, same length
        'Wrong',                   // Wrong password, different length
        'CompletelyDifferentPasswordThatIsLonger123!', // Very different
        '',                        // Empty password
      ];

      const verificationTimes: number[] = [];

      for (const password of testPasswords) {
        const startTime = performance.now();
        
        try {
          await authService.verifyPassword(password, hashedPassword);
        } catch (error) {
          // Expected for wrong passwords
        }
        
        const endTime = performance.now();
        verificationTimes.push(endTime - startTime);
      }

      // All verification attempts should take roughly the same time
      const avgTime = verificationTimes.reduce((sum, time) => sum + time, 0) / verificationTimes.length;
      const maxVariance = avgTime * 0.2; // 20% variance allowance

      for (const time of verificationTimes) {
        expect(Math.abs(time - avgTime)).toBeLessThan(maxVariance);
      }

      console.log('Password verification times:', verificationTimes.map(t => `${t.toFixed(2)}ms`).join(', '));
    });
  });

  describe('📊 MEMORY USAGE TESTING', () => {
    it('should NOT leak memory during high-volume operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate high-volume token generation and validation
      const operations = 1000;
      const tokens: string[] = [];

      for (let i = 0; i < operations; i++) {
        const mockUser = { id: `user-${i}`, email: `user${i}@example.com`, roles: [] };
        const token = await authService.generateAccessToken(mockUser);
        tokens.push(token);
        
        // Validate some tokens to create mixed workload
        if (i % 10 === 0) {
          await authService.validateAccessToken(tokens[Math.floor(Math.random() * tokens.length)]);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable for the number of operations
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth

      console.log(`Memory growth after ${operations} operations: ${memoryGrowthMB.toFixed(2)}MB`);
    });

    it('should EFFICIENTLY cache user data', async () => {
      const userId = 'frequently-accessed-user';
      const mockUser = {
        id: userId,
        email: 'popular@example.com',
        roles: ['user']
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Access same user multiple times
      const lookups = 100;
      const startTime = performance.now();

      for (let i = 0; i < lookups; i++) {
        await authService.getUserById(userId);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / lookups;

      // With caching, should be faster than individual DB queries
      expect(averageTime).toBeLessThan(5); // Very fast with caching
      
      console.log(`Average cached user lookup time: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('📈 SCALABILITY TESTING', () => {
    it('should SCALE to handle production load', async () => {
      // Simulate production-like load patterns
      const scenarios = [
        { name: 'Login Peak', concurrent: 100, duration: 5000 },
        { name: 'Token Validation', concurrent: 500, duration: 3000 },
        { name: 'Mixed Load', concurrent: 200, duration: 10000 },
      ];

      const results: Array<{ name: string; throughput: number; errorRate: number }> = [];

      for (const scenario of scenarios) {
        console.log(`Testing ${scenario.name} scenario...`);
        
        const requestsPerUser = Math.ceil(scenario.duration / 100); // requests every 100ms
        const totalRequests = scenario.concurrent * requestsPerUser;
        
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'test-user',
          email: 'test@example.com',
          hashedPassword: '$2b$10$example',
          roles: []
        });

        const requests = Array(totalRequests).fill(null).map((_, index) => {
          const delay = (index % requestsPerUser) * 100; // Spread requests over time
          
          return new Promise(resolve => 
            setTimeout(() => {
              server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { 
                  email: `user${index % scenario.concurrent}@example.com`,
                  password: 'password'
                }
              }).then(resolve);
            }, delay)
          );
        });

        const startTime = performance.now();
        const responses = await Promise.all(requests);
        const endTime = performance.now();

        const duration = (endTime - startTime) / 1000;
        const throughput = totalRequests / duration;
        const errors = responses.filter((r: any) => r.statusCode >= 400).length;
        const errorRate = (errors / totalRequests) * 100;

        results.push({
          name: scenario.name,
          throughput,
          errorRate
        });

        expect(errorRate).toBeLessThan(5); // Less than 5% error rate
        expect(throughput).toBeGreaterThan(50); // At least 50 req/sec

        console.log(`${scenario.name}: ${throughput.toFixed(0)} req/sec, ${errorRate.toFixed(2)}% errors`);
      }

      // Overall system should handle all scenarios acceptably
      const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
      const maxErrorRate = Math.max(...results.map(r => r.errorRate));

      expect(avgThroughput).toBeGreaterThan(75);
      expect(maxErrorRate).toBeLessThan(3);
    }, 60000); // 60 second timeout for scalability tests
  });

  describe('🔧 PERFORMANCE MONITORING', () => {
    it('should PROVIDE performance metrics', async () => {
      const metrics = await authService.getPerformanceMetrics();

      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('activeConnections');

      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(0.05); // Less than 5% error rate
    });

    it('should TRACK slow queries for optimization', async () => {
      const slowQueries = await authService.getSlowQueries({ threshold: 100 });

      expect(Array.isArray(slowQueries)).toBe(true);
      
      // If any slow queries exist, they should be properly formatted
      slowQueries.forEach(query => {
        expect(query).toHaveProperty('query');
        expect(query).toHaveProperty('duration');
        expect(query).toHaveProperty('timestamp');
        expect(query.duration).toBeGreaterThan(100);
      });
    });
  });
});