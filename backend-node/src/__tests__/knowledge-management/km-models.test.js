const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Knowledge Management Models', () => {
  let testUserId;

  beforeAll(async () => {
    // Get or create a test user
    let user = await prisma.user.findFirst({
      where: { email: 'dan.demo@tip.gov' }
    });

    if (!user) {
      // Create test user if doesn't exist
      const person = await prisma.persons.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          primaryEmail: 'test.user@tip.gov',
          timeZone: 'UTC',
          preferredLanguage: 'en',
          isActive: true,
        },
      });

      user = await prisma.user.create({
        data: {
          email: 'test.user@tip.gov',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          personId: person.id,
        },
      });
    }

    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.km_document_tags.deleteMany();
    await prisma.km_communication_tags.deleteMany();
    await prisma.km_fact_tags.deleteMany();
    await prisma.km_communications_documents.deleteMany();
    await prisma.km_sync_logs.deleteMany();
    await prisma.km_facts.deleteMany();
    await prisma.km_communications.deleteMany();
    await prisma.km_documents.deleteMany();
    await prisma.km_categories.deleteMany();
    await prisma.km_tags.deleteMany();
    await prisma.km_knowledge_sources.deleteMany();

    await prisma.$disconnect();
  });

  describe('km_documents', () => {
    test('should create a document with required fields', async () => {
      const document = await prisma.km_documents.create({
        data: {
          name: 'Test Document',
          originalFileName: 'test.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/test.pdf',
          checksum: 'abc123',
          documentType: 'PDF',
          uploadedBy: testUserId,
        },
      });

      expect(document).toBeDefined();
      expect(document.name).toBe('Test Document');
      expect(document.documentType).toBe('PDF');
      expect(document.processingStatus).toBe('Uploaded');
      expect(document.securityClassification).toBe('Unclassified');
    });

    test('should handle document versioning', async () => {
      const parentDoc = await prisma.km_documents.create({
        data: {
          name: 'Parent Document',
          originalFileName: 'parent.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/parent.pdf',
          checksum: 'parent123',
          documentType: 'PDF',
          uploadedBy: testUserId,
          version: 1,
        },
      });

      const childDoc = await prisma.km_documents.create({
        data: {
          name: 'Child Document',
          originalFileName: 'child.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          filePath: '/test/child.pdf',
          checksum: 'child123',
          documentType: 'PDF',
          uploadedBy: testUserId,
          version: 2,
          parentId: parentDoc.id,
        },
      });

      expect(childDoc.parentId).toBe(parentDoc.id);
      expect(childDoc.version).toBe(2);
    });

    test('should fail with invalid enum values', async () => {
      await expect(
        prisma.km_documents.create({
          data: {
            name: 'Invalid Document',
            originalFileName: 'invalid.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            filePath: '/test/invalid.pdf',
            checksum: 'invalid123',
            documentType: 'INVALID_TYPE', // Invalid enum
            uploadedBy: testUserId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('km_communications', () => {
    test('should create a communication with required fields', async () => {
      const communication = await prisma.km_communications.create({
        data: {
          content: 'Test communication content',
          platform: 'Microsoft_Teams',
          sentAt: new Date(),
        },
      });

      expect(communication).toBeDefined();
      expect(communication.content).toBe('Test communication content');
      expect(communication.platform).toBe('Microsoft_Teams');
      expect(communication.processingStatus).toBe('Received');
    });

    test('should handle threaded conversations', async () => {
      const parentMsg = await prisma.km_communications.create({
        data: {
          content: 'Parent message',
          platform: 'Microsoft_Teams',
          threadId: 'thread123',
          sentAt: new Date(),
        },
      });

      const childMsg = await prisma.km_communications.create({
        data: {
          content: 'Reply message',
          platform: 'Microsoft_Teams',
          threadId: 'thread123',
          parentMessageId: parentMsg.id,
          sentAt: new Date(),
        },
      });

      expect(childMsg.parentMessageId).toBe(parentMsg.id);
      expect(childMsg.threadId).toBe(parentMsg.threadId);
    });
  });

  describe('km_facts', () => {
    test('should create a fact with required fields', async () => {
      const fact = await prisma.km_facts.create({
        data: {
          title: 'Test Fact',
          content: 'This is a test fact content',
          factType: 'Technical_Specification',
          confidence: 0.95,
        },
      });

      expect(fact).toBeDefined();
      expect(fact.title).toBe('Test Fact');
      expect(fact.factType).toBe('Technical_Specification');
      expect(fact.confidence.toNumber()).toBe(0.95);
      expect(fact.status).toBe('Extracted');
      expect(fact.approvalStatus).toBe('Pending');
    });

    test('should link fact to document source', async () => {
      const document = await prisma.km_documents.create({
        data: {
          name: 'Source Document',
          originalFileName: 'source.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/source.pdf',
          checksum: 'source123',
          documentType: 'PDF',
          uploadedBy: testUserId,
        },
      });

      const fact = await prisma.km_facts.create({
        data: {
          title: 'Document Fact',
          content: 'Fact extracted from document',
          factType: 'Technical_Specification',
          confidence: 0.85,
          sourceDocumentId: document.id,
        },
      });

      expect(fact.sourceDocumentId).toBe(document.id);
    });
  });

  describe('km_categories', () => {
    test('should create a category with hierarchical structure', async () => {
      const parentCategory = await prisma.km_categories.create({
        data: {
          name: 'Parent Category',
          slug: 'parent-category',
          path: '/parent-category',
          level: 0,
          createdBy: testUserId,
        },
      });

      const childCategory = await prisma.km_categories.create({
        data: {
          name: 'Child Category',
          slug: 'child-category',
          path: '/parent-category/child-category',
          level: 1,
          parentId: parentCategory.id,
          createdBy: testUserId,
        },
      });

      expect(childCategory.parentId).toBe(parentCategory.id);
      expect(childCategory.level).toBe(1);
      expect(childCategory.path).toContain('/parent-category');
    });

    test('should enforce unique slug constraint', async () => {
      await prisma.km_categories.create({
        data: {
          name: 'Unique Category',
          slug: 'unique-slug',
          path: '/unique-slug',
          createdBy: testUserId,
        },
      });

      await expect(
        prisma.km_categories.create({
          data: {
            name: 'Duplicate Category',
            slug: 'unique-slug', // Duplicate slug
            path: '/duplicate',
            createdBy: testUserId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('km_tags', () => {
    test('should create a tag with required fields', async () => {
      const tag = await prisma.km_tags.create({
        data: {
          name: 'Test Tag',
          slug: 'test-tag',
          tagType: 'Technical',
          createdBy: testUserId,
        },
      });

      expect(tag).toBeDefined();
      expect(tag.name).toBe('Test Tag');
      expect(tag.tagType).toBe('Technical');
      expect(tag.usageCount).toBe(0);
      expect(tag.isActive).toBe(true);
    });
  });

  describe('km_knowledge_sources', () => {
    test('should create a knowledge source with configuration', async () => {
      const source = await prisma.km_knowledge_sources.create({
        data: {
          name: 'Test ServiceNow',
          sourceType: 'ServiceNow',
          connectionUrl: 'https://test.service-now.com',
          authenticationMethod: 'Basic_Auth',
          syncFrequency: 'Daily',
          configuredBy: testUserId,
        },
      });

      expect(source).toBeDefined();
      expect(source.sourceType).toBe('ServiceNow');
      expect(source.isActive).toBe(true);
      expect(source.isEnabled).toBe(false);
      expect(source.lastSyncStatus).toBe('Never_Synced');
    });

    test('should create sync logs for knowledge source', async () => {
      const source = await prisma.km_knowledge_sources.create({
        data: {
          name: 'Test Source for Logs',
          sourceType: 'REST_API',
          configuredBy: testUserId,
        },
      });

      const syncLog = await prisma.km_sync_logs.create({
        data: {
          knowledgeSourceId: source.id,
          syncType: 'Full',
          status: 'Completed',
          recordsProcessed: 100,
          recordsSuccessful: 95,
          recordsFailed: 5,
        },
      });

      expect(syncLog).toBeDefined();
      expect(syncLog.knowledgeSourceId).toBe(source.id);
      expect(syncLog.recordsProcessed).toBe(100);
    });
  });

  describe('Tagging System', () => {
    test('should create document tags', async () => {
      const document = await prisma.km_documents.create({
        data: {
          name: 'Tagged Document',
          originalFileName: 'tagged.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/tagged.pdf',
          checksum: 'tagged123',
          documentType: 'PDF',
          uploadedBy: testUserId,
        },
      });

      const tag = await prisma.km_tags.create({
        data: {
          name: 'Important',
          slug: 'important',
          tagType: 'Priority',
          createdBy: testUserId,
        },
      });

      const documentTag = await prisma.km_document_tags.create({
        data: {
          documentId: document.id,
          tagId: tag.id,
          addedBy: testUserId,
        },
      });

      expect(documentTag).toBeDefined();
      expect(documentTag.documentId).toBe(document.id);
      expect(documentTag.tagId).toBe(tag.id);
    });

    test('should enforce unique document-tag constraint', async () => {
      const document = await prisma.km_documents.create({
        data: {
          name: 'Constraint Test Doc',
          originalFileName: 'constraint.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/constraint.pdf',
          checksum: 'constraint123',
          documentType: 'PDF',
          uploadedBy: testUserId,
        },
      });

      const tag = await prisma.km_tags.create({
        data: {
          name: 'Constraint Tag',
          slug: 'constraint-tag',
          createdBy: testUserId,
        },
      });

      await prisma.km_document_tags.create({
        data: {
          documentId: document.id,
          tagId: tag.id,
          addedBy: testUserId,
        },
      });

      // Should fail on duplicate
      await expect(
        prisma.km_document_tags.create({
          data: {
            documentId: document.id,
            tagId: tag.id,
            addedBy: testUserId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null optional fields', async () => {
      const document = await prisma.km_documents.create({
        data: {
          name: 'Minimal Document',
          originalFileName: 'minimal.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          filePath: '/test/minimal.pdf',
          checksum: 'minimal123',
          documentType: 'PDF',
          uploadedBy: testUserId,
          description: null,
          parentId: null,
          approvedBy: null,
        },
      });

      expect(document.description).toBeNull();
      expect(document.parentId).toBeNull();
      expect(document.approvedBy).toBeNull();
    });

    test('should handle large confidence values', async () => {
      const fact = await prisma.km_facts.create({
        data: {
          title: 'High Confidence Fact',
          content: 'Very confident about this',
          factType: 'Knowledge_Snippet',
          confidence: 0.999, // Near maximum
        },
      });

      expect(fact.confidence.toNumber()).toBe(0.999);
    });

    test('should handle edge case confidence values', async () => {
      const lowFact = await prisma.km_facts.create({
        data: {
          title: 'Low Confidence Fact',
          content: 'Not very confident',
          factType: 'Knowledge_Snippet',
          confidence: 0.01, // Very low
        },
      });

      expect(lowFact.confidence.toNumber()).toBe(0.01);
    });
  });

  describe('Failure Cases', () => {
    test('should fail with missing required fields', async () => {
      await expect(
        prisma.km_documents.create({
          data: {
            name: 'Incomplete Document',
            // Missing required fields
          },
        })
      ).rejects.toThrow();
    });

    test('should fail with invalid foreign key', async () => {
      await expect(
        prisma.km_facts.create({
          data: {
            title: 'Invalid Source Fact',
            content: 'Fact with invalid source',
            factType: 'Knowledge_Snippet',
            confidence: 0.5,
            sourceDocumentId: 'nonexistent-id',
          },
        })
      ).rejects.toThrow();
    });

    test('should fail with confidence out of range', async () => {
      await expect(
        prisma.km_facts.create({
          data: {
            title: 'Invalid Confidence Fact',
            content: 'Fact with invalid confidence',
            factType: 'Knowledge_Snippet',
            confidence: 1.5, // > 1.0
          },
        })
      ).rejects.toThrow();
    });
  });
});