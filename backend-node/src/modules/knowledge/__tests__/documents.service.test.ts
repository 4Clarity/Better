import { DocumentsService } from '../documents.service';

describe('DocumentsService', () => {
  let documentsService: DocumentsService;

  beforeEach(() => {
    documentsService = new DocumentsService();
  });

  describe('File validation', () => {
    it('should validate file types correctly', () => {
      // Test valid file types
      expect(documentsService.validateFileUpload('document.pdf', 1024)).toEqual({ valid: true });
      expect(documentsService.validateFileUpload('document.docx', 1024)).toEqual({ valid: true });
      expect(documentsService.validateFileUpload('document.txt', 1024)).toEqual({ valid: true });
      expect(documentsService.validateFileUpload('document.md', 1024)).toEqual({ valid: true });

      // Test invalid file types
      const invalidResult = documentsService.validateFileUpload('virus.exe', 1024);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('not allowed');
    });

    it('should validate file sizes correctly', () => {
      // Test valid file size
      expect(documentsService.validateFileUpload('document.pdf', 1024)).toEqual({ valid: true });

      // Test file too large
      const largeFileResult = documentsService.validateFileUpload('large.pdf', 200 * 1024 * 1024);
      expect(largeFileResult.valid).toBe(false);
      expect(largeFileResult.error).toContain('exceeds maximum');
    });
  });

  describe('Security filtering', () => {
    const testDocuments = [
      { id: '1', title: 'Doc 1', securityClassification: 'UNCLASSIFIED' },
      { id: '2', title: 'Doc 2', securityClassification: 'CONFIDENTIAL' },
      { id: '3', title: 'Doc 3', securityClassification: 'SECRET' },
      { id: '4', title: 'Doc 4', securityClassification: 'TOP_SECRET' },
    ];

    it('should filter documents based on user clearance level', () => {
      const result = documentsService.applySecurityFilter(testDocuments, 'CONFIDENTIAL');
      expect(result).toHaveLength(2);
      expect(result.map(doc => doc.id)).toEqual(['1', '2']);
    });

    it('should show all documents for TOP_SECRET clearance', () => {
      const result = documentsService.applySecurityFilter(testDocuments, 'TOP_SECRET');
      expect(result).toHaveLength(4);
    });

    it('should show only UNCLASSIFIED for invalid clearance', () => {
      const result = documentsService.applySecurityFilter(testDocuments, 'INVALID');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('User access validation', () => {
    it('should allow access for authenticated users', () => {
      const result = documentsService.validateUserAccess(['user'], 'UNCLASSIFIED', 'READ');
      expect(result).toBe(true);
    });

    it('should deny access for users without roles', () => {
      const result = documentsService.validateUserAccess([], 'UNCLASSIFIED', 'READ');
      expect(result).toBe(false);
    });
  });

  describe('Confidence score calculation', () => {
    it('should calculate confidence scores within valid range', () => {
      const result = documentsService.calculateConfidenceScore({ confidence: 0.8 });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle missing confidence metadata', () => {
      const result = documentsService.calculateConfidenceScore({});
      expect(result).toBe(0.5);
    });
  });

  describe('Storage path generation', () => {
    it('should generate valid storage paths', () => {
      const result = documentsService.generateStoragePath('user123', 'test.pdf', 'CONFIDENTIAL');
      expect(result).toMatch(/^knowledge\/confidential\/\d{4}-\d{2}-\d{2}\/user123\/test\.pdf$/);
    });

    it('should sanitize filenames', () => {
      const result = documentsService.generateStoragePath('user123', 'test@#$%document.pdf', 'UNCLASSIFIED');
      expect(result).toContain('test____document.pdf');
    });
  });

  describe('Filter conditions building', () => {
    it('should build filter conditions excluding empty values', () => {
      const filters = {
        title: 'test',
        description: '',
        isActive: true,
        category: null,
        count: undefined,
      };

      const result = documentsService.buildFilterConditions(filters);
      expect(result).toEqual({
        title: 'test',
        isActive: true,
      });
    });
  });
});