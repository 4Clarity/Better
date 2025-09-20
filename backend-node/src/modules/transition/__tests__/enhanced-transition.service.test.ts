import {
  createEnhancedTransitionSchema,
  updateEnhancedTransitionSchema,
  getEnhancedTransitionsQuerySchema
} from '../enhanced-transition.service';

// Mock Prisma Client at the module level
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    transition: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
    },
  })),
}));

// Import after mocking
import {
  createEnhancedTransition,
  getEnhancedTransitions,
  getMajorTransitions,
  getPersonnelTransitions,
  getOperationalChanges,
  getTransitionCounts,
} from '../enhanced-transition.service';

describe('Enhanced Transition Service - Transition Level Tests', () => {
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

    it('should validate transition level in query schema', () => {
      const validQuery = {
        transitionLevel: 'PERSONNEL' as const,
        page: 1,
        limit: 10,
      };

      const result = getEnhancedTransitionsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('PERSONNEL');
      }
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

  describe('getEnhancedTransitions', () => {
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
  });

  describe('Level-specific query functions', () => {
    beforeEach(() => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
    });

    it('should filter for MAJOR transitions in getMajorTransitions', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getMajorTransitions(query);

      expect(mockPrisma.transition.findMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'MAJOR' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter for PERSONNEL transitions in getPersonnelTransitions', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getPersonnelTransitions(query);

      expect(mockPrisma.transition.findMany).toHaveBeenCalledWith({
        where: { transitionLevel: 'PERSONNEL' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter for OPERATIONAL transitions in getOperationalChanges', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

      await getOperationalChanges(query);

      expect(mockPrisma.transition.findMany).toHaveBeenCalledWith({
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
      (mockPrisma.transition.count as jest.Mock)
        .mockResolvedValueOnce(5) // MAJOR
        .mockResolvedValueOnce(3) // PERSONNEL
        .mockResolvedValueOnce(12) // OPERATIONAL
        .mockResolvedValueOnce(20); // Total

      const result = await getTransitionCounts();

      expect(mockPrisma.transition.count).toHaveBeenCalledTimes(4);
      expect(mockPrisma.transition.count).toHaveBeenNthCalledWith(1, { where: { transitionLevel: 'MAJOR' } });
      expect(mockPrisma.transition.count).toHaveBeenNthCalledWith(2, { where: { transitionLevel: 'PERSONNEL' } });
      expect(mockPrisma.transition.count).toHaveBeenNthCalledWith(3, { where: { transitionLevel: 'OPERATIONAL' } });
      expect(mockPrisma.transition.count).toHaveBeenNthCalledWith(4, {});

      expect(result).toEqual({
        major: 5,
        personnel: 3,
        operational: 12,
        total: 20,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty transition level in query', async () => {
      (mockPrisma.transition.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.transition.count as jest.Mock).mockResolvedValue(0);

      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      await getEnhancedTransitions(query);

      expect(mockPrisma.transition.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle multiple filters including transition level', async () => {
      (mockPrisma.transition.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.transition.count as jest.Mock).mockResolvedValue(0);

      const query = {
        transitionLevel: 'MAJOR' as const,
        status: 'ON_TRACK' as const,
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      await getEnhancedTransitions(query);

      expect(mockPrisma.transition.findMany).toHaveBeenCalledWith({
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