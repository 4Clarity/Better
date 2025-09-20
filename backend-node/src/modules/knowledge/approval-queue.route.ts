import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getApprovalQueueHandler,
  getFactForReviewHandler,
  approveFactHandler,
  rejectFactHandler,
  updateApprovalStatusHandler,
  bulkApprovalHandler,
  getApprovalStatsHandler,
} from './approval-queue.controller';
import { FactApprovalStatus } from '@prisma/client';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const factResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    summary: { type: ['string', 'null'] },
    factType: { type: 'string' },
    confidence: { type: 'number' },
    status: { type: 'string' },
    approvalStatus: { type: 'string' },
    extractedAt: { type: 'string' },
    reviewedAt: { type: ['string', 'null'] },
    approvedAt: { type: ['string', 'null'] },
    rejectionReason: { type: ['string', 'null'] },
    securityClassification: { type: 'string' },
    sourceContext: { type: ['string', 'null'] },
    users_extracted: { type: ['object', 'null'] },
    users_reviewed: { type: ['object', 'null'] },
    users_approved: { type: ['object', 'null'] },
    source_document: { type: ['object', 'null'] },
    source_communication: { type: ['object', 'null'] },
  },
};

const approvalQueueResponseSchema = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: factResponseSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
    summary: {
      type: 'object',
      properties: {
        totalPending: { type: 'number' },
        totalUnderReview: { type: 'number' },
        totalNeedsReview: { type: 'number' },
        avgConfidence: { type: 'number' },
      },
    },
  },
};

const bulkApprovalResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    results: {
      type: 'object',
      properties: {
        successful: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factId: { type: 'string' },
              success: { type: 'boolean' },
              result: factResponseSchema,
            },
          },
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factId: { type: 'string' },
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
          },
        },
      },
    },
  },
};

// Request validation schemas
export const getApprovalQueueQuerySchema = z.object({
  status: z.array(z.enum(['Pending', 'Under_Review', 'Needs_Review', 'Approved', 'Rejected', 'Conditionally_Approved'])).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  maxConfidence: z.coerce.number().min(0).max(1).optional(),
  factType: z.array(z.string()).optional(),
  sourceType: z.enum(['document', 'communication']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  reviewer: z.string().optional(),
  submitter: z.string().optional(),
  securityClassification: z.enum(['Unclassified', 'Confidential', 'Secret', 'Top_Secret']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['confidence', 'createdAt', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const approveFactSchema = z.object({
  comments: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const rejectFactSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
  comments: z.string().optional(),
  feedback: z.object({
    category: z.enum(['accuracy', 'relevance', 'completeness', 'classification', 'duplicate', 'other']).optional(),
    suggestions: z.string().optional(),
    confidence_issues: z.boolean().optional(),
    source_issues: z.boolean().optional(),
  }).optional(),
});

export const updateApprovalStatusSchema = z.object({
  status: z.enum(['Pending', 'Under_Review', 'Needs_Review', 'Approved', 'Rejected', 'Conditionally_Approved'] as const),
  comments: z.string().optional(),
});

export const bulkApprovalSchema = z.object({
  factIds: z.array(z.string().min(1)).min(1).max(50, "Bulk operations are limited to 50 items"),
  action: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
  reason: z.string().optional(),
});

// Route definitions
export default async function approvalQueueRoutes(fastify: FastifyInstance) {
  // Get approval queue with filtering and pagination
  fastify.get('/knowledge/approval-queue', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['Pending', 'Under_Review', 'Needs_Review', 'Approved', 'Rejected', 'Conditionally_Approved'],
            },
          },
          minConfidence: { type: 'number', minimum: 0, maximum: 1 },
          maxConfidence: { type: 'number', minimum: 0, maximum: 1 },
          factType: {
            type: 'array',
            items: { type: 'string' },
          },
          sourceType: {
            type: 'string',
            enum: ['document', 'communication'],
          },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' },
          reviewer: { type: 'string' },
          submitter: { type: 'string' },
          securityClassification: {
            type: 'string',
            enum: ['Unclassified', 'Confidential', 'Secret', 'Top_Secret'],
          },
          search: { type: 'string' },
          sortBy: {
            type: 'string',
            enum: ['confidence', 'createdAt', 'priority'],
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
          },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: approvalQueueResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getApprovalQueueHandler);

  // Get specific fact for review with full context
  fastify.get('/knowledge/approval-queue/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ...factResponseSchema.properties,
            relatedFacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  factType: { type: 'string' },
                  confidence: { type: 'number' },
                  approvalStatus: { type: 'string' },
                },
              },
            },
            approvalHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  action: { type: 'string' },
                  timestamp: { type: 'string' },
                  user: { type: 'object' },
                  oldValues: { type: ['object', 'null'] },
                  newValues: { type: ['object', 'null'] },
                },
              },
            },
            allowedTransitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  toStatus: { type: 'string' },
                  requiresComment: { type: 'boolean' },
                  autoApprovalRules: { type: ['object', 'null'] },
                },
              },
            },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getFactForReviewHandler);

  // Approve fact with comments and metadata
  fastify.post('/knowledge/approval-queue/:id/approve', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          comments: { type: 'string' },
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            fact: factResponseSchema,
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, approveFactHandler);

  // Reject fact with required reason and feedback
  fastify.post('/knowledge/approval-queue/:id/reject', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', minLength: 1 },
          comments: { type: 'string' },
          feedback: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['accuracy', 'relevance', 'completeness', 'classification', 'duplicate', 'other'],
              },
              suggestions: { type: 'string' },
              confidence_issues: { type: 'boolean' },
              source_issues: { type: 'boolean' },
            },
          },
        },
        required: ['reason'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            fact: factResponseSchema,
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, rejectFactHandler);

  // Update approval status (pending, under_review, escalated)
  fastify.patch('/knowledge/approval-queue/:id/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['Pending', 'Under_Review', 'Needs_Review', 'Approved', 'Rejected', 'Conditionally_Approved'],
          },
          comments: { type: 'string' },
        },
        required: ['status'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            fact: factResponseSchema,
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateApprovalStatusHandler);

  // Bulk operations for multiple fact approval/rejection
  fastify.post('/knowledge/approval-queue/bulk', {
    schema: {
      body: {
        type: 'object',
        properties: {
          factIds: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            maxItems: 50,
          },
          action: {
            type: 'string',
            enum: ['approve', 'reject'],
          },
          comments: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['factIds', 'action'],
      },
      response: {
        200: bulkApprovalResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, bulkApprovalHandler);

  // Get approval queue statistics and metrics
  fastify.get('/knowledge/approval-queue/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            totalPending: { type: 'number' },
            totalUnderReview: { type: 'number' },
            totalNeedsReview: { type: 'number' },
            avgConfidence: { type: 'number' },
            avgProcessingTime: { type: 'number' },
            topReviewers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  approvalCount: { type: 'number' },
                  avgResponseTime: { type: 'number' },
                },
              },
            },
            factTypeDistribution: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            confidenceDistribution: {
              type: 'object',
              properties: {
                high: { type: 'number' },
                medium: { type: 'number' },
                low: { type: 'number' },
              },
            },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getApprovalStatsHandler);
}