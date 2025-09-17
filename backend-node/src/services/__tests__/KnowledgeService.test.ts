import { KnowledgeService, defaultKnowledgeConfig } from '../KnowledgeService';
import { FastifyRequest } from 'fastify';

describe('KnowledgeService', () => {
  let knowledgeService: KnowledgeService;

  beforeEach(() => {
    knowledgeService = new KnowledgeService();
  });

  describe('validateUserAccess', () => {
    it('should allow access for authenticated users', () => {
      const result = knowledgeService.validateUserAccess(
        ['user'],
        'UNCLASSIFIED',
        'READ'
      );
      expect(result).toBe(true);
    });

    it('should deny access for users without roles', () => {
      const result = knowledgeService.validateUserAccess(
        [],
        'UNCLASSIFIED',
        'READ'
      );
      expect(result).toBe(false);
    });
  });

  describe('applySecurityFilter', () => {
    const testItems = [
      { id: '1', securityClassification: 'UNCLASSIFIED' },
      { id: '2', securityClassification: 'CONFIDENTIAL' },
      { id: '3', securityClassification: 'SECRET' },
      { id: '4', securityClassification: 'TOP_SECRET' },
    ];

    it('should filter items based on user clearance level', () => {
      const result = knowledgeService.applySecurityFilter(testItems, 'CONFIDENTIAL');
      expect(result).toHaveLength(2);
      expect(result.map(item => item.id)).toEqual(['1', '2']);
    });

    it('should show all items for TOP_SECRET clearance', () => {
      const result = knowledgeService.applySecurityFilter(testItems, 'TOP_SECRET');
      expect(result).toHaveLength(4);
    });

    it('should show only UNCLASSIFIED for invalid clearance', () => {
      const result = knowledgeService.applySecurityFilter(testItems, 'INVALID');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should handle items without security classification', () => {
      const itemsWithoutClassification = [
        { id: '1' },
        { id: '2', securityClassification: 'SECRET' },
      ];
      const result = knowledgeService.applySecurityFilter(itemsWithoutClassification, 'CONFIDENTIAL');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('validateFileUpload', () => {
    it('should accept valid file types and sizes', () => {
      const result = knowledgeService.validateFileUpload('document.pdf', 1024 * 1024);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const result = knowledgeService.validateFileUpload('virus.exe', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type .exe not allowed');
    });

    it('should reject files that are too large', () => {
      const largeFileSize = defaultKnowledgeConfig.maxFileSize + 1;
      const result = knowledgeService.validateFileUpload('large.pdf', largeFileSize);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size');
    });

    it('should handle files with uppercase extensions', () => {
      const result = knowledgeService.validateFileUpload('document.PDF', 1024);
      expect(result.valid).toBe(true);
    });
  });

  describe('buildFilterConditions', () => {
    it('should build filter conditions excluding empty values', () => {
      const filters = {
        name: 'test',
        description: '',
        category: null,
        isActive: true,
        count: undefined,
      };

      const result = knowledgeService.buildFilterConditions(filters);
      expect(result).toEqual({
        name: 'test',
        isActive: true,
      });
    });

    it('should return empty object for all empty filters', () => {
      const filters = {
        name: '',
        description: null,
        category: undefined,
      };

      const result = knowledgeService.buildFilterConditions(filters);
      expect(result).toEqual({});
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return confidence score within valid range', () => {
      const metadata = { confidence: 0.8 };
      const result = knowledgeService.calculateConfidenceScore(metadata);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should cap confidence scores above 1', () => {
      const metadata = { confidence: 1.5 };
      const result = knowledgeService.calculateConfidenceScore(metadata);
      expect(result).toBe(1);
    });

    it('should floor confidence scores below 0', () => {
      const metadata = { confidence: -0.5 };
      const result = knowledgeService.calculateConfidenceScore(metadata);
      expect(result).toBe(0);
    });

    it('should use default confidence when not provided', () => {
      const result = knowledgeService.calculateConfidenceScore({});
      expect(result).toBe(0.5);
    });
  });

  describe('generateStoragePath', () => {
    it('should generate valid storage path', () => {
      const result = knowledgeService.generateStoragePath(
        'user123',
        'test document.pdf',
        'CONFIDENTIAL'
      );

      expect(result).toMatch(/^knowledge\/confidential\/\d{4}-\d{2}-\d{2}\/user123\/test_document\.pdf$/);
    });

    it('should sanitize filename', () => {
      const result = knowledgeService.generateStoragePath(
        'user123',
        'test@#$%^&*()document.pdf',
        'UNCLASSIFIED'
      );

      expect(result).toContain('test_________document.pdf');
    });

    it('should handle different classifications', () => {
      const result = knowledgeService.generateStoragePath(
        'user123',
        'document.pdf',
        'TOP_SECRET'
      );

      expect(result).toContain('knowledge/top_secret/');
    });
  });

  describe('extractUserContext', () => {
    it('should extract user context from request', () => {
      const mockRequest = {
        user: {
          id: 'user123',
          roles: ['admin', 'user'],
          clearanceLevel: 'SECRET',
        },
      } as FastifyRequest;

      const result = knowledgeService.extractUserContext(mockRequest);
      expect(result).toEqual({
        userId: 'user123',
        roles: ['admin', 'user'],
        clearanceLevel: 'SECRET',
      });
    });

    it('should handle request without user context', () => {
      const mockRequest = {} as FastifyRequest;

      const result = knowledgeService.extractUserContext(mockRequest);
      expect(result).toEqual({
        userId: 'anonymous',
        roles: [],
        clearanceLevel: 'UNCLASSIFIED',
      });
    });
  });

  describe('handleError', () => {
    it('should handle Prisma duplicate entry error', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' };

      expect(() => knowledgeService.handleError(error, 'create')).toThrow(
        'Duplicate entry: A record with this identifier already exists'
      );
    });

    it('should handle Prisma record not found error', () => {
      const error = { code: 'P2025', message: 'Record not found' };

      expect(() => knowledgeService.handleError(error, 'update')).toThrow(
        'Record not found'
      );
    });

    it('should handle Zod validation error', () => {
      const error = { name: 'ZodError', message: 'Invalid input' };

      expect(() => knowledgeService.handleError(error, 'validate')).toThrow(
        'Validation error: Invalid input'
      );
    });

    it('should handle generic errors', () => {
      const error = { message: 'Something went wrong' };

      expect(() => knowledgeService.handleError(error, 'operation')).toThrow(
        'operation failed: Something went wrong'
      );
    });

    it('should handle errors without message', () => {
      const error = {};

      expect(() => knowledgeService.handleError(error, 'operation')).toThrow(
        'operation failed: Unknown error'
      );
    });
  });
});