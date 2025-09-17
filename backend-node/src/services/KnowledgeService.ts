import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { FastifyRequest } from 'fastify';

const prisma = new PrismaClient();

export interface KnowledgeServiceConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  confidenceThreshold: number;
}

export const defaultKnowledgeConfig: KnowledgeServiceConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFileTypes: ['.pdf', '.docx', '.txt', '.md', '.html'],
  confidenceThreshold: 0.7,
};

// Base schemas for request/response validation
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const securityClassificationSchema = z.enum([
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET'
]);

export const approvalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'UNDER_REVIEW'
]);

export const processingStatusSchema = z.enum([
  'UPLOADED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
  'QUARANTINED'
]);

export const platformSchema = z.enum([
  'EMAIL',
  'TEAMS',
  'SLACK',
  'ZOOM',
  'PHONE',
  'OTHER'
]);

/**
 * Knowledge Management Service
 * Provides business logic for all Knowledge Management operations
 * Following existing service patterns from UserRegistrationService
 */
export class KnowledgeService {
  private config: KnowledgeServiceConfig;

  constructor(config: KnowledgeServiceConfig = defaultKnowledgeConfig) {
    this.config = config;
  }

  /**
   * Validate user permissions for knowledge operations
   * Based on security classification and user roles
   */
  validateUserAccess(
    userRoles: string[],
    requiredClassification: string,
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  ): boolean {
    // Implementation will be added based on existing auth patterns
    // For now, allow all operations for authenticated users
    return userRoles.length > 0;
  }

  /**
   * Apply security classification filtering to results
   * Filters out content above user's security clearance
   */
  applySecurityFilter<T extends { securityClassification?: string }>(
    items: T[],
    userClearanceLevel: string
  ): T[] {
    const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    const userLevelIndex = clearanceLevels.indexOf(userClearanceLevel);

    if (userLevelIndex === -1) {
      return items.filter(item => item.securityClassification === 'UNCLASSIFIED');
    }

    const allowedLevels = clearanceLevels.slice(0, userLevelIndex + 1);
    return items.filter(item =>
      !item.securityClassification || allowedLevels.includes(item.securityClassification)
    );
  }

  /**
   * Generate audit log entry for knowledge operations
   * Following existing audit log patterns
   */
  async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValues: oldValues || undefined,
          newValues: newValues || undefined,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failures shouldn't break operations
    }
  }

  /**
   * Validate file type and size for document uploads
   */
  validateFileUpload(filename: string, fileSize: number): { valid: boolean; error?: string } {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    if (!this.config.allowedFileTypes.includes(extension)) {
      return {
        valid: false,
        error: `File type ${extension} not allowed. Allowed types: ${this.config.allowedFileTypes.join(', ')}`
      };
    }

    if (fileSize > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size ${fileSize} exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      };
    }

    return { valid: true };
  }

  /**
   * Extract user context from authenticated request
   * Following existing auth middleware patterns
   */
  extractUserContext(request: FastifyRequest): {
    userId: string;
    roles: string[];
    clearanceLevel: string;
  } {
    // This will be implemented based on existing auth middleware
    // For now, return mock data
    const user = (request as any).user;
    return {
      userId: user?.id || 'anonymous',
      roles: user?.roles || [],
      clearanceLevel: user?.clearanceLevel || 'UNCLASSIFIED',
    };
  }

  /**
   * Handle service errors with consistent format
   * Following existing error handling patterns
   */
  handleError(error: any, operation: string): never {
    console.error(`KnowledgeService.${operation} error:`, error);

    if (error.code === 'P2002') {
      throw new Error('Duplicate entry: A record with this identifier already exists');
    }

    if (error.code === 'P2025') {
      throw new Error('Record not found');
    }

    if (error.name === 'ZodError') {
      throw new Error(`Validation error: ${error.message}`);
    }

    throw new Error(`${operation} failed: ${error.message || 'Unknown error'}`);
  }

  /**
   * Build dynamic filter conditions for search queries
   */
  buildFilterConditions(filters: Record<string, any>) {
    const conditions: any = {};

    // Only add non-empty filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        conditions[key] = value;
      }
    });

    return conditions;
  }

  /**
   * Calculate confidence score for fact extraction
   * This is a placeholder for ML/AI integration
   */
  calculateConfidenceScore(extractionMetadata: any): number {
    // Placeholder implementation
    // In real implementation, this would use ML models
    return Math.min(Math.max(extractionMetadata?.confidence || 0.5, 0), 1);
  }

  /**
   * Generate MinIO storage path for documents
   * Following existing file storage patterns
   */
  generateStoragePath(userId: string, filename: string, classification: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `knowledge/${classification.toLowerCase()}/${timestamp}/${userId}/${sanitizedFilename}`;
  }
}

export default KnowledgeService;