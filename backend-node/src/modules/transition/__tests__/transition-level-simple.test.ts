import { createEnhancedTransitionSchema, getEnhancedTransitionsQuerySchema } from '../enhanced-transition.service';

describe('Transition Level Schema Validation', () => {
  describe('Create Schema', () => {
    it('should validate MAJOR transition level', () => {
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

    it('should validate PERSONNEL transition level', () => {
      const validData = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        transitionLevel: 'PERSONNEL' as const,
      };

      const result = createEnhancedTransitionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('PERSONNEL');
      }
    });

    it('should validate OPERATIONAL transition level', () => {
      const validData = {
        contractName: 'Test Contract',
        contractNumber: 'TC-001',
        name: 'Test Transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        transitionLevel: 'OPERATIONAL' as const,
      };

      const result = createEnhancedTransitionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('OPERATIONAL');
      }
    });

    it('should default transition level to OPERATIONAL when not provided', () => {
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

  describe('Query Schema', () => {
    it('should validate MAJOR transition level in query', () => {
      const validQuery = {
        transitionLevel: 'MAJOR' as const,
        page: 1,
        limit: 10,
      };

      const result = getEnhancedTransitionsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('MAJOR');
      }
    });

    it('should validate PERSONNEL transition level in query', () => {
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

    it('should validate OPERATIONAL transition level in query', () => {
      const validQuery = {
        transitionLevel: 'OPERATIONAL' as const,
        page: 1,
        limit: 10,
      };

      const result = getEnhancedTransitionsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('OPERATIONAL');
      }
    });

    it('should allow optional transition level in query', () => {
      const validQuery = {
        page: 1,
        limit: 10,
      };

      const result = getEnhancedTransitionsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBeUndefined();
      }
    });

    it('should reject invalid transition level in query', () => {
      const invalidQuery = {
        transitionLevel: 'INVALID' as any,
        page: 1,
        limit: 10,
      };

      const result = getEnhancedTransitionsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe('End-to-end transition level validation', () => {
    it('should accept all valid transition levels', () => {
      const transitionLevels = ['MAJOR', 'PERSONNEL', 'OPERATIONAL'] as const;

      transitionLevels.forEach(level => {
        const data = {
          contractName: 'Test Contract',
          contractNumber: 'TC-001',
          name: 'Test Transition',
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          transitionLevel: level,
        };

        const result = createEnhancedTransitionSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.transitionLevel).toBe(level);
        }
      });
    });

    it('should work with all required fields and transition level', () => {
      const completeData = {
        contractName: 'Complete Test Contract',
        contractNumber: 'CTC-001',
        name: 'Complete Test Transition',
        description: 'A complete test transition',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        status: 'NOT_STARTED' as const,
        duration: 'THIRTY_DAYS' as const,
        keyPersonnel: 'John Doe, Jane Smith',
        requiresContinuousService: true,
        transitionLevel: 'MAJOR' as const,
      };

      const result = createEnhancedTransitionSchema.safeParse(completeData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitionLevel).toBe('MAJOR');
        expect(result.data.contractName).toBe('Complete Test Contract');
        expect(result.data.name).toBe('Complete Test Transition');
      }
    });
  });
});