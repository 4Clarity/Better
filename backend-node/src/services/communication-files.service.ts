/**
 * Communication Files Service
 * Handles ingestion and curation of inbound communications (emails, Slack, etc.)
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface CommunicationFile {
  id?: string;
  source_type: 'email' | 'slack' | 'teams' | 'other';
  sender: string;
  recipients: string[];
  subject: string | null;
  body_text: string;
  attachments_metadata: any;
  received_at: Date;
  curation_status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'archived';
  processed_at?: Date | null;
  processed_by?: string | null;
  extraction_result?: any | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CommunicationAttachment {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}

export interface CommunicationIngestionResult {
  communication_id: string;
  attachments_processed: number;
  documents_created: string[];
  curation_queue_id: string;
}

export class CommunicationFilesService {
  /**
   * Ingest a new communication file (email, Slack message, etc.)
   */
  async ingestCommunication(
    data: Omit<CommunicationFile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CommunicationIngestionResult> {
    try {
      const communicationId = uuidv4();

      // Create communication record
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO communication_files (
          id, source_type, sender, recipients, subject, body_text,
          attachments_metadata, received_at, curation_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `,
        communicationId,
        data.source_type,
        data.sender,
        data.recipients,
        data.subject,
        data.body_text,
        JSON.stringify(data.attachments_metadata),
        data.received_at,
        data.curation_status
      );

      // Add to curation queue
      const curationQueueId = await this.addToCurationQueue({
        item_type: 'communication',
        item_id: communicationId,
        priority: this.determinePriority(data),
        metadata: {
          source_type: data.source_type,
          sender: data.sender,
          subject: data.subject,
          attachment_count: data.attachments_metadata?.attachments?.length || 0
        }
      });

      // Process attachments (if any)
      const attachments = data.attachments_metadata?.attachments || [];
      const documentsCreated: string[] = [];

      for (const attachment of attachments) {
        try {
          // Trigger document upload for each attachment
          // This would call the knowledge upload API
          const docId = await this.processAttachment(communicationId, attachment);
          documentsCreated.push(docId);
        } catch (error) {
          console.error(`Failed to process attachment: ${attachment.filename}`, error);
        }
      }

      return {
        communication_id: communicationId,
        attachments_processed: attachments.length,
        documents_created: documentsCreated,
        curation_queue_id: curationQueueId
      };
    } catch (error) {
      console.error('Error ingesting communication:', error);
      throw error;
    }
  }

  /**
   * Get communications by status
   */
  async getCommunicationsByStatus(
    status: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CommunicationFile[]> {
    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT * FROM communication_files
        WHERE curation_status = $1
        ORDER BY received_at DESC
        LIMIT $2 OFFSET $3
        `,
        status,
        limit,
        offset
      );

      return results.map(this.mapDatabaseToCommunication);
    } catch (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }
  }

  /**
   * Get communication by ID
   */
  async getCommunicationById(id: string): Promise<CommunicationFile | null> {
    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM communication_files WHERE id = $1`,
        id
      );

      if (results.length === 0) return null;

      return this.mapDatabaseToCommunication(results[0]);
    } catch (error) {
      console.error('Error fetching communication:', error);
      throw error;
    }
  }

  /**
   * Update communication curation status
   */
  async updateCurationStatus(
    id: string,
    status: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `
        UPDATE communication_files
        SET curation_status = $1,
            processed_by = $2,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
        `,
        status,
        reviewedBy,
        id
      );

      // Update curation queue
      await prisma.$executeRawUnsafe(
        `
        UPDATE curation_queue
        SET status = $1,
            reviewed_by = $2,
            reviewed_at = NOW(),
            reviewer_notes = $3,
            updated_at = NOW()
        WHERE item_type = 'communication' AND item_id = $4
        `,
        status,
        reviewedBy,
        notes || null,
        id
      );
    } catch (error) {
      console.error('Error updating curation status:', error);
      throw error;
    }
  }

  /**
   * Add item to curation queue
   */
  private async addToCurationQueue(data: {
    item_type: string;
    item_id: string;
    priority: string;
    metadata?: any;
  }): Promise<string> {
    const queueId = uuidv4();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO curation_queue (
        id, item_type, item_id, status, priority, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, NOW(), NOW())
      `,
      queueId,
      data.item_type,
      data.item_id,
      data.priority,
      JSON.stringify(data.metadata)
    );

    return queueId;
  }

  /**
   * Process attachment by creating a document record
   */
  private async processAttachment(
    communicationId: string,
    attachment: CommunicationAttachment
  ): Promise<string> {
    // This would integrate with the knowledge upload service
    // For now, we'll create a placeholder document record
    const documentId = uuidv4();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO knowledge_documents (
        id, filename, mime_type, upload_status,
        uploaded_by, source_reference, created_at, updated_at
      ) VALUES ($1, $2, $3, 'UPLOADED', 'system', $4, NOW(), NOW())
      `,
      documentId,
      attachment.filename,
      attachment.mime_type,
      `communication:${communicationId}`
    );

    return documentId;
  }

  /**
   * Determine priority based on communication metadata
   */
  private determinePriority(data: Partial<CommunicationFile>): string {
    // High priority if:
    // - Subject contains urgent/critical keywords
    // - Has attachments
    // - From specific important senders

    const urgentKeywords = ['urgent', 'critical', 'asap', 'immediate', 'priority'];
    const subject = data.subject?.toLowerCase() || '';
    const hasAttachments = (data.attachments_metadata?.attachments?.length || 0) > 0;

    if (urgentKeywords.some(keyword => subject.includes(keyword))) {
      return 'high';
    }

    if (hasAttachments) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Map database record to CommunicationFile interface
   */
  private mapDatabaseToCommunication(row: any): CommunicationFile {
    return {
      id: row.id,
      source_type: row.source_type,
      sender: row.sender,
      recipients: row.recipients,
      subject: row.subject,
      body_text: row.body_text,
      attachments_metadata: row.attachments_metadata,
      received_at: row.received_at,
      curation_status: row.curation_status,
      processed_at: row.processed_at,
      processed_by: row.processed_by,
      extraction_result: row.extraction_result,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Get curation queue summary
   */
  async getCurationQueueSummary(): Promise<any> {
    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM curation_workload_dashboard`
      );

      return results[0] || {};
    } catch (error) {
      console.error('Error fetching curation queue summary:', error);
      throw error;
    }
  }

  /**
   * Search communications by text
   */
  async searchCommunications(
    query: string,
    filters?: {
      source_type?: string;
      status?: string;
      date_from?: Date;
      date_to?: Date;
    }
  ): Promise<CommunicationFile[]> {
    try {
      let sql = `
        SELECT * FROM communication_files
        WHERE (
          subject ILIKE $1 OR
          body_text ILIKE $1 OR
          sender ILIKE $1
        )
      `;

      const params: any[] = [`%${query}%`];
      let paramIndex = 2;

      if (filters?.source_type) {
        sql += ` AND source_type = $${paramIndex}`;
        params.push(filters.source_type);
        paramIndex++;
      }

      if (filters?.status) {
        sql += ` AND curation_status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.date_from) {
        sql += ` AND received_at >= $${paramIndex}`;
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters?.date_to) {
        sql += ` AND received_at <= $${paramIndex}`;
        params.push(filters.date_to);
        paramIndex++;
      }

      sql += ` ORDER BY received_at DESC LIMIT 100`;

      const results = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

      return results.map(this.mapDatabaseToCommunication);
    } catch (error) {
      console.error('Error searching communications:', error);
      throw error;
    }
  }
}

export const communicationFilesService = new CommunicationFilesService();
