import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import { n8nMonitoringService } from './n8n-monitoring.service';

/**
 * n8n Monitoring Routes
 * Provides endpoints for tracking workflow executions and displaying metrics
 */
export default async function n8nMonitoringRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/knowledge/n8n/executions/:documentId
   * Get workflow execution history for a specific document
   */
  fastify.get(
    '/executions/:documentId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['documentId'],
          properties: {
            documentId: { type: 'string', description: 'Document ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              executions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    documentId: { type: 'string' },
                    documentName: { type: 'string' },
                    startedAt: { type: 'string', format: 'date-time' },
                    finishedAt: { type: 'string', format: 'date-time' },
                    duration: { type: 'number' },
                    status: { type: 'string', enum: ['running', 'success', 'failed'] },
                    error: { type: 'string' },
                    n8nWorkflowId: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { documentId } = request.params as { documentId: string };
        const executions = await n8nMonitoringService.getWorkflowExecutions(documentId);

        return reply.code(200).send({
          success: true,
          executions,
        });
      } catch (error: any) {
        console.error('Error fetching workflow executions:', error);

        if (error.message === 'Document not found') {
          return reply.code(404).send({
            success: false,
            error: 'Document not found',
          });
        }

        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to fetch workflow executions',
        });
      }
    }
  );

  /**
   * GET /api/knowledge/n8n/metrics
   * Get aggregated workflow metrics across all documents
   */
  fastify.get(
    '/metrics',
    {
      onRequest: [authenticate],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              metrics: {
                type: 'object',
                properties: {
                  successRate: { type: 'number' },
                  avgDuration: { type: 'number' },
                  totalExecutions: { type: 'number' },
                  failureRate: { type: 'number' },
                  executionsByDay: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metrics = await n8nMonitoringService.getWorkflowMetrics();

        return reply.send({
          success: true,
          metrics,
        });
      } catch (error: any) {
        console.error('Error fetching workflow metrics:', error);

        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to fetch workflow metrics',
        });
      }
    }
  );

  /**
   * GET /api/knowledge/n8n/execution/:executionId
   * Get detailed execution information by execution ID
   */
  fastify.get(
    '/execution/:executionId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['executionId'],
          properties: {
            executionId: { type: 'string', description: 'Execution ID (n8n workflow ID)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              execution: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  workflowId: { type: 'string' },
                  documentId: { type: 'string' },
                  documentName: { type: 'string' },
                  status: { type: 'string', enum: ['running', 'success', 'failed'] },
                  startedAt: { type: 'string', format: 'date-time' },
                  finishedAt: { type: 'string', format: 'date-time' },
                  duration: { type: 'number' },
                  error: { type: 'string' },
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        status: { type: 'string' },
                        duration: { type: 'number' },
                        error: { type: 'string' },
                      },
                    },
                  },
                  metadata: { type: 'object' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { executionId } = request.params as { executionId: string };
        const execution = await n8nMonitoringService.getExecutionById(executionId);

        return reply.code(200).send({
          success: true,
          execution,
        });
      } catch (error: any) {
        console.error('Error fetching execution details:', error);

        if (error.message === 'Execution not found') {
          return reply.code(404).send({
            success: false,
            error: 'Execution not found',
          });
        }

        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to fetch execution details',
        });
      }
    }
  );

  /**
   * POST /api/knowledge/n8n/retry/:documentId
   * Retry workflow for a failed document
   */
  fastify.post(
    '/retry/:documentId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['documentId'],
          properties: {
            documentId: { type: 'string', description: 'Document ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { documentId } = request.params as { documentId: string };
        await n8nMonitoringService.retryWorkflow(documentId);

        return reply.code(200).send({
          success: true,
          message: 'Workflow retry triggered successfully',
        });
      } catch (error: any) {
        console.error('Error retrying workflow:', error);

        if (error.message === 'Document not found') {
          return reply.code(404).send({
            success: false,
            error: 'Document not found',
          });
        }

        if (
          error.message === 'Can only retry failed workflow executions' ||
          error.message === 'n8n workflow integration is not enabled'
        ) {
          return reply.code(400).send({
            success: false,
            error: error.message,
          });
        }

        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to retry workflow',
        });
      }
    }
  );
}
