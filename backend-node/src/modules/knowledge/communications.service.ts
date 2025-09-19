import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from '../../services/KnowledgeService';
import { getPrismaClient } from '../../utils/database';
import {
  createCommunicationSchema,
  updateCommunicationSchema,
  getCommunicationsQuerySchema,
} from './communications.route';

export interface CommunicationsQueryParams {
  search?: string;
  platform?: string;
  direction?: string;
  threadId?: string;
  processingStatus?: string;
  securityClassification?: string;
  participants?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export class CommunicationsService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Map API communication direction to Prisma enum format
   */
  private mapDirection(apiDirection: string): string {
    const mapping: Record<string, string> = {
      'INBOUND': 'Inbound',
      'OUTBOUND': 'Outbound',
      'INTERNAL': 'Internal'
    };
    return mapping[apiDirection] || 'Internal';
  }

  /**
   * Map API platform to Prisma enum format
   */
  private mapPlatform(apiPlatform: string): string {
    const mapping: Record<string, string> = {
      'EMAIL': 'Email',
      'TEAMS': 'Teams',
      'SLACK': 'Slack',
      'ZOOM': 'Zoom',
      'PHONE': 'Phone',
      'OTHER': 'Other'
    };
    return mapping[apiPlatform] || 'Other';
  }

  /**
   * Map API content type to Prisma enum format
   */
  private mapContentType(apiContentType: string): string {
    const mapping: Record<string, string> = {
      'TEXT': 'Text',
      'HTML': 'Html',
      'MARKDOWN': 'Markdown',
      'RICH_TEXT': 'Rich_Text',
      'JSON': 'Json'
    };
    return mapping[apiContentType] || 'Text';
  }

  /**
   * Map API processing status to Prisma enum format
   */
  private mapProcessingStatus(apiStatus: string): string {
    const mapping: Record<string, string> = {
      'PENDING': 'Pending',
      'PROCESSING': 'Processing',
      'PROCESSED': 'Processed',
      'FAILED': 'Failed'
    };
    return mapping[apiStatus] || 'Pending';
  }

  /**
   * Map API security classification to Prisma enum format
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
   * Generate thread ID for platform-specific communications
   */
  private generateThreadId(platform: string, externalId?: string): string {
    const timestamp = Date.now().toString(36);
    const platformPrefix = platform.toLowerCase().substring(0, 3);
    return externalId ? `${platformPrefix}_${externalId}_${timestamp}` : `${platformPrefix}_${timestamp}`;
  }

  /**
   * Validate participants based on platform
   */
  private validateParticipants(platform: string, participants: string[], externalParticipants: string[]): { valid: boolean; error?: string } {
    if (platform === 'EMAIL' && externalParticipants.length === 0) {
      return {
        valid: false,
        error: 'Email communications require at least one external participant'
      };
    }

    if (platform === 'INTERNAL' && externalParticipants.length > 0) {
      return {
        valid: false,
        error: 'Internal communications should not have external participants'
      };
    }

    return { valid: true };
  }

  /**
   * Create a new communication record
   */
  async createCommunication(
    communicationData: z.infer<typeof createCommunicationSchema>,
    userId: string
  ) {
    try {
      // Validate participants based on platform
      const participantValidation = this.validateParticipants(
        communicationData.platform,
        communicationData.participants,
        communicationData.externalParticipants
      );

      if (!participantValidation.valid) {
        throw new Error(participantValidation.error);
      }

      // Generate thread ID if not provided
      const threadId = communicationData.threadId ||
        this.generateThreadId(communicationData.platform, communicationData.externalId);

      const communication = await this.prisma.km_communications.create({
        data: {
          platform: this.mapPlatform(communicationData.platform) as any,
          externalId: communicationData.externalId || null,
          threadId,
          // direction: this.mapDirection(communicationData.direction) as any, // Field not in schema
          subject: communicationData.subject || null,
          content: communicationData.content,
          contentType: this.mapContentType(communicationData.contentType) as any,
          fromEmail: communicationData.fromEmail || null,
          recipientEmails: communicationData.recipientEmails,
          participants: communicationData.participants,
          externalParticipants: communicationData.externalParticipants,
          metadata: communicationData.metadata || undefined,
          processingStatus: this.mapProcessingStatus(communicationData.processingStatus) as any,
          securityClassification: this.mapSecurityClassification(communicationData.securityClassification) as any,
          isActive: true,
          sentAt: communicationData.sentAt ? new Date(communicationData.sentAt) : null,
        },
        include: {
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

      return communication;
    } catch (error: any) {
      this.handleError(error, 'createCommunication');
    }
  }

  /**
   * Get communications with filtering, pagination, and security filtering
   */
  async getCommunications(
    queryParams: z.infer<typeof getCommunicationsQuerySchema>,
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
          { subject: { contains: queryParams.search, mode: 'insensitive' } },
          { content: { contains: queryParams.search, mode: 'insensitive' } },
          { fromEmail: { contains: queryParams.search, mode: 'insensitive' } },
        ];
      }

      // Add platform filter
      if (queryParams.platform) {
        whereConditions.platform = this.mapPlatform(queryParams.platform);
      }

      // Add direction filter - field not in schema
      // if (queryParams.direction) {
      //   whereConditions.direction = this.mapDirection(queryParams.direction);
      // }

      // Add thread filter
      if (queryParams.threadId) {
        whereConditions.threadId = queryParams.threadId;
      }

      // Add processing status filter
      if (queryParams.processingStatus) {
        whereConditions.processingStatus = this.mapProcessingStatus(queryParams.processingStatus);
      }

      // Add security classification filter
      if (queryParams.securityClassification) {
        whereConditions.securityClassification = this.mapSecurityClassification(queryParams.securityClassification);
      }

      // Add participants filter
      if (queryParams.participants) {
        whereConditions.OR = whereConditions.OR || [];
        whereConditions.OR.push(
          { participants: { has: queryParams.participants } },
          { externalParticipants: { has: queryParams.participants } }
        );
      }

      // Get total count
      const total = await this.prisma.km_communications.count({
        where: whereConditions,
      });

      // Get communications with thread context
      const communications = await this.prisma.km_communications.findMany({
        where: whereConditions,
        include: {
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
        orderBy: [
          { threadId: 'asc' },
          { sentAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: queryParams.limit,
        skip: queryParams.offset,
      });

      // Apply security filtering
      const filteredCommunications = this.applySecurityFilter(communications, userContext.clearanceLevel);

      // Group by thread for context
      const groupedByThread = this.groupCommunicationsByThread(filteredCommunications);

      return {
        communications: filteredCommunications,
        threads: groupedByThread,
        pagination: {
          total: filteredCommunications.length,
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: queryParams.offset + queryParams.limit < total,
        },
      };
    } catch (error: any) {
      this.handleError(error, 'getCommunications');
    }
  }

  /**
   * Get communication by ID with thread context and security filtering
   */
  async getCommunicationById(communicationId: string, userContext: UserContext) {
    try {
      const communication = await this.prisma.km_communications.findUnique({
        where: {
          id: communicationId,
          isActive: true,
        },
        include: {
          km_facts: {
            select: {
              id: true,
              factType: true,
              content: true,
              confidence: true,
              approvalStatus: true,
              // sourceCommunicationId references this communication
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      if (!communication) {
        return null;
      }

      // Get thread context - other communications in the same thread
      const threadCommunications = await this.prisma.km_communications.findMany({
        where: {
          threadId: communication.threadId,
          isActive: true,
          id: { not: communicationId },
        },
        select: {
          id: true,
          // direction: true, // Field not in schema
          subject: true,
          fromEmail: true,
          participants: true,
          sentAt: true,
          createdAt: true,
        },
        orderBy: {
          sentAt: 'asc',
        },
      });

      // Apply security filtering
      const filteredCommunications = this.applySecurityFilter([communication], userContext.clearanceLevel);

      if (filteredCommunications.length === 0) {
        throw new Error('User has insufficient permissions to access this communication');
      }

      const result = filteredCommunications[0];

      // Add thread context
      (result as any).threadContext = threadCommunications;

      return result;
    } catch (error: any) {
      this.handleError(error, 'getCommunicationById');
    }
  }

  /**
   * Update communication metadata and processing status
   */
  async updateCommunication(
    communicationId: string,
    updateData: z.infer<typeof updateCommunicationSchema>,
    userId: string
  ) {
    try {
      // Check if communication exists
      const existingCommunication = await this.prisma.km_communications.findUnique({
        where: { id: communicationId, isActive: true },
      });

      if (!existingCommunication) {
        throw new Error('Communication not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (updateData.subject !== undefined) {
        updatePayload.subject = updateData.subject;
      }

      if (updateData.content !== undefined) {
        updatePayload.content = updateData.content;
      }

      if (updateData.contentType !== undefined) {
        updatePayload.contentType = this.mapContentType(updateData.contentType);
      }

      if (updateData.recipientEmails !== undefined) {
        updatePayload.recipientEmails = updateData.recipientEmails;
      }

      if (updateData.participants !== undefined) {
        updatePayload.participants = updateData.participants;
      }

      if (updateData.externalParticipants !== undefined) {
        updatePayload.externalParticipants = updateData.externalParticipants;
      }

      if (updateData.metadata !== undefined) {
        updatePayload.metadata = updateData.metadata;
      }

      if (updateData.processingStatus !== undefined) {
        updatePayload.processingStatus = this.mapProcessingStatus(updateData.processingStatus);
      }

      if (updateData.securityClassification !== undefined) {
        updatePayload.securityClassification = this.mapSecurityClassification(updateData.securityClassification);
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive;
      }

      const updatedCommunication = await this.prisma.km_communications.update({
        where: { id: communicationId },
        data: updatePayload,
        include: {
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

      return updatedCommunication;
    } catch (error: any) {
      this.handleError(error, 'updateCommunication');
    }
  }

  /**
   * Soft delete communication by setting isActive to false
   */
  async deleteCommunication(communicationId: string, userId: string) {
    try {
      const existingCommunication = await this.prisma.km_communications.findUnique({
        where: { id: communicationId, isActive: true },
      });

      if (!existingCommunication) {
        throw new Error('Communication not found');
      }

      await this.prisma.km_communications.update({
        where: { id: communicationId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      this.handleError(error, 'deleteCommunication');
    }
  }

  /**
   * Group communications by thread for context
   */
  private groupCommunicationsByThread(communications: any[]) {
    const threads: Record<string, any[]> = {};

    communications.forEach(comm => {
      if (!threads[comm.threadId]) {
        threads[comm.threadId] = [];
      }
      threads[comm.threadId].push({
        id: comm.id,
        // direction: comm.direction, // Field not in schema
        subject: comm.subject,
        fromEmail: comm.fromEmail,
        participants: comm.participants,
        sentAt: comm.sentAt,
        createdAt: comm.createdAt,
      });
    });

    // Sort each thread by date
    Object.keys(threads).forEach(threadId => {
      threads[threadId].sort((a, b) =>
        new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime()
      );
    });

    return threads;
  }

  /**
   * Get thread summary for fact extraction workflows
   */
  async getThreadSummary(threadId: string, userContext: UserContext) {
    try {
      const threadCommunications = await this.prisma.km_communications.findMany({
        where: {
          threadId,
          isActive: true,
        },
        select: {
          id: true,
          // direction: true, // Field not in schema
          subject: true,
          content: true,
          fromEmail: true,
          participants: true,
          externalParticipants: true,
          sentAt: true,
          createdAt: true,
        },
        orderBy: {
          sentAt: 'asc',
        },
      });

      // Apply security filtering
      const filteredCommunications = this.applySecurityFilter(threadCommunications, userContext.clearanceLevel);

      return {
        threadId,
        communicationCount: filteredCommunications.length,
        participants: this.extractAllParticipants(filteredCommunications),
        dateRange: this.getThreadDateRange(filteredCommunications),
        communications: filteredCommunications,
      };
    } catch (error: any) {
      this.handleError(error, 'getThreadSummary');
    }
  }

  /**
   * Extract all unique participants from thread communications
   */
  private extractAllParticipants(communications: any[]) {
    const allParticipants = new Set<string>();

    communications.forEach(comm => {
      comm.participants.forEach((p: string) => allParticipants.add(p));
      comm.externalParticipants.forEach((p: string) => allParticipants.add(p));
      if (comm.fromEmail) {
        allParticipants.add(comm.fromEmail);
      }
    });

    return Array.from(allParticipants);
  }

  /**
   * Get date range for thread communications
   */
  private getThreadDateRange(communications: any[]) {
    if (communications.length === 0) {
      return null;
    }

    const dates = communications.map(comm =>
      new Date(comm.sentAt || comm.createdAt)
    ).sort((a, b) => a.getTime() - b.getTime());

    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      duration: dates[dates.length - 1].getTime() - dates[0].getTime(),
    };
  }
}