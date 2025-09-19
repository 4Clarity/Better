import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from '../../services/KnowledgeService';
import { getPrismaClient } from '../../utils/database';
import {
  createDocumentSchema,
  updateDocumentSchema,
  getDocumentsQuerySchema,
} from './documents.route';

export interface DocumentsQueryParams {
  search?: string;
  securityClassification?: string;
  processingStatus?: string;
  uploadedBy?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export class DocumentsService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Map API security classification to Prisma enum format
   * API uses: UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
   * Prisma uses: Unclassified, Confidential, Secret, Top_Secret
   */
  private mapSecurityClassification(apiClassification: string): string {
    const mapping: Record<string, string> = {
      'UNCLASSIFIED': 'Unclassified',
      'CONFIDENTIAL': 'Confidential',
      'SECRET': 'Secret',
      'TOP_SECRET': 'Top_Secret'
    };
    return mapping[apiClassification] || 'Unclassified';
  }

  /**
   * Map API processing status to Prisma enum format
   */
  private mapProcessingStatus(apiStatus: string): string {
    const mapping: Record<string, string> = {
      'UPLOADED': 'Uploaded',
      'PROCESSING': 'Processing',
      'PROCESSED': 'Completed',
      'FAILED': 'Failed',
      'QUARANTINED': 'Queued'
    };
    return mapping[apiStatus] || 'Uploaded';
  }

  /**
   * Create a new document record
   */
  async createDocument(
    documentData: z.infer<typeof createDocumentSchema>,
    userId: string
  ) {
    try {
      // Validate file upload
      const fileValidation = this.validateFileUpload(documentData.originalFilename, documentData.fileSize);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.error);
      }

      // Calculate confidence score if extraction metadata provided
      const confidenceScore = documentData.extractionMetadata
        ? this.calculateConfidenceScore(documentData.extractionMetadata)
        : undefined;

      const document = await this.prisma.km_documents.create({
        data: {
          name: documentData.title,
          description: documentData.description || null,
          originalFileName: documentData.originalFilename,
          mimeType: documentData.mimeType,
          fileSize: documentData.fileSize,
          filePath: documentData.storageUrl,
          checksum: documentData.checksum || 'pending',
          version: 1,
          parentId: documentData.parentId || null,
          securityClassification: this.mapSecurityClassification(documentData.securityClassification) as any,
          processingStatus: 'Uploaded',
          extractedMetadata: documentData.extractionMetadata || undefined,
          documentType: 'PDF', // Default for now, would be determined by mimeType
          uploadedBy: userId,
          isActive: true,
        },
        include: {
          users_uploaded: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return document;
    } catch (error: any) {
      this.handleError(error, 'createDocument');
    }
  }

  /**
   * Get documents with filtering, pagination, and security filtering
   */
  async getDocuments(
    queryParams: z.infer<typeof getDocumentsQuerySchema>,
    userContext: UserContext
  ) {
    try {
      // Build filter conditions
      const whereConditions: any = {
        isActive: queryParams.isActive !== undefined ? queryParams.isActive : true,
      };

      // Add search filter
      if (queryParams.search) {
        whereConditions.OR = [
          { name: { contains: queryParams.search, mode: 'insensitive' } },
          { description: { contains: queryParams.search, mode: 'insensitive' } },
          { originalFileName: { contains: queryParams.search, mode: 'insensitive' } },
        ];
      }

      // Add other filters
      if (queryParams.securityClassification) {
        whereConditions.securityClassification = queryParams.securityClassification;
      }

      if (queryParams.processingStatus) {
        whereConditions.processingStatus = queryParams.processingStatus;
      }

      if (queryParams.uploadedBy) {
        whereConditions.uploadedBy = queryParams.uploadedBy;
      }

      // Get total count
      const total = await this.prisma.km_documents.count({
        where: whereConditions,
      });

      // Get documents
      const documents = await this.prisma.km_documents.findMany({
        where: whereConditions,
        include: {
          users_uploaded: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          parent_document: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        take: queryParams.limit,
        skip: queryParams.offset,
      });

      // Apply security filtering
      const filteredDocuments = this.applySecurityFilter(documents, userContext.clearanceLevel);

      return {
        documents: filteredDocuments,
        pagination: {
          total: filteredDocuments.length, // Note: This is filtered total, not DB total
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: queryParams.offset + queryParams.limit < total,
        },
      };
    } catch (error: any) {
      this.handleError(error, 'getDocuments');
    }
  }

  /**
   * Get document by ID with security filtering
   */
  async getDocumentById(documentId: string, userContext: UserContext) {
    try {
      const document = await this.prisma.km_documents.findUnique({
        where: {
          id: documentId,
          isActive: true,
        },
        include: {
          users_uploaded: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          parent_document: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
          child_documents: {
            select: {
              id: true,
              name: true,
              version: true,
              createdAt: true,
            },
            where: {
              isActive: true,
            },
          },
          km_facts: {
            select: {
              id: true,
              factType: true,
              content: true,
              confidence: true,
              approvalStatus: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      if (!document) {
        return null;
      }

      // Apply security filtering
      const filteredDocuments = this.applySecurityFilter([document], userContext.clearanceLevel);

      if (filteredDocuments.length === 0) {
        throw new Error('User has insufficient permissions to access this document');
      }

      return filteredDocuments[0];
    } catch (error: any) {
      this.handleError(error, 'getDocumentById');
    }
  }

  /**
   * Update document metadata and processing status
   */
  async updateDocument(
    documentId: string,
    updateData: z.infer<typeof updateDocumentSchema>,
    userId: string
  ) {
    try {
      // Check if document exists
      const existingDocument = await this.prisma.km_documents.findUnique({
        where: { id: documentId, isActive: true },
      });

      if (!existingDocument) {
        throw new Error('Document not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (updateData.title !== undefined) {
        updatePayload.name = updateData.title;
      }

      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description;
      }

      if (updateData.securityClassification !== undefined) {
        updatePayload.securityClassification = updateData.securityClassification;
      }

      if (updateData.processingStatus !== undefined) {
        updatePayload.processingStatus = updateData.processingStatus;
      }

      if (updateData.extractionMetadata !== undefined) {
        updatePayload.extractionMetadata = updateData.extractionMetadata;
        updatePayload.confidenceScore = this.calculateConfidenceScore(updateData.extractionMetadata);
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive;
      }

      // If processing status is set to Completed, update processedAt
      if (updateData.processingStatus === 'PROCESSED') {
        updatePayload.processingCompletedAt = new Date();
      }

      const updatedDocument = await this.prisma.km_documents.update({
        where: { id: documentId },
        data: updatePayload,
        include: {
          users_uploaded: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedDocument;
    } catch (error: any) {
      this.handleError(error, 'updateDocument');
    }
  }

  /**
   * Soft delete document by setting isActive to false
   */
  async deleteDocument(documentId: string, userId: string) {
    try {
      const existingDocument = await this.prisma.km_documents.findUnique({
        where: { id: documentId, isActive: true },
      });

      if (!existingDocument) {
        throw new Error('Document not found');
      }

      await this.prisma.km_documents.update({
        where: { id: documentId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      this.handleError(error, 'deleteDocument');
    }
  }

  /**
   * Approve document and set approval metadata
   */
  async approveDocument(documentId: string, approvedBy: string) {
    try {
      const updatedDocument = await this.prisma.km_documents.update({
        where: { id: documentId },
        data: {
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          users_uploaded: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedDocument;
    } catch (error: any) {
      this.handleError(error, 'approveDocument');
    }
  }

  /**
   * Create document version
   */
  async createDocumentVersion(
    parentDocumentId: string,
    documentData: z.infer<typeof createDocumentSchema>,
    userId: string
  ) {
    try {
      const parentDocument = await this.prisma.km_documents.findUnique({
        where: { id: parentDocumentId },
      });

      if (!parentDocument) {
        throw new Error('Parent document not found');
      }

      const newVersion = await this.createDocument({
        ...documentData,
        parentId: parentDocumentId,
      }, userId);

      // Update parent document version if this is a newer version
      if (parentDocument.version < (newVersion as any).version) {
        await this.prisma.km_documents.update({
          where: { id: parentDocumentId },
          data: { version: (newVersion as any).version + 1 },
        });
      }

      return newVersion;
    } catch (error: any) {
      this.handleError(error, 'createDocumentVersion');
    }
  }
}