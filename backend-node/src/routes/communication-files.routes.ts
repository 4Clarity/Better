/**
 * Communication Files API Routes
 * Handles inbound communications curation and processing
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { communicationFilesService } from '../services/communication-files.service';

interface IngestCommunicationBody {
  source_type: 'email' | 'slack' | 'teams' | 'other';
  sender: string;
  recipients: string[];
  subject?: string;
  body_text: string;
  attachments_metadata?: any;
  received_at?: string;
}

interface UpdateStatusBody {
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'archived';
  reviewed_by: string;
  notes?: string;
}

interface SearchQuery {
  query: string;
  source_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export default async function communicationFilesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/communications/ingest
   * Ingest a new communication (email, Slack message, etc.)
   */
  fastify.post(
    '/ingest',
    async (request: FastifyRequest<{ Body: IngestCommunicationBody }>, reply: FastifyReply) => {
      try {
        const { source_type, sender, recipients, subject, body_text, attachments_metadata, received_at } = request.body;

        // Validate required fields
        if (!source_type || !sender || !recipients || !body_text) {
          return reply.status(400).send({
            error: 'Missing required fields: source_type, sender, recipients, body_text'
          });
        }

        const result = await communicationFilesService.ingestCommunication({
          source_type,
          sender,
          recipients,
          subject: subject || null,
          body_text,
          attachments_metadata: attachments_metadata || {},
          received_at: received_at ? new Date(received_at) : new Date(),
          curation_status: 'pending'
        });

        return reply.status(201).send({
          success: true,
          ...result
        });
      } catch (error) {
        console.error('Error ingesting communication:', error);
        return reply.status(500).send({
          error: 'Failed to ingest communication'
        });
      }
    }
  );

  /**
   * GET /api/communications/status/:status
   * Get communications by curation status
   */
  fastify.get(
    '/status/:status',
    async (
      request: FastifyRequest<{
        Params: { status: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { status } = request.params;
        const limit = parseInt(request.query.limit || '50');
        const offset = parseInt(request.query.offset || '0');

        const communications = await communicationFilesService.getCommunicationsByStatus(
          status,
          limit,
          offset
        );

        return reply.send({
          status,
          count: communications.length,
          limit,
          offset,
          communications
        });
      } catch (error) {
        console.error('Error fetching communications:', error);
        return reply.status(500).send({
          error: 'Failed to fetch communications'
        });
      }
    }
  );

  /**
   * GET /api/communications/:id
   * Get communication by ID
   */
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const communication = await communicationFilesService.getCommunicationById(id);

        if (!communication) {
          return reply.status(404).send({
            error: 'Communication not found'
          });
        }

        return reply.send(communication);
      } catch (error) {
        console.error('Error fetching communication:', error);
        return reply.status(500).send({
          error: 'Failed to fetch communication'
        });
      }
    }
  );

  /**
   * PATCH /api/communications/:id/status
   * Update communication curation status
   */
  fastify.patch(
    '/:id/status',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateStatusBody;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { status, reviewed_by, notes } = request.body;

        if (!status || !reviewed_by) {
          return reply.status(400).send({
            error: 'Missing required fields: status, reviewed_by'
          });
        }

        await communicationFilesService.updateCurationStatus(id, status, reviewed_by, notes);

        return reply.send({
          success: true,
          message: 'Communication status updated'
        });
      } catch (error) {
        console.error('Error updating communication status:', error);
        return reply.status(500).send({
          error: 'Failed to update communication status'
        });
      }
    }
  );

  /**
   * GET /api/communications/queue/summary
   * Get curation queue summary
   */
  fastify.get('/queue/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await communicationFilesService.getCurationQueueSummary();

      return reply.send(summary);
    } catch (error) {
      console.error('Error fetching queue summary:', error);
      return reply.status(500).send({
        error: 'Failed to fetch queue summary'
      });
    }
  });

  /**
   * POST /api/communications/search
   * Search communications by text and filters
   */
  fastify.post(
    '/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>, reply: FastifyReply) => {
      try {
        const { query, source_type, status, date_from, date_to } = request.body;

        if (!query) {
          return reply.status(400).send({
            error: 'Query parameter is required'
          });
        }

        const filters: any = {};
        if (source_type) filters.source_type = source_type;
        if (status) filters.status = status;
        if (date_from) filters.date_from = new Date(date_from);
        if (date_to) filters.date_to = new Date(date_to);

        const results = await communicationFilesService.searchCommunications(query, filters);

        return reply.send({
          query,
          filters,
          count: results.length,
          results
        });
      } catch (error) {
        console.error('Error searching communications:', error);
        return reply.status(500).send({
          error: 'Failed to search communications'
        });
      }
    }
  );

  /**
   * GET /api/communications/pending
   * Get all pending communications (shortcut)
   */
  fastify.get('/pending', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const communications = await communicationFilesService.getCommunicationsByStatus('pending');

      return reply.send({
        count: communications.length,
        communications
      });
    } catch (error) {
      console.error('Error fetching pending communications:', error);
      return reply.status(500).send({
        error: 'Failed to fetch pending communications'
      });
    }
  });

  /**
   * POST /api/communications/bulk-update
   * Bulk update communication statuses
   */
  fastify.post(
    '/bulk-update',
    async (
      request: FastifyRequest<{
        Body: {
          communication_ids: string[];
          status: string;
          reviewed_by: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { communication_ids, status, reviewed_by } = request.body;

        if (!communication_ids || !status || !reviewed_by) {
          return reply.status(400).send({
            error: 'Missing required fields: communication_ids, status, reviewed_by'
          });
        }

        // Update each communication
        const results = await Promise.allSettled(
          communication_ids.map(id =>
            communicationFilesService.updateCurationStatus(id, status, reviewed_by)
          )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        return reply.send({
          success: true,
          total: communication_ids.length,
          successful: successCount,
          failed: failureCount
        });
      } catch (error) {
        console.error('Error bulk updating communications:', error);
        return reply.status(500).send({
          error: 'Failed to bulk update communications'
        });
      }
    }
  );
}
