-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "SecurityClearanceLevel" AS ENUM ('None', 'Public Trust', 'Confidential', 'Secret', 'Top Secret', 'TS/SCI');
CREATE TYPE "InvitationStatus" AS ENUM ('Not Invited', 'Invited', 'Invitation Sent', 'Invitation Expired', 'Invitation Accepted', 'Invitation Declined');
CREATE TYPE "AccountStatus" AS ENUM ('Pending', 'Active', 'Inactive', 'Suspended', 'Locked', 'Expired', 'Deactivated');
CREATE TYPE "TwoFactorMethod" AS ENUM ('None', 'SMS', 'Email', 'TOTP', 'Hardware Token', 'Biometric');
CREATE TYPE "AffiliationType" AS ENUM ('Employee', 'Contractor', 'Consultant', 'Vendor', 'Partner', 'Volunteer', 'Intern');
CREATE TYPE "EmploymentStatus" AS ENUM ('Active', 'On Leave', 'Terminated', 'Resigned', 'Retired', 'Contract Ended', 'Transferred');
CREATE TYPE "ContractType" AS ENUM ('Full Time', 'Part Time', 'Contract', 'Temporary', 'Seasonal', 'Project Based');
CREATE TYPE "AccessLevel" AS ENUM ('Visitor', 'Standard', 'Elevated', 'Administrative', 'Executive');
CREATE TYPE "SeparationReason" AS ENUM ('Voluntary Resignation', 'Involuntary Termination', 'End of Contract', 'Retirement', 'Transfer', 'Layoff', 'Performance', 'Misconduct');
CREATE TYPE "OrganizationType" AS ENUM ('Government Agency', 'Prime Contractor', 'Subcontractor', 'Vendor');
CREATE TYPE "TransitionStatus" AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled', 'Delayed');
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Critical', 'Urgent', 'Normal');
CREATE TYPE "RiskLevel" AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE "TransitionRole" AS ENUM ('Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer');
CREATE TYPE "SecurityStatus" AS ENUM ('Pending', 'In Process', 'Interim Cleared', 'Cleared', 'Denied', 'Revoked');
CREATE TYPE "PlatformAccess" AS ENUM ('Disabled', 'Read Only', 'Standard', 'Full Access');
CREATE TYPE "MilestoneStatus" AS ENUM ('Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled', 'Overdue');
CREATE TYPE "TaskStatus" AS ENUM ('Not Started', 'Assigned', 'In Progress', 'On Hold', 'Blocked', 'Under Review', 'Completed', 'Cancelled', 'Overdue');
CREATE TYPE "CommentType" AS ENUM ('General', 'Progress Update', 'Blocker', 'Question', 'Decision', 'Status Change');
CREATE TYPE "CommunicationType" AS ENUM ('Email', 'Chat', 'SMS', 'Notification', 'System Message', 'Voice Call', 'Video Call');
CREATE TYPE "CommunicationDirection" AS ENUM ('Inbound', 'Outbound', 'Internal');
CREATE TYPE "CommunicationPlatform" AS ENUM ('TIP Internal', 'Microsoft Teams', 'Slack', 'Email', 'Zoom', 'Discord', 'WhatsApp', 'SMS Gateway');
CREATE TYPE "ContentType" AS ENUM ('Text', 'HTML', 'Markdown', 'Rich Text', 'JSON', 'Table', 'List', 'Code', 'Metadata', 'Header', 'Footer');
CREATE TYPE "RelatedEntityType" AS ENUM ('Task', 'Milestone', 'Artifact', 'Event', 'User', 'Transition');
CREATE TYPE "CommStatus" AS ENUM ('Pending', 'Delivered', 'Failed', 'Bounced', 'Spam', 'Quarantined');
CREATE TYPE "EventType" AS ENUM ('Meeting', 'Milestone Deadline', 'Task Due Date', 'Review Session', 'Training', 'Presentation', 'Conference Call', 'Site Visit', 'Other');
CREATE TYPE "EventStatus" AS ENUM ('Scheduled', 'Confirmed', 'Tentative', 'Cancelled', 'Completed', 'In Progress', 'Postponed');
CREATE TYPE "EventVisibility" AS ENUM ('Public', 'Internal', 'Private', 'Confidential');
CREATE TYPE "ExternalPlatform" AS ENUM ('Microsoft Outlook', 'Microsoft Teams', 'Google Calendar', 'Zoom', 'WebEx', 'Other');
CREATE TYPE "SyncStatus" AS ENUM ('Not Synced', 'Synced', 'Sync Pending', 'Sync Failed', 'Sync Conflict');
CREATE TYPE "NotificationType" AS ENUM ('Task Assignment', 'Task Due', 'Task Completed', 'Milestone Due', 'Artifact Submitted', 'Artifact Approved', 'Meeting Reminder', 'Status Change', 'Mention', 'System Alert');
CREATE TYPE "NotificationFrequency" AS ENUM ('Immediate', 'Hourly Digest', 'Daily Digest', 'Weekly Digest', 'Never');
CREATE TYPE "ArtifactType" AS ENUM ('Documentation', 'Source Code', 'Configuration', 'Database Export', 'Training Materials', 'Contract Deliverable', 'Other');
CREATE TYPE "ArtifactStatus" AS ENUM ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Superseded', 'Archived');
CREATE TYPE "SecurityClassification" AS ENUM ('Unclassified', 'Confidential', 'Secret', 'Top Secret');
CREATE TYPE "AuditAction" AS ENUM ('Created', 'Updated', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Downloaded', 'Deleted', 'Restored', 'Status Changed');
CREATE TYPE "QueryFeedback" AS ENUM ('Helpful', 'Partially Helpful', 'Not Helpful', 'Incorrect');
CREATE TYPE "ReviewType" AS ENUM ('Initial Review', 'Revision Review', 'Final Review', 'Compliance Review', 'Security Review', 'Technical Review', 'Content Review');
CREATE TYPE "ReviewStatus" AS ENUM ('Pending', 'In Progress', 'Completed', 'Approved', 'Rejected', 'Needs Revision', 'On Hold', 'Escalated');
CREATE TYPE "PublishingDecision" AS ENUM ('Approved for Publishing', 'Rejected', 'Approved with Conditions', 'Needs Revision', 'Under Review');
CREATE TYPE "AssessmentType" AS ENUM ('Initial Assessment', 'Progress Review', 'Milestone Assessment', 'Final Assessment', 'Certification Exam', 'Competency Check', 'Peer Review');
CREATE TYPE "AssessmentCategory" AS ENUM ('Technical Skills', 'Domain Knowledge', 'Process Understanding', 'Tool Proficiency', 'Security Awareness', 'Communication Skills', 'Leadership Skills', 'Project Management');
CREATE TYPE "AssessmentMethod" AS ENUM ('Written Test', 'Practical Exercise', 'Code Review', 'Presentation', 'Interview', 'Observation', 'Peer Evaluation', 'Self Assessment', 'Portfolio Review');
CREATE TYPE "ProficiencyLevel" AS ENUM ('None', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert', 'Master');
CREATE TYPE "CertificationStatus" AS ENUM ('Not Required', 'Required', 'In Progress', 'Scheduled', 'Completed', 'Failed', 'Expired', 'Renewed');
CREATE TYPE "OverallReadiness" AS ENUM ('Not Ready', 'Limited Ready', 'Partially Ready', 'Mostly Ready', 'Fully Ready', 'Exceeds Requirements');
CREATE TYPE "TrendDirection" AS ENUM ('Improving', 'Stable', 'Declining', 'Rapid Improvement', 'Stagnant');
CREATE TYPE "LearningStyle" AS ENUM ('Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed');

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "preferredName" VARCHAR(100),
    "suffix" VARCHAR(20),
    "title" VARCHAR(100),
    "primaryEmail" VARCHAR(255) NOT NULL,
    "alternateEmail" VARCHAR(255),
    "workPhone" VARCHAR(20),
    "mobilePhone" VARCHAR(20),
    "personalPhone" VARCHAR(20),
    "profileImageUrl" VARCHAR(500),
    "biography" TEXT,
    "skills" JSONB,
    "certifications" JSONB,
    "education" JSONB,
    "workLocation" VARCHAR(255),
    "timeZone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
    "dateOfBirth" DATE,
    "securityClearanceLevel" "SecurityClearanceLevel",
    "clearanceExpirationDate" DATE,
    "emergencyContactName" VARCHAR(255),
    "emergencyContactPhone" VARCHAR(20),
    "emergencyContactRelation" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "privacySettings" JSONB,
    "professionalSummary" TEXT,
    "linkedInProfile" VARCHAR(500),
    "githubProfile" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'Not Invited',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "invitationToken" VARCHAR(255),
    "invitationExpiresAt" TIMESTAMP(3),
    "confirmationToken" VARCHAR(255),
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'Pending',
    "statusReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" "TwoFactorMethod",
    "backupCodes" JSONB,
    "sessionTimeout" INTEGER,
    "allowedIpRanges" JSONB,
    "deviceFingerprints" JSONB,
    "securityNotifications" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyHash" VARCHAR(255),
    "apiKeyExpiresAt" TIMESTAMP(3),
    "roles" JSONB NOT NULL DEFAULT '[]',
    "permissions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_organization_affiliations" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobTitle" VARCHAR(255),
    "department" VARCHAR(255),
    "employeeId" VARCHAR(100),
    "workLocation" VARCHAR(255),
    "managerId" TEXT,
    "affiliationType" "AffiliationType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "securityClearanceRequired" "SecurityClearanceLevel",
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "payrollNumber" VARCHAR(100),
    "costCenter" VARCHAR(100),
    "workSchedule" JSONB,
    "compensationLevel" VARCHAR(50),
    "benefitsEligible" BOOLEAN NOT NULL DEFAULT false,
    "contractType" "ContractType",
    "contractNumber" VARCHAR(100),
    "billableHours" DECIMAL(5,2),
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'Standard',
    "facilities" JSONB,
    "equipment" JSONB,
    "notes" TEXT,
    "separationReason" "SeparationReason",
    "separationNotes" TEXT,
    "isEligibleForRehire" BOOLEAN,
    "exitInterviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewDate" DATE,
    "finalWorkDate" DATE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_organization_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "abbreviation" VARCHAR(50),
    "type" "OrganizationType" NOT NULL,
    "parentId" TEXT,
    "contactEmail" VARCHAR(255),
    "securityOfficerEmail" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transitions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contractName" VARCHAR(255) NOT NULL,
    "contractNumber" VARCHAR(100) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "TransitionStatus" NOT NULL DEFAULT 'Planning',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "currentPhase" VARCHAR(100),
    "progressPercentage" SMALLINT NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'Low',
    "riskFactors" JSONB,
    "budget" DECIMAL(15,2),
    "actualCost" DECIMAL(15,2),
    "clientOrganization" VARCHAR(255),
    "contractorOrganization" VARCHAR(255),
    "keyPersonnel" JSONB,
    "securityRequirements" JSONB,
    "complianceRequirements" JSONB,
    "deliverableRequirements" JSONB,
    "communicationPlan" JSONB,
    "escalationMatrix" JSONB,
    "businessImpact" TEXT,
    "technicalComplexity" TEXT,
    "stakeholderCount" SMALLINT,
    "documentsRequired" JSONB,
    "trainingRequired" BOOLEAN NOT NULL DEFAULT false,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "clearanceRequired" "SecurityClearanceLevel",
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transition_users" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TransitionRole" NOT NULL,
    "securityStatus" "SecurityStatus" NOT NULL DEFAULT 'Pending',
    "platformAccess" "PlatformAccess" NOT NULL DEFAULT 'Disabled',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "accessNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transition_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'Not Started',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "assignedTo" TEXT,
    "percentComplete" SMALLINT NOT NULL DEFAULT 0,
    "dependencies" JSONB,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "parentTaskId" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'Not Started',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "assignedTo" TEXT,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "estimatedHours" DECIMAL(5,2),
    "actualHours" DECIMAL(5,2),
    "percentComplete" SMALLINT NOT NULL DEFAULT 0,
    "tags" JSONB,
    "dependencies" JSONB,
    "blockers" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "commentType" "CommentType" NOT NULL DEFAULT 'General',
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "mentionedUsers" JSONB,
    "attachments" JSONB,
    "editedAt" TIMESTAMP(3),
    "editedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "communicationType" "CommunicationType" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "platform" "CommunicationPlatform" NOT NULL,
    "externalId" VARCHAR(255),
    "threadId" VARCHAR(255),
    "fromUserId" TEXT,
    "fromEmail" VARCHAR(255),
    "fromName" VARCHAR(255),
    "toUsers" JSONB NOT NULL,
    "toEmails" JSONB NOT NULL,
    "ccEmails" JSONB,
    "bccEmails" JSONB,
    "subject" VARCHAR(500),
    "content" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL DEFAULT 'Text',
    "attachments" JSONB,
    "priority" "Priority" NOT NULL DEFAULT 'Normal',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readBy" TEXT,
    "relatedEntityType" "RelatedEntityType",
    "relatedEntityId" TEXT,
    "status" "CommStatus" NOT NULL DEFAULT 'Delivered',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "timeZone" VARCHAR(50) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(500),
    "meetingUrl" VARCHAR(500),
    "meetingId" VARCHAR(100),
    "organizerId" TEXT NOT NULL,
    "attendees" JSONB NOT NULL,
    "requiredAttendees" JSONB,
    "optionalAttendees" JSONB,
    "recurrenceRule" TEXT,
    "recurrenceExceptions" JSONB,
    "reminderMinutes" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'Scheduled',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'Internal',
    "category" VARCHAR(100),
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "relatedEntityType" "RelatedEntityType",
    "relatedEntityId" TEXT,
    "externalCalendarId" VARCHAR(255),
    "externalPlatform" "ExternalPlatform",
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'Not Synced',
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transitionId" TEXT,
    "notificationType" "NotificationType" NOT NULL,
    "channelEmail" BOOLEAN NOT NULL DEFAULT true,
    "channelInApp" BOOLEAN NOT NULL DEFAULT true,
    "channelSms" BOOLEAN NOT NULL DEFAULT false,
    "channelTeams" BOOLEAN NOT NULL DEFAULT false,
    "channelSlack" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "NotificationFrequency" NOT NULL DEFAULT 'Immediate',
    "quietHoursStart" TIME,
    "quietHoursEnd" TIME,
    "timeZone" VARCHAR(50) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" "Priority" NOT NULL DEFAULT 'Normal',
    "customSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ArtifactType" NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'Draft',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvalComments" TEXT,
    "parentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "securityClassification" "SecurityClassification" NOT NULL DEFAULT 'Unclassified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_audit_logs" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousValue" JSONB,
    "newValue" JSONB,
    "comments" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" VARCHAR(255),

    CONSTRAINT "artifact_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "pageNumber" INTEGER,
    "sectionTitle" VARCHAR(255),
    "contentType" "ContentType" NOT NULL DEFAULT 'Text',
    "processingModel" VARCHAR(100) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_embeddings" (
    "id" TEXT NOT NULL,
    "knowledgeChunkId" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embeddingModel" VARCHAR(100) NOT NULL,
    "modelVersion" VARCHAR(50) NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "magnitude" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_sessions" (
    "id" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "queryEmbedding" vector(1536) NOT NULL,
    "response" TEXT NOT NULL,
    "sourceChunks" JSONB NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "feedback" "QueryFeedback",
    "feedbackComments" TEXT,
    "ipAddress" TEXT,
    "sessionId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_quality_reviews" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewType" "ReviewType" NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'Pending',
    "overallScore" DECIMAL(3,2),
    "completenessScore" DECIMAL(3,2),
    "accuracyScore" DECIMAL(3,2),
    "clarityScore" DECIMAL(3,2),
    "usabilityScore" DECIMAL(3,2),
    "complianceScore" DECIMAL(3,2),
    "securityScore" DECIMAL(3,2),
    "qualityChecklist" JSONB,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "recommendations" TEXT,
    "correctiveActions" TEXT,
    "publishingDecision" "PublishingDecision",
    "publishingNotes" TEXT,
    "reviewDuration" INTEGER,
    "reviewCriteria" JSONB NOT NULL,
    "isSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "signOffBy" TEXT,
    "signOffAt" TIMESTAMP(3),
    "requiredActions" JSONB,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "nextReviewDate" TIMESTAMP(3),
    "reviewStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_quality_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_proficiency_assessments" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentCategory" "AssessmentCategory" NOT NULL,
    "skillArea" VARCHAR(255) NOT NULL,
    "assessorId" TEXT NOT NULL,
    "assessmentMethod" "AssessmentMethod" NOT NULL,
    "currentLevel" "ProficiencyLevel" NOT NULL,
    "targetLevel" "ProficiencyLevel" NOT NULL,
    "score" DECIMAL(5,2),
    "maxScore" DECIMAL(5,2),
    "percentage" DECIMAL(5,2),
    "assessmentNotes" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "knowledgeGaps" JSONB,
    "recommendedTraining" TEXT,
    "learningResources" JSONB,
    "practiceAreas" TEXT,
    "mentorshipNeeds" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isPassing" BOOLEAN,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "certificationStatus" "CertificationStatus",
    "certificationDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "reassessmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "nextAssessmentDate" TIMESTAMP(3),
    "progressSinceLastAssessment" TEXT,
    "overallReadiness" "OverallReadiness",
    "readinessNotes" TEXT,
    "riskFactors" JSONB,
    "mitigationPlans" TEXT,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_proficiency_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proficiency_progress_tracking" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "skillArea" VARCHAR(255) NOT NULL,
    "baselineAssessmentId" TEXT NOT NULL,
    "currentAssessmentId" TEXT NOT NULL,
    "baselineLevel" "ProficiencyLevel" NOT NULL,
    "currentLevel" "ProficiencyLevel" NOT NULL,
    "targetLevel" "ProficiencyLevel" NOT NULL,
    "progressPercentage" DECIMAL(5,2) NOT NULL,
    "learningVelocity" DECIMAL(5,2),
    "totalAssessments" INTEGER NOT NULL DEFAULT 1,
    "averageScore" DECIMAL(5,2),
    "trendDirection" "TrendDirection" NOT NULL,
    "lastImprovement" TIMESTAMP(3),
    "plateauPeriod" INTEGER,
    "strugglingIndicators" JSONB,
    "interventionsApplied" JSONB,
    "learningStyle" "LearningStyle",
    "motivationFactors" JSONB,
    "blockers" TEXT,
    "supportNeeds" TEXT,
    "projectedCompletionDate" TIMESTAMP(3),
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'Low',
    "confidenceInterval" DECIMAL(3,2),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proficiency_progress_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "validationSchema" JSONB,
    "modifiedBy" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_primaryEmail_key" ON "persons"("primaryEmail");
CREATE INDEX "idx_persons_primary_email" ON "persons"("primaryEmail");
CREATE INDEX "idx_persons_full_name" ON "persons"("lastName", "firstName");
CREATE INDEX "idx_persons_is_active" ON "persons"("isActive");
CREATE INDEX "idx_persons_security_clearance" ON "persons"("securityClearanceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "users_personId_key" ON "users"("personId");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_keycloakId_key" ON "users"("keycloakId");
CREATE INDEX "idx_users_person_id" ON "users"("personId");
CREATE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_users_keycloak_id" ON "users"("keycloakId");
CREATE INDEX "idx_users_invitation_status" ON "users"("invitationStatus");
CREATE INDEX "idx_users_account_status" ON "users"("accountStatus");
CREATE INDEX "idx_users_email_verified" ON "users"("emailVerified");
CREATE INDEX "idx_users_invitation_token" ON "users"("invitationToken");
CREATE INDEX "idx_users_confirmation_token" ON "users"("confirmationToken");
CREATE INDEX "idx_users_last_login" ON "users"("lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "person_organization_affiliations_personId_organizationId_startDate_key" ON "person_organization_affiliations"("personId", "organizationId", "startDate");
CREATE INDEX "idx_person_org_person_id" ON "person_organization_affiliations"("personId");
CREATE INDEX "idx_person_org_organization_id" ON "person_organization_affiliations"("organizationId");
CREATE INDEX "idx_person_org_is_active" ON "person_organization_affiliations"("isActive");
CREATE INDEX "idx_person_org_is_primary" ON "person_organization_affiliations"("isPrimary");
CREATE INDEX "idx_person_org_start_date" ON "person_organization_affiliations"("startDate");
CREATE INDEX "idx_person_org_end_date" ON "person_organization_affiliations"("endDate");
CREATE INDEX "idx_person_org_employment_status" ON "person_organization_affiliations"("employmentStatus");

-- CreateIndex
CREATE INDEX "idx_organizations_type" ON "organizations"("type");
CREATE INDEX "idx_organizations_parent_id" ON "organizations"("parentId");

-- CreateIndex
CREATE INDEX "idx_transitions_organization_id" ON "transitions"("organizationId");
CREATE INDEX "idx_transitions_status" ON "transitions"("status");
CREATE INDEX "idx_transitions_start_date" ON "transitions"("startDate");
CREATE INDEX "idx_transitions_end_date" ON "transitions"("endDate");
CREATE INDEX "idx_transitions_priority" ON "transitions"("priority");
CREATE INDEX "idx_transitions_risk_level" ON "transitions"("riskLevel");
CREATE INDEX "idx_transitions_contract_number" ON "transitions"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "transition_users_transitionId_userId_key" ON "transition_users"("transitionId", "userId");
CREATE INDEX "idx_transition_users_transition_id" ON "transition_users"("transitionId");
CREATE INDEX "idx_transition_users_user_id" ON "transition_users"("userId");
CREATE INDEX "idx_transition_users_security_status" ON "transition_users"("securityStatus");
CREATE INDEX "idx_transition_users_platform_access" ON "transition_users"("platformAccess");

-- CreateIndex
CREATE INDEX "idx_milestones_transition_id" ON "milestones"("transitionId");
CREATE INDEX "idx_milestones_due_date" ON "milestones"("dueDate");
CREATE INDEX "idx_milestones_status" ON "milestones"("status");
CREATE INDEX "idx_milestones_assigned_to" ON "milestones"("assignedTo");

-- CreateIndex
CREATE INDEX "idx_tasks_transition_id" ON "tasks"("transitionId");
CREATE INDEX "idx_tasks_milestone_id" ON "tasks"("milestoneId");
CREATE INDEX "idx_tasks_assigned_to" ON "tasks"("assignedTo");
CREATE INDEX "idx_tasks_assigned_by" ON "tasks"("assignedBy");
CREATE INDEX "idx_tasks_status" ON "tasks"("status");
CREATE INDEX "idx_tasks_due_date" ON "tasks"("dueDate");
CREATE INDEX "idx_tasks_parent_task_id" ON "tasks"("parentTaskId");
CREATE INDEX "idx_tasks_priority_status" ON "tasks"("priority", "status");

-- CreateIndex
CREATE INDEX "idx_task_comments_task_id" ON "task_comments"("taskId");
CREATE INDEX "idx_task_comments_author_id" ON "task_comments"("authorId");
CREATE INDEX "idx_task_comments_created_at" ON "task_comments"("createdAt");

-- CreateIndex
CREATE INDEX "idx_communications_transition_id" ON "communications"("transitionId");
CREATE INDEX "idx_communications_from_user_id" ON "communications"("fromUserId");
CREATE INDEX "idx_communications_sent_at" ON "communications"("sentAt");
CREATE INDEX "idx_communications_type_platform" ON "communications"("communicationType", "platform");
CREATE INDEX "idx_communications_thread_id" ON "communications"("threadId");
CREATE INDEX "idx_communications_external_id" ON "communications"("externalId");
CREATE INDEX "idx_communications_related_entity" ON "communications"("relatedEntityType", "relatedEntityId");
CREATE INDEX "idx_communications_status" ON "communications"("status");

-- CreateIndex
CREATE INDEX "idx_calendar_events_transition_id" ON "calendar_events"("transitionId");
CREATE INDEX "idx_calendar_events_organizer_id" ON "calendar_events"("organizerId");
CREATE INDEX "idx_calendar_events_start_time" ON "calendar_events"("startDateTime");
CREATE INDEX "idx_calendar_events_end_time" ON "calendar_events"("endDateTime");
CREATE INDEX "idx_calendar_events_event_type" ON "calendar_events"("eventType");
CREATE INDEX "idx_calendar_events_status" ON "calendar_events"("status");
CREATE INDEX "idx_calendar_events_external_id" ON "calendar_events"("externalCalendarId");
CREATE INDEX "idx_calendar_events_related_entity" ON "calendar_events"("relatedEntityType", "relatedEntityId");
CREATE INDEX "idx_calendar_events_sync_status" ON "calendar_events"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_transitionId_notificationType_key" ON "notification_preferences"("userId", "transitionId", "notificationType");
CREATE INDEX "idx_notification_prefs_user_id" ON "notification_preferences"("userId");
CREATE INDEX "idx_notification_prefs_transition_id" ON "notification_preferences"("transitionId");
CREATE INDEX "idx_notification_prefs_type" ON "notification_preferences"("notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_transitionId_name_version_key" ON "artifacts"("transitionId", "name", "version");
CREATE INDEX "idx_artifacts_transition_id" ON "artifacts"("transitionId");
CREATE INDEX "idx_artifacts_status" ON "artifacts"("status");
CREATE INDEX "idx_artifacts_type" ON "artifacts"("type");
CREATE INDEX "idx_artifacts_submitted_by" ON "artifacts"("submittedBy");
CREATE INDEX "idx_artifacts_checksum" ON "artifacts"("checksum");

-- CreateIndex
CREATE INDEX "idx_artifact_audit_artifact_id" ON "artifact_audit_logs"("artifactId");
CREATE INDEX "idx_artifact_audit_transition_id" ON "artifact_audit_logs"("transitionId");
CREATE INDEX "idx_artifact_audit_performed_at" ON "artifact_audit_logs"("performedAt");
CREATE INDEX "idx_artifact_audit_performed_by" ON "artifact_audit_logs"("performedBy");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_artifactId_chunkIndex_key" ON "knowledge_chunks"("artifactId", "chunkIndex");
CREATE INDEX "idx_knowledge_chunks_artifact_id" ON "knowledge_chunks"("artifactId");
CREATE INDEX "idx_knowledge_chunks_transition_id" ON "knowledge_chunks"("transitionId");
CREATE INDEX "idx_knowledge_chunks_content_hash" ON "knowledge_chunks"("contentHash");
CREATE INDEX "idx_knowledge_chunks_is_active" ON "knowledge_chunks"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "vector_embeddings_knowledgeChunkId_key" ON "vector_embeddings"("knowledgeChunkId");
CREATE INDEX "idx_vector_embeddings_chunk_id" ON "vector_embeddings"("knowledgeChunkId");

-- CreateIndex
CREATE INDEX "idx_query_sessions_transition_id" ON "query_sessions"("transitionId");
CREATE INDEX "idx_query_sessions_user_id" ON "query_sessions"("userId");
CREATE INDEX "idx_query_sessions_created_at" ON "query_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "idx_quality_reviews_artifact_id" ON "deliverable_quality_reviews"("artifactId");
CREATE INDEX "idx_quality_reviews_transition_id" ON "deliverable_quality_reviews"("transitionId");
CREATE INDEX "idx_quality_reviews_reviewer_id" ON "deliverable_quality_reviews"("reviewerId");
CREATE INDEX "idx_quality_reviews_status" ON "deliverable_quality_reviews"("reviewStatus");
CREATE INDEX "idx_quality_reviews_overall_score" ON "deliverable_quality_reviews"("overallScore");
CREATE INDEX "idx_quality_reviews_publishing_decision" ON "deliverable_quality_reviews"("publishingDecision");
CREATE INDEX "idx_quality_reviews_follow_up" ON "deliverable_quality_reviews"("followUpRequired", "nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_proficiency_assessments_contractorId_transitionId_skillArea_assessmentDate_key" ON "contractor_proficiency_assessments"("contractorId", "transitionId", "skillArea", "assessmentDate");
CREATE INDEX "idx_proficiency_contractor_id" ON "contractor_proficiency_assessments"("contractorId");
CREATE INDEX "idx_proficiency_transition_id" ON "contractor_proficiency_assessments"("transitionId");
CREATE INDEX "idx_proficiency_assessor_id" ON "contractor_proficiency_assessments"("assessorId");
CREATE INDEX "idx_proficiency_category_skill" ON "contractor_proficiency_assessments"("assessmentCategory", "skillArea");
CREATE INDEX "idx_proficiency_current_level" ON "contractor_proficiency_assessments"("currentLevel");
CREATE INDEX "idx_proficiency_overall_readiness" ON "contractor_proficiency_assessments"("overallReadiness");
CREATE INDEX "idx_proficiency_certification_status" ON "contractor_proficiency_assessments"("certificationStatus");
CREATE INDEX "idx_proficiency_reassessment" ON "contractor_proficiency_assessments"("reassessmentRequired", "nextAssessmentDate");
CREATE INDEX "idx_proficiency_assessment_date" ON "contractor_proficiency_assessments"("assessmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "proficiency_progress_tracking_contractorId_transitionId_skillArea_key" ON "proficiency_progress_tracking"("contractorId", "transitionId", "skillArea");
CREATE INDEX "idx_progress_tracking_contractor_id" ON "proficiency_progress_tracking"("contractorId");
CREATE INDEX "idx_progress_tracking_transition_id" ON "proficiency_progress_tracking"("transitionId");
CREATE INDEX "idx_progress_tracking_skill_area" ON "proficiency_progress_tracking"("skillArea");
CREATE INDEX "idx_progress_tracking_risk_level" ON "proficiency_progress_tracking"("riskLevel");
CREATE INDEX "idx_progress_tracking_trend" ON "proficiency_progress_tracking"("trendDirection");
CREATE INDEX "idx_progress_tracking_completion_date" ON "proficiency_progress_tracking"("projectedCompletionDate");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
CREATE INDEX "idx_system_settings_category" ON "system_settings"("category");
CREATE INDEX "idx_system_settings_is_public" ON "system_settings"("isPublic");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_deactivatedBy_fkey" FOREIGN KEY ("deactivatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_organization_affiliations" ADD CONSTRAINT "person_organization_affiliations_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "person_organization_affiliations" ADD CONSTRAINT "person_organization_affiliations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "person_organization_affiliations" ADD CONSTRAINT "person_organization_affiliations_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "person_organization_affiliations" ADD CONSTRAINT "person_organization_affiliations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transitions" ADD CONSTRAINT "transitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_users" ADD CONSTRAINT "transition_users_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transition_users" ADD CONSTRAINT "transition_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transition_users" ADD CONSTRAINT "transition_users_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_readBy_fkey" FOREIGN KEY ("readBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_audit_logs" ADD CONSTRAINT "artifact_audit_logs_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifact_audit_logs" ADD CONSTRAINT "artifact_audit_logs_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifact_audit_logs" ADD CONSTRAINT "artifact_audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_embeddings" ADD CONSTRAINT "vector_embeddings_knowledgeChunkId_fkey" FOREIGN KEY ("knowledgeChunkId") REFERENCES "knowledge_chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_sessions" ADD CONSTRAINT "query_sessions_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable_quality_reviews" ADD CONSTRAINT "deliverable_quality_reviews_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_quality_reviews" ADD CONSTRAINT "deliverable_quality_reviews_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_quality_reviews" ADD CONSTRAINT "deliverable_quality_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_quality_reviews" ADD CONSTRAINT "deliverable_quality_reviews_signOffBy_fkey" FOREIGN KEY ("signOffBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_proficiency_assessments" ADD CONSTRAINT "contractor_proficiency_assessments_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contractor_proficiency_assessments" ADD CONSTRAINT "contractor_proficiency_assessments_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contractor_proficiency_assessments" ADD CONSTRAINT "contractor_proficiency_assessments_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contractor_proficiency_assessments" ADD CONSTRAINT "contractor_proficiency_assessments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proficiency_progress_tracking" ADD CONSTRAINT "proficiency_progress_tracking_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proficiency_progress_tracking" ADD CONSTRAINT "proficiency_progress_tracking_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "transitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proficiency_progress_tracking" ADD CONSTRAINT "proficiency_progress_tracking_baselineAssessmentId_fkey" FOREIGN KEY ("baselineAssessmentId") REFERENCES "contractor_proficiency_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proficiency_progress_tracking" ADD CONSTRAINT "proficiency_progress_tracking_currentAssessmentId_fkey" FOREIGN KEY ("currentAssessmentId") REFERENCES "contractor_proficiency_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_modifiedBy_fkey" FOREIGN KEY ("modifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;