const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedKnowledgeManagement() {
  console.log('🌱 Seeding Knowledge Management data...');

  try {
    // Create test categories
    const techCategory = await prisma.km_categories.create({
      data: {
        name: 'Technical Documentation',
        description: 'Technical specifications, architecture docs, and system documentation',
        slug: 'technical-documentation',
        level: 0,
        path: '/technical-documentation',
        color: '#0066CC',
        icon: 'technical',
        displayOrder: 1,
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        createdBy: 'dan-demont-user-id', // Existing user
      },
    });

    const processCategory = await prisma.km_categories.create({
      data: {
        name: 'Business Processes',
        description: 'Process documentation, workflows, and procedures',
        slug: 'business-processes',
        level: 0,
        path: '/business-processes',
        color: '#00AA44',
        icon: 'process',
        displayOrder: 2,
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        createdBy: 'dan-demont-user-id',
      },
    });

    // Create test tags
    const urgentTag = await prisma.km_tags.create({
      data: {
        name: 'Urgent',
        description: 'High priority items requiring immediate attention',
        slug: 'urgent',
        tagType: 'Priority',
        color: '#FF4444',
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        createdBy: 'dan-demont-user-id',
      },
    });

    const systemTag = await prisma.km_tags.create({
      data: {
        name: 'System Architecture',
        description: 'Items related to system architecture and design',
        slug: 'system-architecture',
        tagType: 'Technical',
        color: '#4444FF',
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        createdBy: 'dan-demont-user-id',
      },
    });

    // Create test document
    const testDocument = await prisma.km_documents.create({
      data: {
        name: 'System Architecture Overview',
        description: 'High-level overview of the TIP system architecture',
        originalFileName: 'system-architecture-overview.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048000,
        filePath: '/uploads/documents/system-architecture-overview.pdf',
        checksum: 'sha256:abcd1234efgh5678ijkl9012mnop3456',
        version: 1,
        securityClassification: 'Unclassified',
        processingStatus: 'Completed',
        documentType: 'PDF',
        source: 'Manual_Upload',
        accessLevel: 'Standard',
        uploadedBy: 'dan-demont-user-id',
        extractedText: 'This document provides a comprehensive overview of the TIP system architecture...',
        pageCount: 15,
        wordCount: 3500,
        language: 'en',
      },
    });

    // Create test communication
    const testCommunication = await prisma.km_communications.create({
      data: {
        subject: 'System Architecture Discussion',
        content: 'We need to review the current system architecture and plan for upcoming changes...',
        contentType: 'Text',
        platform: 'Microsoft_Teams',
        externalId: 'teams-msg-123456',
        threadId: 'teams-thread-789',
        fromEmail: 'architect@example.com',
        fromName: 'John Architect',
        toUsers: JSON.stringify(['dan-demont-user-id']),
        toEmails: JSON.stringify(['pm@example.com']),
        securityClassification: 'Unclassified',
        processingStatus: 'Completed',
        source: 'Teams_Connector',
        sentAt: new Date(),
        extractedText: 'We need to review the current system architecture and plan for upcoming changes...',
        wordCount: 85,
        language: 'en',
      },
    });

    // Create test fact
    const testFact = await prisma.km_facts.create({
      data: {
        title: 'System uses microservices architecture',
        content: 'The TIP system is built using a microservices architecture with Docker containers for deployment.',
        summary: 'TIP uses microservices and Docker',
        factType: 'Technical_Specification',
        confidence: 0.95,
        status: 'Processed',
        approvalStatus: 'Approved',
        sourceDocumentId: testDocument.id,
        extractionModel: 'gpt-4-knowledge-extractor',
        extractedBy: 'dan-demont-user-id',
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        language: 'en',
        keywords: JSON.stringify(['microservices', 'docker', 'architecture']),
        entities: JSON.stringify([
          { type: 'TECHNOLOGY', name: 'Docker' },
          { type: 'ARCHITECTURE', name: 'Microservices' }
        ]),
      },
    });

    // Create test knowledge source
    const testKnowledgeSource = await prisma.km_knowledge_sources.create({
      data: {
        name: 'ServiceNow Knowledge Base',
        description: 'Corporate ServiceNow instance for IT knowledge and procedures',
        sourceType: 'ServiceNow',
        connectionUrl: 'https://company.service-now.com',
        authenticationMethod: 'Basic_Auth',
        syncFrequency: 'Daily',
        lastSyncStatus: 'Completed',
        lastSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        lastSyncRecordsProcessed: 150,
        lastSyncRecordsSuccessful: 148,
        lastSyncRecordsSkipped: 1,
        lastSyncRecordsFailed: 1,
        isActive: true,
        isEnabled: true,
        supportedContentTypes: JSON.stringify(['text/html', 'text/plain', 'application/pdf']),
        supportedOperations: JSON.stringify(['read', 'list']),
        securityClassification: 'Unclassified',
        accessLevel: 'Standard',
        configuredBy: 'dan-demont-user-id',
      },
    });

    // Create test sync log
    const testSyncLog = await prisma.km_sync_logs.create({
      data: {
        knowledgeSourceId: testKnowledgeSource.id,
        syncType: 'Incremental',
        status: 'Completed',
        startedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        completedAt: new Date(Date.now() - 58 * 60 * 1000), // 58 minutes ago
        duration: 120, // 2 minutes
        recordsProcessed: 15,
        recordsSuccessful: 14,
        recordsSkipped: 0,
        recordsFailed: 1,
        recordsCreated: 10,
        recordsUpdated: 4,
        recordsDeleted: 0,
        triggerType: 'Scheduled',
      },
    });

    // Create test tags associations
    await prisma.km_document_tags.create({
      data: {
        documentId: testDocument.id,
        tagId: systemTag.id,
        addedBy: 'dan-demont-user-id',
      },
    });

    await prisma.km_document_tags.create({
      data: {
        documentId: testDocument.id,
        categoryId: techCategory.id,
        addedBy: 'dan-demont-user-id',
      },
    });

    await prisma.km_fact_tags.create({
      data: {
        factId: testFact.id,
        tagId: systemTag.id,
        addedBy: 'dan-demont-user-id',
      },
    });

    console.log('✅ Knowledge Management seed data created successfully!');
    console.log(`📄 Created ${1} test document`);
    console.log(`💬 Created ${1} test communication`);
    console.log(`🧠 Created ${1} test fact`);
    console.log(`📁 Created ${2} test categories`);
    console.log(`🏷️ Created ${2} test tags`);
    console.log(`🔗 Created ${1} test knowledge source`);
    console.log(`📊 Created ${1} test sync log`);

  } catch (error) {
    console.error('❌ Error seeding Knowledge Management data:', error);
    throw error;
  }
}

module.exports = { seedKnowledgeManagement };

// Run if called directly
if (require.main === module) {
  seedKnowledgeManagement()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}