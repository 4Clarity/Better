import {
  createEnhancedTransitionSchema,
  getEnhancedTransitionsQuerySchema
} from '../enhanced-transition.service';

// Mock Prisma Client at the module level
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    transition: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

// Get the mocked PrismaClient
const { PrismaClient } = require('@prisma/client');
const mockPrismaInstance = new PrismaClient();

// Override the mock functions to use our test mocks
mockPrismaInstance.transition.create = mockCreate;
mockPrismaInstance.transition.findMany = mockFindMany;
mockPrismaInstance.transition.count = mockCount;

// Import after mocking
import {
  createEnhancedTransition,
  getEnhancedTransitions,
  getMajorTransitions,
  getPersonnelTransitions,
  getOperationalChanges,
  getTransitionCounts,
} from '../enhanced-transition.service';

describe('Transition Level Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should validate transition level in create schema', () => {
      const validData = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        transitionLevel: 'MAJOR' as const,
      };

      const result = createEnhancedTransitionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('MAJOR');
      }
    });

    it('should default transition level to OPERATIONAL', () => {
      const validData = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
      };

      const result = createEnhancedTransitionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('OPERATIONAL');
      }
    });

    it('should reject invalid transition level', () => {
      const invalidData = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        transitionLevel: 'INVALID' as any,
      };

      const result = createEnhancedTransitionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Level-specific query functions', () => {
    beforeEach(() => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
    });

    it('should filter for MAJOR transitions', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getMajorTransitions(query);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'MAJOR' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter for PERSONNEL transitions', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getPersonnelTransitions(query);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'PERSONNEL' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter for OPERATIONAL transitions', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getOperationalChanges(query);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'OPERATIONAL' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('getTransitionCounts', () => {
    it('should return correct counts for each transition level', async () => {
      mockCount
        .mockResolvedValueOnce(5)  // MAJOR
        .mockResolvedValueOnce(3)  // PERSONNEL
        .mockResolvedValueOnce(12) // OPERATIONAL
        .mockResolvedValueOnce(20); // Total

      const result = await getTransitionCounts();

      expect(mockCount).toHaveBeenCalledTimes(4);
      expect(mockCount).toHaveBeenNthCalledWith(1, { where: { transitionLevel: 'MAJOR' } });
      expect(mockCount).toHaveBeenNthCalledWith(2, { where: { transitionLevel: 'PERSONNEL' } });
      expect(mockCount).toHaveBeenNthCalledWith(3, { where: { transitionLevel: 'OPERATIONAL' } });
      expect(mockCount).toHaveBeenNthCalledWith(4, {});

      expect(result).toEqual({
        major: 5,
        personnel: 3,
        operational: 12,
        total: 20,
      });
    });
  });

  describe('createEnhancedTransition', () => {
    it('should create transition with specified transition level', async () => {
      const mockTransition = {
        id: '1',
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        transitionLevel: 'MAJOR',
        status: 'NOT_STARTED',
        duration: 'THIRTY_DAYS',
        requiresContinuousService: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreate.mockResolvedValue(mockTransition);

      const input = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        transitionLevel: 'MAJOR' as const,
        status: 'NOT_STARTED' as const,
        duration: 'THIRTY_DAYS' as const,
        requiresContinuousService: true,
      };

      const result = await createEnhancedTransition(input);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractName: 'Test Contract',
          contractNumber: 'TC-001',
          name: 'Test Transition',
          transitionLevel: 'MAJOR',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-01'),
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockTransition);
    });
  });

  describe('getEnhancedTransitions filtering', () => {
    it('should filter transitions by transition level', async () => {
      const mockTransitions = [
        { id: '1', transitionLevel: 'MAJOR' },
        { id: '2', transitionLevel: 'MAJOR' },
      ];

      mockFindMany.mockResolvedValue(mockTransitions);
      mockCount.mockResolvedValue(2);

      const query = {
        transitionLevel: 'MAJOR' as const,
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      await getEnhancedTransitions(query);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'MAJOR' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });

      expect(mockCount).toHaveBeenCalledWith({
        where: { transitionLevel: 'MAJOR' },
      });
    });

    it('should handle multiple filters including transition level', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const query = {
        transitionLevel: 'MAJOR' as const,
        status: 'ON_TRACK' as const,
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      await getEnhancedTransitions(query);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          transitionLevel: 'MAJOR',
          status: 'ON_TRACK',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });
});