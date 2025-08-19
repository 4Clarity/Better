# Transition Intelligence Platform (TIP) - Comprehensive Data Schema

**Document Version:** 1.0  
**Author:** System Architect  
**Last Updated:** 2025-08-18  
**Status:** Architecture Blueprint

---

## Executive Summary

This document defines the comprehensive data architecture for the Transition Intelligence Platform (TIP), a government contract transition management system. The schema supports role-based access control, audit trails, document management, knowledge capture, and AI-powered question answering capabilities.

### Key Design Principles

- **Security First**: Role-based access control with explicit clearance requirements
- **Audit Compliance**: Immutable audit trails for all actions
- **Scalable Architecture**: Normalized design supporting enterprise growth
- **Data Integrity**: Strong referential integrity with proper constraints
- **AI Integration**: Vector storage capabilities for knowledge retrieval

---

## Entity Relationship Overview

```
                              Person Identity & Authentication
                         Persons ←→ Users (Keycloak) ←→ PersonOrganizationAffiliations
                            ↓         ↓                        ↓
                                 Organizations ←→ Transitions ←→ TransitionUsers
                                     ↓              ↓              ↓
                                                Communications    ContractorProficiencyAssessments
                                                    ↓              ↓
                                              CalendarEvents    ProficiencyProgressTracking
                                                    ↓
                                             Milestones ←→ Tasks ←→ TaskComments
                                                ↓         ↓
                                          NotificationPreferences
                                                ↓
                                           Artifacts ←→ DeliverableQualityReviews
                                                ↓         ↓
                                           ArtifactAuditLog
                                                ↓
                                         KnowledgeChunks ←→ VectorEmbeddings
                                                ↓              ↓
                                          QuerySessions    SystemSettings
```

---

## Core Entities

### 1. Persons

**Purpose**: Core person entity containing individual profile details, contact information, and personal attributes independent of organizational affiliation.

**Business Context**: Represents real individuals who may work for different organizations over time, maintaining continuity of personal information and professional history.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique person identifier |
| `firstName` | VARCHAR(100) | NOT NULL | Person's first name |
| `middleName` | VARCHAR(100) | NULLABLE | Person's middle name or initial |
| `lastName` | VARCHAR(100) | NOT NULL | Person's last name |
| `preferredName` | VARCHAR(100) | NULLABLE | Preferred display name |
| `suffix` | VARCHAR(20) | NULLABLE | Name suffix (Jr., Sr., III, etc.) |
| `title` | VARCHAR(100) | NULLABLE | Professional title |
| `primaryEmail` | VARCHAR(255) | NOT NULL, UNIQUE | Primary email address |
| `alternateEmail` | VARCHAR(255) | NULLABLE | Secondary email address |
| `workPhone` | VARCHAR(20) | NULLABLE | Work phone number |
| `mobilePhone` | VARCHAR(20) | NULLABLE | Mobile phone number |
| `personalPhone` | VARCHAR(20) | NULLABLE | Personal phone number |
| `profileImageUrl` | VARCHAR(500) | NULLABLE | Profile photo URL |
| `biography` | TEXT | NULLABLE | Professional biography |
| `skills` | JSONB | NULLABLE | Array of professional skills |
| `certifications` | JSONB | NULLABLE | Professional certifications |
| `education` | JSONB | NULLABLE | Educational background |
| `workLocation` | VARCHAR(255) | NULLABLE | Primary work location |
| `timeZone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | Person's timezone |
| `preferredLanguage` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | Language preference |
| `dateOfBirth` | DATE | NULLABLE | Date of birth (for age verification) |
| `securityClearanceLevel` | ENUM | NULLABLE | Current security clearance |
| `clearanceExpirationDate` | DATE | NULLABLE | Clearance expiration date |
| `emergencyContactName` | VARCHAR(255) | NULLABLE | Emergency contact person |
| `emergencyContactPhone` | VARCHAR(20) | NULLABLE | Emergency contact phone |
| `emergencyContactRelation` | VARCHAR(100) | NULLABLE | Relationship to emergency contact |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Person active status |
| `privacySettings` | JSONB | NULLABLE | Privacy and visibility preferences |
| `professionalSummary` | TEXT | NULLABLE | Professional summary/objective |
| `linkedInProfile` | VARCHAR(500) | NULLABLE | LinkedIn profile URL |
| `githubProfile` | VARCHAR(500) | NULLABLE | GitHub profile URL |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |
| `archivedAt` | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes**:
- `idx_persons_primary_email` (primaryEmail)
- `idx_persons_full_name` (lastName, firstName)
- `idx_persons_is_active` (isActive)
- `idx_persons_security_clearance` (securityClearanceLevel)

**Enums**:
- `SecurityClearanceLevel`: 'None', 'Public Trust', 'Confidential', 'Secret', 'Top Secret', 'TS/SCI'

---

### 2. Users

**Purpose**: Authentication and authorization entity linked to Keycloak for system access control, invitation management, and account status tracking.

**Business Context**: Manages user accounts, invitation workflows, email verification, and system access permissions while linking to person profiles.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique user identifier (matches Keycloak user ID) |
| `personId` | UUID | NOT NULL, FK → Persons | Associated person profile |
| `username` | VARCHAR(100) | NOT NULL, UNIQUE | Unique username for login |
| `keycloakId` | UUID | NOT NULL, UNIQUE | Keycloak user identifier |
| `invitationStatus` | ENUM | NOT NULL, DEFAULT 'Not Invited' | Current invitation status |
| `invitedBy` | UUID | NULLABLE, FK → Users | User who sent invitation |
| `invitedAt` | TIMESTAMP | NULLABLE | When invitation was sent |
| `invitationToken` | VARCHAR(255) | NULLABLE | Unique invitation token |
| `invitationExpiresAt` | TIMESTAMP | NULLABLE | Invitation expiration timestamp |
| `confirmationToken` | VARCHAR(255) | NULLABLE | Email confirmation token |
| `confirmationSentAt` | TIMESTAMP | NULLABLE | When confirmation email was sent |
| `confirmedAt` | TIMESTAMP | NULLABLE | When email was confirmed |
| `emailVerified` | BOOLEAN | NOT NULL, DEFAULT FALSE | Email verification status |
| `accountStatus` | ENUM | NOT NULL, DEFAULT 'Pending' | Current account status |
| `statusReason` | TEXT | NULLABLE | Reason for current status |
| `lastLoginAt` | TIMESTAMP | NULLABLE | Last successful login |
| `lastLoginIp` | INET | NULLABLE | IP address of last login |
| `failedLoginAttempts` | INTEGER | NOT NULL, DEFAULT 0 | Consecutive failed login attempts |
| `lockedUntil` | TIMESTAMP | NULLABLE | Account lock expiration |
| `passwordChangedAt` | TIMESTAMP | NULLABLE | Last password change |
| `mustChangePassword` | BOOLEAN | NOT NULL, DEFAULT FALSE | Force password change flag |
| `twoFactorEnabled` | BOOLEAN | NOT NULL, DEFAULT FALSE | 2FA authentication enabled |
| `twoFactorMethod` | ENUM | NULLABLE | Preferred 2FA method |
| `backupCodes` | JSONB | NULLABLE | Encrypted backup authentication codes |
| `sessionTimeout` | INTEGER | NULLABLE | Custom session timeout (minutes) |
| `allowedIpRanges` | JSONB | NULLABLE | Restricted IP address ranges |
| `deviceFingerprints` | JSONB | NULLABLE | Trusted device identifiers |
| `securityNotifications` | BOOLEAN | NOT NULL, DEFAULT TRUE | Security event notifications |
| `apiKeyEnabled` | BOOLEAN | NOT NULL, DEFAULT FALSE | API access enabled |
| `apiKeyHash` | VARCHAR(255) | NULLABLE | Hashed API key |
| `apiKeyExpiresAt` | TIMESTAMP | NULLABLE | API key expiration |
| `roles` | JSONB | NOT NULL, DEFAULT '[]' | Array of assigned system roles |
| `permissions` | JSONB | NULLABLE | Specific permission overrides |
| `metadata` | JSONB | NULLABLE | Additional user metadata |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |
| `deactivatedAt` | TIMESTAMP | NULLABLE | Account deactivation timestamp |
| `deactivatedBy` | UUID | NULLABLE, FK → Users | User who deactivated account |

**Constraints**:
- `CHECK(confirmedAt >= confirmationSentAt)` - Logical confirmation ordering
- `CHECK(invitationExpiresAt > invitedAt)` - Valid invitation period
- `CHECK(failedLoginAttempts >= 0)` - Non-negative failed attempts

**Indexes**:
- `idx_users_person_id` (personId)
- `idx_users_username` (username)
- `idx_users_keycloak_id` (keycloakId)
- `idx_users_invitation_status` (invitationStatus)
- `idx_users_account_status` (accountStatus)
- `idx_users_email_verified` (emailVerified)
- `idx_users_invitation_token` (invitationToken)
- `idx_users_confirmation_token` (confirmationToken)
- `idx_users_last_login` (lastLoginAt)

**Enums**:
- `InvitationStatus`: 'Not Invited', 'Invited', 'Invitation Sent', 'Invitation Expired', 'Invitation Accepted', 'Invitation Declined'
- `AccountStatus`: 'Pending', 'Active', 'Inactive', 'Suspended', 'Locked', 'Expired', 'Deactivated'
- `TwoFactorMethod`: 'None', 'SMS', 'Email', 'TOTP', 'Hardware Token', 'Biometric'

**Business Rules**:
- Email verification required before account activation
- Invitation tokens expire after configurable period
- Failed login attempts trigger progressive lockouts
- Account deactivation maintains audit trail
- Role changes require approval workflow

---

### 3. PersonOrganizationAffiliations

**Purpose**: Many-to-many relationship tracking person employment and affiliation history with organizations over time.

**Business Context**: Enables tracking of personnel movement between organizations while maintaining historical context and supporting role transitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique affiliation identifier |
| `personId` | UUID | NOT NULL, FK → Persons | Associated person |
| `organizationId` | UUID | NOT NULL, FK → Organizations | Associated organization |
| `jobTitle` | VARCHAR(255) | NULLABLE | Job title within organization |
| `department` | VARCHAR(255) | NULLABLE | Department or division |
| `employeeId` | VARCHAR(100) | NULLABLE | Organization employee identifier |
| `workLocation` | VARCHAR(255) | NULLABLE | Primary work location |
| `manager` | UUID | NULLABLE, FK → Persons | Direct manager/supervisor |
| `affiliationType` | ENUM | NOT NULL | Type of organizational relationship |
| `employmentStatus` | ENUM | NOT NULL | Current employment status |
| `securityClearanceRequired` | ENUM | NULLABLE | Required clearance level |
| `startDate` | DATE | NOT NULL | Affiliation start date |
| `endDate` | DATE | NULLABLE | Affiliation end date |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Current active status |
| `isPrimary` | BOOLEAN | NOT NULL, DEFAULT FALSE | Primary organizational affiliation |
| `payrollNumber` | VARCHAR(100) | NULLABLE | Payroll system identifier |
| `costCenter` | VARCHAR(100) | NULLABLE | Cost center or budget code |
| `workSchedule` | JSONB | NULLABLE | Work schedule and hours |
| `compensationLevel` | VARCHAR(50) | NULLABLE | Compensation band/level |
| `benefitsEligible` | BOOLEAN | NOT NULL, DEFAULT FALSE | Benefits eligibility |
| `contractType` | ENUM | NULLABLE | Type of contract engagement |
| `contractNumber` | VARCHAR(100) | NULLABLE | Associated contract identifier |
| `billableHours` | DECIMAL(5,2) | NULLABLE | Expected billable hours per week |
| `accessLevel` | ENUM | NOT NULL, DEFAULT 'Standard' | Organizational access level |
| `facilities` | JSONB | NULLABLE | Facility access permissions |
| `equipment` | JSONB | NULLABLE | Assigned equipment and assets |
| `notes` | TEXT | NULLABLE | Additional affiliation notes |
| `separationReason` | ENUM | NULLABLE | Reason for employment separation |
| `separationNotes` | TEXT | NULLABLE | Details about separation |
| `isEligibleForRehire` | BOOLEAN | NULLABLE | Rehire eligibility status |
| `exitInterviewCompleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Exit interview completion |
| `exitInterviewDate` | DATE | NULLABLE | Exit interview date |
| `finalWorkDate` | DATE | NULLABLE | Last day of work |
| `createdBy` | UUID | NOT NULL, FK → Users | Affiliation creator |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `CHECK(endDate >= startDate)` - Logical date ordering
- `CHECK(finalWorkDate <= endDate)` - Final work date before end date
- `UNIQUE(personId, organizationId, startDate)` - Unique affiliation per start date
- Only one primary affiliation per person at a time

**Indexes**:
- `idx_person_org_person_id` (personId)
- `idx_person_org_organization_id` (organizationId)
- `idx_person_org_is_active` (isActive)
- `idx_person_org_is_primary` (isPrimary)
- `idx_person_org_start_date` (startDate)
- `idx_person_org_end_date` (endDate)
- `idx_person_org_employment_status` (employmentStatus)

**Enums**:
- `AffiliationType`: 'Employee', 'Contractor', 'Consultant', 'Vendor', 'Partner', 'Volunteer', 'Intern'
- `EmploymentStatus`: 'Active', 'On Leave', 'Terminated', 'Resigned', 'Retired', 'Contract Ended', 'Transferred'
- `ContractType`: 'Full Time', 'Part Time', 'Contract', 'Temporary', 'Seasonal', 'Project Based'
- `AccessLevel`: 'Visitor', 'Standard', 'Elevated', 'Administrative', 'Executive'
- `SeparationReason`: 'Voluntary Resignation', 'Involuntary Termination', 'End of Contract', 'Retirement', 'Transfer', 'Layoff', 'Performance', 'Misconduct'

**Business Rules**:
- Only one primary affiliation allowed per person at any time
- Active affiliations cannot have end dates
- Separation reason required when employment status changes to terminated
- Manager must be affiliated with same organization
- Contract type must align with affiliation type

---

### 4. Organizations

**Purpose**: Represents government organizations and contractor companies involved in transitions.

**Business Context**: Provides organizational hierarchy and security boundaries for multi-agency transitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique organization identifier |
| `name` | VARCHAR(255) | NOT NULL | Organization official name |
| `abbreviation` | VARCHAR(50) | NULLABLE | Common abbreviation (e.g., "DOD", "GSA") |
| `type` | ENUM | NOT NULL | Organization category |
| `parentId` | UUID | NULLABLE, FK → Organizations | Parent organization for hierarchy |
| `contactEmail` | VARCHAR(255) | NULLABLE | Primary contact email |
| `securityOfficerEmail` | VARCHAR(255) | NULLABLE | Security officer contact |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Organization active status |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Indexes**:
- `idx_organizations_type` (type)
- `idx_organizations_parent_id` (parentId)

**Enums**:
- `OrganizationType`: 'Government Agency', 'Prime Contractor', 'Subcontractor', 'Vendor'

---

### 5. Transitions

**Purpose**: Represents government organizations and contractor companies involved in transitions.

**Business Context**: Provides organizational hierarchy and security boundaries for multi-agency transitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique organization identifier |
| `name` | VARCHAR(255) | NOT NULL | Organization official name |
| `abbreviation` | VARCHAR(50) | NULLABLE | Common abbreviation (e.g., "DOD", "GSA") |
| `type` | ENUM | NOT NULL | Organization category |
| `parentId` | UUID | NULLABLE, FK → Organizations | Parent organization for hierarchy |
| `contactEmail` | VARCHAR(255) | NULLABLE | Primary contact email |
| `securityOfficerEmail` | VARCHAR(255) | NULLABLE | Security officer contact |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Organization active status |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Indexes**:
- `idx_organizations_type` (type)
- `idx_organizations_parent_id` (parentId)

**Enums**:
- `OrganizationType`: 'Government Agency', 'Prime Contractor', 'Subcontractor', 'Vendor'

---

### 6. TransitionUsers

**Purpose**: Junction table linking Keycloak users to specific transitions with role-based permissions and security clearance status.

**Business Context**: Manages user access control and tracks security clearance progression for incoming contractors.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `userId` | UUID | NOT NULL | Keycloak user identifier |
| `role` | ENUM | NOT NULL | User's role in this transition |
| `securityStatus` | ENUM | NOT NULL, DEFAULT 'Pending' | Security clearance status |
| `platformAccess` | ENUM | NOT NULL, DEFAULT 'Disabled' | Platform access level |
| `invitedBy` | UUID | NOT NULL, FK → Users | User who invited this person |
| `invitedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Invitation timestamp |
| `acceptedAt` | TIMESTAMP | NULLABLE | When user accepted invitation |
| `lastAccessAt` | TIMESTAMP | NULLABLE | Last platform access timestamp |
| `accessNotes` | TEXT | NULLABLE | PM notes about access decisions |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active participation status |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `UNIQUE(transitionId, userId)` - One role per user per transition
- `CHECK(acceptedAt >= invitedAt)` - Logical timestamp ordering

**Indexes**:
- `idx_transition_users_transition_id` (transitionId)
- `idx_transition_users_user_id` (userId)
- `idx_transition_users_security_status` (securityStatus)
- `idx_transition_users_platform_access` (platformAccess)

**Enums**:
- `TransitionRole`: 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer'
- `SecurityStatus`: 'Pending', 'In Process', 'Interim Cleared', 'Cleared', 'Denied', 'Revoked'
- `PlatformAccess`: 'Disabled', 'Read Only', 'Standard', 'Full Access'

**Business Rules**:
- Platform access automatically set to 'Standard' when securityStatus = 'Cleared'
- Only Program Managers can modify other users' access levels
- Audit log entry required for all status changes

---

### 7. Milestones

**Purpose**: Represents key deliverables and checkpoints within a transition timeline.

**Business Context**: Enables Program Managers to track progress against defined transition schedules and identify at-risk activities.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique milestone identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Parent transition |
| `title` | VARCHAR(255) | NOT NULL | Milestone name |
| `description` | TEXT | NULLABLE | Detailed milestone description |
| `dueDate` | TIMESTAMP | NOT NULL | Target completion date |
| `completedDate` | TIMESTAMP | NULLABLE | Actual completion date |
| `status` | ENUM | NOT NULL, DEFAULT 'Not Started' | Current milestone status |
| `priority` | ENUM | NOT NULL, DEFAULT 'Medium' | Milestone priority level |
| `assignedTo` | UUID | NULLABLE, FK → Users | Responsible user |
| `percentComplete` | INTEGER | NOT NULL, DEFAULT 0, CHECK(0-100) | Completion percentage |
| `dependencies` | JSONB | NULLABLE | Array of dependent milestone IDs |
| `notes` | TEXT | NULLABLE | Progress notes and comments |
| `createdBy` | UUID | NOT NULL, FK → Users | Milestone creator |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Indexes**:
- `idx_milestones_transition_id` (transitionId)
- `idx_milestones_due_date` (dueDate)
- `idx_milestones_status` (status)
- `idx_milestones_assigned_to` (assignedTo)

**Enums**:
- `MilestoneStatus`: 'Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled', 'Overdue'
- `Priority`: 'Low', 'Medium', 'High', 'Critical'

---

### 8. Artifacts

**Purpose**: Manages transition documents, deliverables, and digital assets with version control and approval workflows.

**Business Context**: Central repository for contract deliverables requiring approval workflows and audit compliance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique artifact identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `name` | VARCHAR(255) | NOT NULL | Artifact display name |
| `description` | TEXT | NULLABLE | Artifact description and purpose |
| `type` | ENUM | NOT NULL | Category of artifact |
| `mimeType` | VARCHAR(100) | NOT NULL | File MIME type |
| `filePath` | VARCHAR(500) | NOT NULL | MinIO storage path |
| `fileSize` | BIGINT | NOT NULL | File size in bytes |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 file checksum |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Version number |
| `status` | ENUM | NOT NULL, DEFAULT 'Draft' | Current approval status |
| `isRequired` | BOOLEAN | NOT NULL, DEFAULT FALSE | Contractually required artifact |
| `submittedBy` | UUID | NOT NULL, FK → Users | User who uploaded/submitted |
| `submittedAt` | TIMESTAMP | NULLABLE | Submission timestamp |
| `reviewedBy` | UUID | NULLABLE, FK → Users | Reviewing Program Manager |
| `reviewedAt` | TIMESTAMP | NULLABLE | Review completion timestamp |
| `approvalComments` | TEXT | NULLABLE | Reviewer comments |
| `parentId` | UUID | NULLABLE, FK → Artifacts | Previous version reference |
| `expiresAt` | TIMESTAMP | NULLABLE | Artifact expiration date |
| `securityClassification` | ENUM | NOT NULL, DEFAULT 'Unclassified' | Security classification |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `UNIQUE(transitionId, name, version)` - Unique naming per transition
- `CHECK(reviewedAt >= submittedAt)` - Logical timestamp ordering

**Indexes**:
- `idx_artifacts_transition_id` (transitionId)
- `idx_artifacts_status` (status)
- `idx_artifacts_type` (type)
- `idx_artifacts_submitted_by` (submittedBy)
- `idx_artifacts_checksum` (checksum)

**Enums**:
- `ArtifactType`: 'Documentation', 'Source Code', 'Configuration', 'Database Export', 'Training Materials', 'Contract Deliverable', 'Other'
- `ArtifactStatus`: 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Superseded', 'Archived'

---

### 9. ArtifactAuditLog

**Purpose**: Immutable audit trail for all artifact-related actions ensuring compliance and traceability.

**Business Context**: Meets federal audit requirements for document management and provides forensic capabilities for compliance investigations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique audit entry identifier |
| `artifactId` | UUID | NOT NULL, FK → Artifacts | Associated artifact |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `action` | ENUM | NOT NULL | Type of action performed |
| `performedBy` | UUID | NOT NULL | User who performed the action |
| `performedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Action timestamp |
| `previousValue` | JSONB | NULLABLE | Previous state before change |
| `newValue` | JSONB | NULLABLE | New state after change |
| `comments` | TEXT | NULLABLE | Action comments or rationale |
| `ipAddress` | INET | NULLABLE | User's IP address |
| `userAgent` | TEXT | NULLABLE | User's browser/client information |
| `sessionId` | VARCHAR(255) | NULLABLE | User session identifier |

**Constraints**:
- **IMMUTABLE TABLE** - No UPDATE or DELETE operations allowed
- `CHECK(performedAt <= NOW())` - No future timestamps

**Indexes**:
- `idx_artifact_audit_artifact_id` (artifactId)
- `idx_artifact_audit_transition_id` (transitionId)
- `idx_artifact_audit_performed_at` (performedAt)
- `idx_artifact_audit_performed_by` (performedBy)

**Enums**:
- `AuditAction`: 'Created', 'Updated', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Downloaded', 'Deleted', 'Restored', 'Status Changed'

---

### 10. KnowledgeChunks

**Purpose**: Processed text segments from approved artifacts for AI-powered question answering and knowledge retrieval.

**Business Context**: Enables incoming contractors to discover information independently through natural language queries against approved documentation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique knowledge chunk identifier |
| `artifactId` | UUID | NOT NULL, FK → Artifacts | Source artifact |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `content` | TEXT | NOT NULL | Extracted text content |
| `contentHash` | VARCHAR(64) | NOT NULL | SHA-256 hash of content |
| `chunkIndex` | INTEGER | NOT NULL | Sequence within source document |
| `startOffset` | INTEGER | NULLABLE | Character position in source |
| `endOffset` | INTEGER | NULLABLE | End character position in source |
| `pageNumber` | INTEGER | NULLABLE | Source document page number |
| `sectionTitle` | VARCHAR(255) | NULLABLE | Document section heading |
| `contentType` | ENUM | NOT NULL | Type of content extracted |
| `processingModel` | VARCHAR(100) | NOT NULL | AI model used for processing |
| `confidence` | DECIMAL(3,2) | NOT NULL, CHECK(0-1) | Processing confidence score |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT TRUE | Available for search |
| `processedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Processing completion time |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `UNIQUE(artifactId, chunkIndex)` - Unique sequencing per artifact
- `CHECK(endOffset >= startOffset)` - Logical position ordering

**Indexes**:
- `idx_knowledge_chunks_artifact_id` (artifactId)
- `idx_knowledge_chunks_transition_id` (transitionId)
- `idx_knowledge_chunks_content_hash` (contentHash)
- `idx_knowledge_chunks_is_active` (isActive)

**Enums**:
- `ContentType`: 'Text', 'Table', 'List', 'Code', 'Metadata', 'Header', 'Footer'

---

### 11. Tasks

**Purpose**: Granular work assignments that can be assigned to specific users with due dates, progress tracking, and dependency management.

**Business Context**: Enables Program Managers to break down milestones into actionable tasks, assign work to team members, track progress, and manage dependencies between work items.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique task identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `milestoneId` | UUID | NULLABLE, FK → Milestones | Parent milestone (if applicable) |
| `parentTaskId` | UUID | NULLABLE, FK → Tasks | Parent task for subtasks |
| `title` | VARCHAR(255) | NOT NULL | Task name/summary |
| `description` | TEXT | NULLABLE | Detailed task description |
| `status` | ENUM | NOT NULL, DEFAULT 'Not Started' | Current task status |
| `priority` | ENUM | NOT NULL, DEFAULT 'Medium' | Task priority level |
| `assignedTo` | UUID | NULLABLE, FK → Users | User responsible for task |
| `assignedBy` | UUID | NOT NULL, FK → Users | User who assigned the task |
| `assignedAt` | TIMESTAMP | NULLABLE | When task was assigned |
| `startDate` | TIMESTAMP | NULLABLE | Planned/actual start date |
| `dueDate` | TIMESTAMP | NULLABLE | Target completion date |
| `completedDate` | TIMESTAMP | NULLABLE | Actual completion date |
| `estimatedHours` | DECIMAL(5,2) | NULLABLE | Estimated effort in hours |
| `actualHours` | DECIMAL(5,2) | NULLABLE | Actual time spent |
| `percentComplete` | INTEGER | NOT NULL, DEFAULT 0, CHECK(0-100) | Completion percentage |
| `tags` | JSONB | NULLABLE | Array of task tags/categories |
| `dependencies` | JSONB | NULLABLE | Array of dependent task IDs |
| `blockers` | TEXT | NULLABLE | Description of current blockers |
| `notes` | TEXT | NULLABLE | Progress notes and updates |
| `attachments` | JSONB | NULLABLE | Array of file references |
| `isRecurring` | BOOLEAN | NOT NULL, DEFAULT FALSE | Recurring task indicator |
| `recurringPattern` | JSONB | NULLABLE | Recurrence configuration |
| `createdBy` | UUID | NOT NULL, FK → Users | Task creator |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `CHECK(completedDate >= startDate)` - Logical date ordering
- `CHECK(dueDate >= startDate)` - Logical date ordering
- `CHECK(assignedAt <= NOW())` - No future assignment dates
- `CHECK(actualHours >= 0)` - Non-negative time tracking

**Indexes**:
- `idx_tasks_transition_id` (transitionId)
- `idx_tasks_milestone_id` (milestoneId)
- `idx_tasks_assigned_to` (assignedTo)
- `idx_tasks_assigned_by` (assignedBy)
- `idx_tasks_status` (status)
- `idx_tasks_due_date` (dueDate)
- `idx_tasks_parent_task_id` (parentTaskId)
- `idx_tasks_priority_status` (priority, status)

**Enums**:
- `TaskStatus`: 'Not Started', 'Assigned', 'In Progress', 'On Hold', 'Blocked', 'Under Review', 'Completed', 'Cancelled', 'Overdue'
- `Priority`: 'Low', 'Medium', 'High', 'Critical', 'Urgent'

**Business Rules**:
- Tasks can be assigned to users who have active participation in the transition
- Only Program Managers can assign tasks to others
- Users can create and assign tasks to themselves
- Subtasks inherit parent task's transition and milestone (if any)
- Task completion automatically updates parent milestone progress
- Overdue tasks are automatically flagged when dueDate < NOW() and status != 'Completed'

---

### 12. TaskComments

**Purpose**: Communication thread for task-specific discussions, updates, and collaboration.

**Business Context**: Provides contextual communication around task execution, enabling team collaboration and maintaining a record of decisions and progress updates.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique comment identifier |
| `taskId` | UUID | NOT NULL, FK → Tasks | Associated task |
| `authorId` | UUID | NOT NULL, FK → Users | Comment author |
| `content` | TEXT | NOT NULL | Comment content |
| `commentType` | ENUM | NOT NULL, DEFAULT 'General' | Type of comment |
| `isInternal` | BOOLEAN | NOT NULL, DEFAULT FALSE | Internal team communication |
| `mentionedUsers` | JSONB | NULLABLE | Array of mentioned user IDs |
| `attachments` | JSONB | NULLABLE | Array of file references |
| `editedAt` | TIMESTAMP | NULLABLE | Last edit timestamp |
| `editedBy` | UUID | NULLABLE, FK → Users | User who edited comment |
| `isDeleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Comment creation timestamp |

**Indexes**:
- `idx_task_comments_task_id` (taskId)
- `idx_task_comments_author_id` (authorId)
- `idx_task_comments_created_at` (createdAt)

**Enums**:
- `CommentType`: 'General', 'Progress Update', 'Blocker', 'Question', 'Decision', 'Status Change'

---

### 13. Communications

**Purpose**: Centralized log of all communications including emails, chat messages, and platform-generated notifications related to transitions.

**Business Context**: Provides complete communication audit trail for compliance, enables contextual communication history, and supports integrated messaging within the platform.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique communication identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `communicationType` | ENUM | NOT NULL | Type of communication |
| `direction` | ENUM | NOT NULL | Message direction |
| `platform` | ENUM | NOT NULL | Source platform/channel |
| `externalId` | VARCHAR(255) | NULLABLE | External platform message ID |
| `threadId` | VARCHAR(255) | NULLABLE | Conversation thread identifier |
| `fromUserId` | UUID | NULLABLE, FK → Users | Sender (internal users) |
| `fromEmail` | VARCHAR(255) | NULLABLE | Sender email address |
| `fromName` | VARCHAR(255) | NULLABLE | Sender display name |
| `toUsers` | JSONB | NOT NULL | Array of recipient user IDs |
| `toEmails` | JSONB | NOT NULL | Array of recipient email addresses |
| `ccEmails` | JSONB | NULLABLE | Array of CC email addresses |
| `bccEmails` | JSONB | NULLABLE | Array of BCC email addresses |
| `subject` | VARCHAR(500) | NULLABLE | Email subject or message title |
| `content` | TEXT | NOT NULL | Message content/body |
| `contentType` | ENUM | NOT NULL, DEFAULT 'Text' | Content format type |
| `attachments` | JSONB | NULLABLE | Array of attachment metadata |
| `priority` | ENUM | NOT NULL, DEFAULT 'Normal' | Message priority level |
| `isRead` | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status flag |
| `readAt` | TIMESTAMP | NULLABLE | When message was read |
| `readBy` | UUID | NULLABLE, FK → Users | User who marked as read |
| `relatedEntityType` | ENUM | NULLABLE | Related entity type |
| `relatedEntityId` | UUID | NULLABLE | Related entity ID |
| `status` | ENUM | NOT NULL, DEFAULT 'Delivered' | Delivery/processing status |
| `errorMessage` | TEXT | NULLABLE | Error details if failed |
| `metadata` | JSONB | NULLABLE | Platform-specific metadata |
| `sentAt` | TIMESTAMP | NOT NULL | Message sent timestamp |
| `receivedAt` | TIMESTAMP | NULLABLE | Message received timestamp |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `CHECK(sentAt <= receivedAt)` - Logical timestamp ordering
- `CHECK(readAt >= receivedAt)` - Logical read timestamp

**Indexes**:
- `idx_communications_transition_id` (transitionId)
- `idx_communications_from_user_id` (fromUserId)
- `idx_communications_sent_at` (sentAt)
- `idx_communications_type_platform` (communicationType, platform)
- `idx_communications_thread_id` (threadId)
- `idx_communications_external_id` (externalId)
- `idx_communications_related_entity` (relatedEntityType, relatedEntityId)
- `idx_communications_status` (status)

**Enums**:
- `CommunicationType`: 'Email', 'Chat', 'SMS', 'Notification', 'System Message', 'Voice Call', 'Video Call'
- `Direction`: 'Inbound', 'Outbound', 'Internal'
- `Platform`: 'TIP Internal', 'Microsoft Teams', 'Slack', 'Email', 'Zoom', 'Discord', 'WhatsApp', 'SMS Gateway'
- `ContentType`: 'Text', 'HTML', 'Markdown', 'Rich Text', 'JSON'
- `Priority`: 'Low', 'Normal', 'High', 'Urgent', 'Critical'
- `RelatedEntityType`: 'Task', 'Milestone', 'Artifact', 'Event', 'User', 'Transition'
- `CommStatus`: 'Pending', 'Delivered', 'Failed', 'Bounced', 'Spam', 'Quarantined'

**Business Rules**:
- All platform-generated emails must be logged
- External chat integrations must sync message history
- Sensitive communications require encryption at rest
- Audit trail for all outbound communications
- Integration with notification preferences

---

### 14. CalendarEvents

**Purpose**: Centralized calendar system for transition-related events with external calendar integration capabilities.

**Business Context**: Manages meeting schedules, milestone deadlines, task due dates, and project events with seamless integration to Outlook/Teams calendars.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique event identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `title` | VARCHAR(255) | NOT NULL | Event title/summary |
| `description` | TEXT | NULLABLE | Detailed event description |
| `eventType` | ENUM | NOT NULL | Category of event |
| `startDateTime` | TIMESTAMP | NOT NULL | Event start date and time |
| `endDateTime` | TIMESTAMP | NOT NULL | Event end date and time |
| `timeZone` | VARCHAR(50) | NOT NULL | Event timezone |
| `isAllDay` | BOOLEAN | NOT NULL, DEFAULT FALSE | All-day event flag |
| `location` | VARCHAR(500) | NULLABLE | Physical or virtual location |
| `meetingUrl` | VARCHAR(500) | NULLABLE | Online meeting link |
| `meetingId` | VARCHAR(100) | NULLABLE | Meeting platform ID |
| `organizerId` | UUID | NOT NULL, FK → Users | Event organizer |
| `attendees` | JSONB | NOT NULL | Array of attendee objects |
| `requiredAttendees` | JSONB | NULLABLE | Array of required attendee IDs |
| `optionalAttendees` | JSONB | NULLABLE | Array of optional attendee IDs |
| `recurrenceRule` | TEXT | NULLABLE | RFC 5545 recurrence rule |
| `recurrenceExceptions` | JSONB | NULLABLE | Exception dates for recurring events |
| `reminderMinutes` | INTEGER | NULLABLE | Reminder time before event |
| `status` | ENUM | NOT NULL, DEFAULT 'Scheduled' | Event status |
| `visibility` | ENUM | NOT NULL, DEFAULT 'Internal' | Event visibility level |
| `category` | VARCHAR(100) | NULLABLE | Event category/tag |
| `priority` | ENUM | NOT NULL, DEFAULT 'Medium' | Event priority |
| `relatedEntityType` | ENUM | NULLABLE | Related entity type |
| `relatedEntityId` | UUID | NULLABLE | Related entity ID |
| `externalCalendarId` | VARCHAR(255) | NULLABLE | External calendar event ID |
| `externalPlatform` | ENUM | NULLABLE | External calendar platform |
| `syncStatus` | ENUM | NOT NULL, DEFAULT 'Not Synced' | External sync status |
| `lastSyncAt` | TIMESTAMP | NULLABLE | Last synchronization timestamp |
| `syncError` | TEXT | NULLABLE | Sync error message |
| `metadata` | JSONB | NULLABLE | Platform-specific metadata |
| `createdBy` | UUID | NOT NULL, FK → Users | Event creator |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |
| `cancelledAt` | TIMESTAMP | NULLABLE | Event cancellation timestamp |
| `cancelledBy` | UUID | NULLABLE, FK → Users | User who cancelled event |

**Constraints**:
- `CHECK(endDateTime > startDateTime)` - Logical time ordering
- `CHECK(reminderMinutes >= 0)` - Non-negative reminder time
- `CHECK(cancelledAt >= createdAt)` - Logical cancellation timestamp

**Indexes**:
- `idx_calendar_events_transition_id` (transitionId)
- `idx_calendar_events_organizer_id` (organizerId)
- `idx_calendar_events_start_time` (startDateTime)
- `idx_calendar_events_end_time` (endDateTime)
- `idx_calendar_events_event_type` (eventType)
- `idx_calendar_events_status` (status)
- `idx_calendar_events_external_id` (externalCalendarId)
- `idx_calendar_events_related_entity` (relatedEntityType, relatedEntityId)
- `idx_calendar_events_sync_status` (syncStatus)

**Enums**:
- `EventType`: 'Meeting', 'Milestone Deadline', 'Task Due Date', 'Review Session', 'Training', 'Presentation', 'Conference Call', 'Site Visit', 'Other'
- `EventStatus`: 'Scheduled', 'Confirmed', 'Tentative', 'Cancelled', 'Completed', 'In Progress', 'Postponed'
- `EventVisibility`: 'Public', 'Internal', 'Private', 'Confidential'
- `Priority`: 'Low', 'Medium', 'High', 'Critical'
- `RelatedEntityType`: 'Task', 'Milestone', 'Artifact', 'Transition', 'User'
- `ExternalPlatform`: 'Microsoft Outlook', 'Microsoft Teams', 'Google Calendar', 'Zoom', 'WebEx', 'Other'
- `SyncStatus`: 'Not Synced', 'Synced', 'Sync Pending', 'Sync Failed', 'Sync Conflict'

**Business Rules**:
- Events can be automatically created from milestone due dates
- Task due dates can generate calendar reminders
- Meeting invites sent through external calendar platforms
- Attendee responses tracked and synchronized
- Recurring events support complex patterns
- Integration with Microsoft Graph API for Outlook/Teams

---

### 15. NotificationPreferences

**Purpose**: User-specific preferences for communication channels and notification settings.

**Business Context**: Enables users to control how and when they receive notifications, supporting multiple communication channels and reducing notification fatigue.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique preference identifier |
| `userId` | UUID | NOT NULL, FK → Users | User these preferences belong to |
| `transitionId` | UUID | NULLABLE, FK → Transitions | Transition-specific preferences |
| `notificationType` | ENUM | NOT NULL | Type of notification |
| `channelEmail` | BOOLEAN | NOT NULL, DEFAULT TRUE | Enable email notifications |
| `channelInApp` | BOOLEAN | NOT NULL, DEFAULT TRUE | Enable in-app notifications |
| `channelSms` | BOOLEAN | NOT NULL, DEFAULT FALSE | Enable SMS notifications |
| `channelTeams` | BOOLEAN | NOT NULL, DEFAULT FALSE | Enable Teams notifications |
| `channelSlack` | BOOLEAN | NOT NULL, DEFAULT FALSE | Enable Slack notifications |
| `frequency` | ENUM | NOT NULL, DEFAULT 'Immediate' | Notification frequency |
| `quietHoursStart` | TIME | NULLABLE | Start of quiet hours |
| `quietHoursEnd` | TIME | NULLABLE | End of quiet hours |
| `timeZone` | VARCHAR(50) | NOT NULL | User's timezone |
| `isEnabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | Overall preference enabled |
| `priority` | ENUM | NOT NULL, DEFAULT 'Normal' | Minimum priority for notifications |
| `customSettings` | JSONB | NULLABLE | Additional custom preferences |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `UNIQUE(userId, transitionId, notificationType)` - One preference per user per type per transition

**Indexes**:
- `idx_notification_prefs_user_id` (userId)
- `idx_notification_prefs_transition_id` (transitionId)
- `idx_notification_prefs_type` (notificationType)

**Enums**:
- `NotificationType`: 'Task Assignment', 'Task Due', 'Task Completed', 'Milestone Due', 'Artifact Submitted', 'Artifact Approved', 'Meeting Reminder', 'Status Change', 'Mention', 'System Alert'
- `Frequency`: 'Immediate', 'Hourly Digest', 'Daily Digest', 'Weekly Digest', 'Never'
- `Priority`: 'Low', 'Normal', 'High', 'Critical'

---

### 16. DeliverableQualityReviews

**Purpose**: Quality assessment and validation process for deliverables before they are published to the knowledge base or marked as final.

**Business Context**: Ensures that only high-quality, accurate, and complete deliverables are made available to incoming contractors, maintaining the integrity of the knowledge transfer process.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique quality review identifier |
| `artifactId` | UUID | NOT NULL, FK → Artifacts | Deliverable being reviewed |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `reviewerId` | UUID | NOT NULL, FK → Users | Quality reviewer (PM or SME) |
| `reviewType` | ENUM | NOT NULL | Type of quality review |
| `reviewStatus` | ENUM | NOT NULL, DEFAULT 'Pending' | Current review status |
| `overallScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Overall quality score (0-5 scale) |
| `completenessScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Content completeness assessment |
| `accuracyScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Technical accuracy assessment |
| `clarityScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Documentation clarity score |
| `usabilityScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Usability for incoming team |
| `complianceScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Regulatory/standard compliance |
| `securityScore` | DECIMAL(3,2) | NULLABLE, CHECK(0-5) | Security review score |
| `qualityChecklist` | JSONB | NULLABLE | Structured quality criteria checklist |
| `strengths` | TEXT | NULLABLE | Identified strengths and good practices |
| `weaknesses` | TEXT | NULLABLE | Areas needing improvement |
| `recommendations` | TEXT | NULLABLE | Specific improvement recommendations |
| `correctiveActions` | TEXT | NULLABLE | Required corrective actions |
| `publishingDecision` | ENUM | NULLABLE | Decision on knowledge base inclusion |
| `publishingNotes` | TEXT | NULLABLE | Notes on publishing decision |
| `reviewDuration` | INTEGER | NULLABLE | Time spent on review (minutes) |
| `reviewCriteria` | JSONB | NOT NULL | Quality criteria and standards used |
| `isSignedOff` | BOOLEAN | NOT NULL, DEFAULT FALSE | Final approval status |
| `signOffBy` | UUID | NULLABLE, FK → Users | Final approver |
| `signOffAt` | TIMESTAMP | NULLABLE | Final approval timestamp |
| `requiredActions` | JSONB | NULLABLE | Outstanding action items |
| `followUpRequired` | BOOLEAN | NOT NULL, DEFAULT FALSE | Requires follow-up review |
| `nextReviewDate` | TIMESTAMP | NULLABLE | Scheduled follow-up review date |
| `reviewStartedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Review start timestamp |
| `reviewCompletedAt` | TIMESTAMP | NULLABLE | Review completion timestamp |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `CHECK(reviewCompletedAt >= reviewStartedAt)` - Logical completion ordering
- `CHECK(signOffAt >= reviewCompletedAt)` - Logical approval ordering
- `CHECK(nextReviewDate > reviewCompletedAt)` - Future follow-up dates

**Indexes**:
- `idx_quality_reviews_artifact_id` (artifactId)
- `idx_quality_reviews_transition_id` (transitionId)
- `idx_quality_reviews_reviewer_id` (reviewerId)
- `idx_quality_reviews_status` (reviewStatus)
- `idx_quality_reviews_overall_score` (overallScore)
- `idx_quality_reviews_publishing_decision` (publishingDecision)
- `idx_quality_reviews_follow_up` (followUpRequired, nextReviewDate)

**Enums**:
- `ReviewType`: 'Initial Review', 'Revision Review', 'Final Review', 'Compliance Review', 'Security Review', 'Technical Review', 'Content Review'
- `ReviewStatus`: 'Pending', 'In Progress', 'Completed', 'Approved', 'Rejected', 'Needs Revision', 'On Hold', 'Escalated'
- `PublishingDecision`: 'Approved for Publishing', 'Rejected', 'Approved with Conditions', 'Needs Revision', 'Under Review'

**Business Rules**:
- Only approved deliverables can be processed into knowledge base
- Quality scores must be above threshold for publishing approval
- Security reviews required for classified or sensitive deliverables
- Sign-off required from designated authority for final approval
- Follow-up reviews scheduled for conditional approvals

---

### 17. ContractorProficiencyAssessments

**Purpose**: Comprehensive tracking of incoming contractor knowledge, skills, and readiness progression throughout the transition.

**Business Context**: Enables Program Managers to assess contractor capabilities, identify knowledge gaps, and track readiness for independent operation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique assessment identifier |
| `contractorId` | UUID | NOT NULL, FK → Users | Contractor being assessed |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `assessmentType` | ENUM | NOT NULL | Type of proficiency assessment |
| `assessmentCategory` | ENUM | NOT NULL | Skill/knowledge category |
| `skillArea` | VARCHAR(255) | NOT NULL | Specific skill or knowledge area |
| `assessorId` | UUID | NOT NULL, FK → Users | Person conducting assessment |
| `assessmentMethod` | ENUM | NOT NULL | How proficiency was evaluated |
| `currentLevel` | ENUM | NOT NULL | Current proficiency level |
| `targetLevel` | ENUM | NOT NULL | Required proficiency level |
| `score` | DECIMAL(5,2) | NULLABLE | Numerical assessment score |
| `maxScore` | DECIMAL(5,2) | NULLABLE | Maximum possible score |
| `percentage` | DECIMAL(5,2) | NULLABLE, CHECK(0-100) | Percentage score |
| `assessmentNotes` | TEXT | NULLABLE | Detailed assessment observations |
| `strengths` | TEXT | NULLABLE | Identified strengths |
| `weaknesses` | TEXT | NULLABLE | Areas needing improvement |
| `knowledgeGaps` | JSONB | NULLABLE | Specific knowledge gaps identified |
| `recommendedTraining` | TEXT | NULLABLE | Suggested training or development |
| `learningResources` | JSONB | NULLABLE | Recommended learning materials |
| `practiceAreas` | TEXT | NULLABLE | Areas requiring practical experience |
| `mentorshipNeeds` | TEXT | NULLABLE | Mentoring requirements |
| `isCompleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Assessment completion status |
| `isPassing` | BOOLEAN | NULLABLE | Whether assessment meets requirements |
| `certificationRequired` | BOOLEAN | NOT NULL, DEFAULT FALSE | Formal certification needed |
| `certificationStatus` | ENUM | NULLABLE | Certification progress status |
| `certificationDate` | TIMESTAMP | NULLABLE | Certification achievement date |
| `validUntil` | TIMESTAMP | NULLABLE | Certification expiration date |
| `reassessmentRequired` | BOOLEAN | NOT NULL, DEFAULT FALSE | Needs follow-up assessment |
| `nextAssessmentDate` | TIMESTAMP | NULLABLE | Scheduled reassessment date |
| `progressSinceLastAssessment` | TEXT | NULLABLE | Progress notes since previous assessment |
| `overallReadiness` | ENUM | NULLABLE | Overall operational readiness |
| `readinessNotes` | TEXT | NULLABLE | Readiness assessment notes |
| `riskFactors` | JSONB | NULLABLE | Identified risk factors |
| `mitigationPlans` | TEXT | NULLABLE | Risk mitigation strategies |
| `assessmentDate` | TIMESTAMP | NOT NULL, DEFAULT NOW() | When assessment was conducted |
| `createdBy` | UUID | NOT NULL, FK → Users | Assessment creator |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last modification timestamp |

**Constraints**:
- `UNIQUE(contractorId, transitionId, skillArea, assessmentDate)` - One assessment per skill per date
- `CHECK(certificationDate >= assessmentDate)` - Logical certification timing
- `CHECK(validUntil >= certificationDate)` - Valid certification period
- `CHECK(score <= maxScore)` - Score within valid range

**Indexes**:
- `idx_proficiency_contractor_id` (contractorId)
- `idx_proficiency_transition_id` (transitionId)
- `idx_proficiency_assessor_id` (assessorId)
- `idx_proficiency_category_skill` (assessmentCategory, skillArea)
- `idx_proficiency_current_level` (currentLevel)
- `idx_proficiency_overall_readiness` (overallReadiness)
- `idx_proficiency_certification_status` (certificationStatus)
- `idx_proficiency_reassessment` (reassessmentRequired, nextAssessmentDate)
- `idx_proficiency_assessment_date` (assessmentDate)

**Enums**:
- `AssessmentType`: 'Initial Assessment', 'Progress Review', 'Milestone Assessment', 'Final Assessment', 'Certification Exam', 'Competency Check', 'Peer Review'
- `AssessmentCategory`: 'Technical Skills', 'Domain Knowledge', 'Process Understanding', 'Tool Proficiency', 'Security Awareness', 'Communication Skills', 'Leadership Skills', 'Project Management'
- `AssessmentMethod`: 'Written Test', 'Practical Exercise', 'Code Review', 'Presentation', 'Interview', 'Observation', 'Peer Evaluation', 'Self Assessment', 'Portfolio Review'
- `ProficiencyLevel`: 'None', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert', 'Master'
- `CertificationStatus`: 'Not Required', 'Required', 'In Progress', 'Scheduled', 'Completed', 'Failed', 'Expired', 'Renewed'
- `OverallReadiness`: 'Not Ready', 'Limited Ready', 'Partially Ready', 'Mostly Ready', 'Fully Ready', 'Exceeds Requirements'

**Business Rules**:
- Initial assessments required within first week of contractor onboarding
- Progress assessments conducted at defined milestone intervals
- Certification requirements vary by skill area and contract requirements
- Reassessments triggered by performance issues or significant changes
- Overall readiness calculated from individual skill assessments
- Risk factors automatically flagged for management attention

---

### 18. ProficiencyProgressTracking

**Purpose**: Longitudinal tracking of contractor skill development and learning progress over time.

**Business Context**: Provides trending analysis of contractor development, identifies learning velocity, and supports data-driven decisions about readiness milestones.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique progress tracking identifier |
| `contractorId` | UUID | NOT NULL, FK → Users | Contractor being tracked |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `skillArea` | VARCHAR(255) | NOT NULL | Specific skill being tracked |
| `baselineAssessmentId` | UUID | NOT NULL, FK → ContractorProficiencyAssessments | Initial assessment |
| `currentAssessmentId` | UUID | NOT NULL, FK → ContractorProficiencyAssessments | Most recent assessment |
| `baselineLevel` | ENUM | NOT NULL | Starting proficiency level |
| `currentLevel` | ENUM | NOT NULL | Current proficiency level |
| `targetLevel` | ENUM | NOT NULL | Required proficiency level |
| `progressPercentage` | DECIMAL(5,2) | NOT NULL, CHECK(0-100) | Progress toward target |
| `learningVelocity` | DECIMAL(5,2) | NULLABLE | Rate of skill acquisition |
| `totalAssessments` | INTEGER | NOT NULL, DEFAULT 1 | Number of assessments completed |
| `averageScore` | DECIMAL(5,2) | NULLABLE | Average assessment score |
| `trendDirection` | ENUM | NOT NULL | Progress trend direction |
| `lastImprovement` | TIMESTAMP | NULLABLE | Last recorded improvement date |
| `plateauPeriod` | INTEGER | NULLABLE | Days without improvement |
| `strugglingIndicators` | JSONB | NULLABLE | Signs of learning difficulties |
| `interventionsApplied` | JSONB | NULLABLE | Support interventions provided |
| `learningStyle` | ENUM | NULLABLE | Identified learning preference |
| `motivationFactors` | JSONB | NULLABLE | Factors affecting learning motivation |
| `blockers` | TEXT | NULLABLE | Current learning obstacles |
| `supportNeeds` | TEXT | NULLABLE | Additional support requirements |
| `projectedCompletionDate` | TIMESTAMP | NULLABLE | Estimated target achievement date |
| `riskLevel` | ENUM | NOT NULL, DEFAULT 'Low' | Risk of not meeting targets |
| `confidenceInterval` | DECIMAL(3,2) | NULLABLE, CHECK(0-1) | Prediction confidence level |
| `lastUpdated` | TIMESTAMP | NOT NULL, AUTO-UPDATE | Last progress calculation |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `UNIQUE(contractorId, transitionId, skillArea)` - One progress track per contractor per skill
- `CHECK(currentLevel >= baselineLevel OR trendDirection = 'Declining')` - Logical level progression

**Indexes**:
- `idx_progress_tracking_contractor_id` (contractorId)
- `idx_progress_tracking_transition_id` (transitionId)
- `idx_progress_tracking_skill_area` (skillArea)
- `idx_progress_tracking_risk_level` (riskLevel)
- `idx_progress_tracking_trend` (trendDirection)
- `idx_progress_tracking_completion_date` (projectedCompletionDate)

**Enums**:
- `ProficiencyLevel`: 'None', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert', 'Master'
- `TrendDirection`: 'Improving', 'Stable', 'Declining', 'Rapid Improvement', 'Stagnant'
- `LearningStyle`: 'Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed'
- `RiskLevel`: 'Low', 'Medium', 'High', 'Critical'

**Business Rules**:
- Progress calculations updated automatically after each assessment
- Risk levels escalated based on trend analysis and timeline pressure
- Learning velocity calculated using time-weighted assessment improvements
- Plateau detection triggers intervention recommendations
- Predictive modeling for completion date estimation

---

### 19. VectorEmbeddings

**Purpose**: Vector representations of knowledge chunks for semantic similarity search and AI question answering.

**Business Context**: Enables advanced search capabilities allowing users to find relevant information using natural language queries rather than keyword matching.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique embedding identifier |
| `knowledgeChunkId` | UUID | NOT NULL, FK → KnowledgeChunks | Associated knowledge chunk |
| `embedding` | VECTOR(1536) | NOT NULL | Vector embedding (OpenAI Ada-002 size) |
| `embeddingModel` | VARCHAR(100) | NOT NULL | Model used for embedding generation |
| `modelVersion` | VARCHAR(50) | NOT NULL | Specific model version |
| `dimensions` | INTEGER | NOT NULL | Vector dimensionality |
| `magnitude` | DECIMAL(10,6) | NOT NULL | Vector magnitude for normalization |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Embedding creation timestamp |

**Constraints**:
- `UNIQUE(knowledgeChunkId)` - One embedding per knowledge chunk
- `CHECK(dimensions > 0)` - Valid dimensionality

**Indexes**:
- `idx_vector_embeddings_chunk_id` (knowledgeChunkId)
- Vector similarity index using pgvector: `CREATE INDEX ON vector_embeddings USING ivfflat (embedding vector_cosine_ops)`

---

### 20. QuerySessions

**Purpose**: Tracks user question-answering sessions for analytics, audit, and system improvement.

**Business Context**: Provides insights into knowledge gaps and user information needs while maintaining audit trails for security compliance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique session identifier |
| `transitionId` | UUID | NOT NULL, FK → Transitions | Associated transition |
| `userId` | UUID | NOT NULL | Querying user identifier |
| `query` | TEXT | NOT NULL | Original natural language question |
| `queryEmbedding` | VECTOR(1536) | NOT NULL | Vector representation of query |
| `response` | TEXT | NOT NULL | Generated answer |
| `sourceChunks` | JSONB | NOT NULL | Array of source chunk IDs and scores |
| `confidence` | DECIMAL(3,2) | NOT NULL, CHECK(0-1) | Answer confidence score |
| `responseTime` | INTEGER | NOT NULL | Processing time in milliseconds |
| `feedback` | ENUM | NULLABLE | User feedback on answer quality |
| `feedbackComments` | TEXT | NULLABLE | Detailed user feedback |
| `ipAddress` | INET | NULLABLE | User's IP address |
| `sessionId` | VARCHAR(255) | NULLABLE | User session identifier |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Query timestamp |

**Indexes**:
- `idx_query_sessions_transition_id` (transitionId)
- `idx_query_sessions_user_id` (userId)
- `idx_query_sessions_created_at` (createdAt)

**Enums**:
- `QueryFeedback`: 'Helpful', 'Partially Helpful', 'Not Helpful', 'Incorrect'

---

### 21. SystemSettings

**Purpose**: Application-wide configuration settings and feature flags for operational control.

**Business Context**: Enables runtime configuration changes without deployments and provides operational flexibility for different deployment environments.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique setting identifier |
| `key` | VARCHAR(255) | NOT NULL, UNIQUE | Setting key name |
| `value` | JSONB | NOT NULL | Setting value (supports complex types) |
| `description` | TEXT | NOT NULL | Setting purpose and usage |
| `category` | VARCHAR(100) | NOT NULL | Setting grouping |
| `isPublic` | BOOLEAN | NOT NULL, DEFAULT FALSE | Accessible to frontend |
| `isEditable` | BOOLEAN | NOT NULL, DEFAULT TRUE | Can be modified via admin UI |
| `validationSchema` | JSONB | NULLABLE | JSON schema for value validation |
| `modifiedBy` | UUID | NULLABLE, FK → Users | Last modifier |
| `modifiedAt` | TIMESTAMP | NULLABLE | Last modification timestamp |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Setting creation timestamp |

**Indexes**:
- `idx_system_settings_category` (category)
- `idx_system_settings_is_public` (isPublic)

---

## Relationships and Foreign Keys

### Primary Relationships

**Person and User Management**

1. **Persons → Users**: One-to-One
   - Each person profile has exactly one user account
   - Users reference exactly one person profile for identity

2. **Persons → PersonOrganizationAffiliations**: One-to-Many
   - Each person can have multiple organizational affiliations over time
   - Affiliation history tracks employment changes

3. **Organizations → PersonOrganizationAffiliations**: One-to-Many
   - Each organization can have multiple personnel affiliations
   - Supports personnel movement tracking across organizations

4. **Users → Users**: Many-to-One (Self-Referencing)
   - User invitation hierarchy tracking
   - Supports audit trail of who invited whom

**Transition and Organization Management**

5. **Transitions → Organizations**: Many-to-One
   - Each transition belongs to one organization
   - Organizations can have multiple transitions

6. **Transitions → TransitionUsers**: One-to-Many
   - Each transition can have multiple users
   - Users can participate in multiple transitions (via junction table)

7. **Transitions → Milestones**: One-to-Many
   - Each transition has multiple milestones
   - Milestones belong to exactly one transition

8. **Transitions → Tasks**: One-to-Many
   - Each transition contains multiple tasks
   - Tasks belong to exactly one transition

9. **Milestones → Tasks**: One-to-Many (Optional)
   - Milestones can have multiple associated tasks
   - Tasks can optionally be linked to a milestone

10. **Tasks → Tasks**: One-to-Many (Self-Referencing)
   - Tasks can have subtasks (parent-child relationship)
   - Enables hierarchical task breakdown

11. **Tasks → TaskComments**: One-to-Many
   - Each task can have multiple comments/discussions
   - Comments belong to exactly one task

12. **Transitions → Communications**: One-to-Many
   - Each transition has associated communications
   - Communications belong to exactly one transition

13. **Transitions → CalendarEvents**: One-to-Many
   - Each transition can have multiple calendar events
   - Events belong to exactly one transition

14. **Tasks/Milestones → CalendarEvents**: One-to-Many (via related entity)
    - Tasks and milestones can generate calendar events
    - Events can reference any entity type

15. **Users → NotificationPreferences**: One-to-Many
    - Each user can have multiple notification preferences
    - Preferences can be global or transition-specific

16. **Communications → Tasks/Milestones/Events**: Many-to-One (via related entity)
    - Communications can reference any entity for context
    - Enables threaded conversations around specific items

17. **Transitions → Artifacts**: One-to-Many
    - Each transition contains multiple artifacts
    - Artifacts belong to exactly one transition

18. **Artifacts → DeliverableQualityReviews**: One-to-Many
    - Each artifact can have multiple quality reviews
    - Quality reviews track iterative improvement process

19. **Users → ContractorProficiencyAssessments**: One-to-Many
    - Each contractor has multiple skill assessments over time
    - Assessments track progress in various competency areas

20. **ContractorProficiencyAssessments → ProficiencyProgressTracking**: One-to-Many
    - Each assessment contributes to longitudinal progress tracking
    - Progress tracking provides trend analysis and predictions

21. **Artifacts → KnowledgeChunks**: One-to-Many (Conditional)
    - Only quality-approved artifacts generate knowledge chunks
    - Knowledge chunks reference exactly one source artifact

22. **KnowledgeChunks → VectorEmbeddings**: One-to-One
    - Each knowledge chunk has exactly one vector embedding
    - Embeddings reference exactly one knowledge chunk

### Audit Relationships

1. **Artifacts → ArtifactAuditLog**: One-to-Many
   - Every artifact action creates an audit entry
   - Audit entries are immutable

2. **Transitions → QuerySessions**: One-to-Many
   - All queries are associated with a specific transition
   - Provides context for knowledge access patterns

3. **Tasks → TaskComments**: One-to-Many
   - All task discussions and updates are logged
   - Provides communication audit trail

4. **Communications**: Complete audit trail for all communications
   - All emails, chats, and messages logged immutably
   - Provides compliance and forensic capabilities

5. **CalendarEvents**: Meeting and event tracking
   - All calendar interactions and synchronization logged
   - External calendar integration audit trail

6. **DeliverableQualityReviews**: Quality assurance audit trail
   - All quality assessments and decisions logged immutably
   - Provides compliance trail for knowledge base content

7. **ContractorProficiencyAssessments**: Competency evaluation records
   - All skill assessments and certifications tracked
   - Supports readiness validation and compliance requirements

### Referential Integrity Rules

- **CASCADE DELETE**: Organizations → Transitions (when organization is deleted)
- **SET NULL**: Milestones.assignedTo when user is deleted
- **RESTRICT**: Artifacts cannot be deleted if referenced by KnowledgeChunks
- **CASCADE UPDATE**: All foreign key updates cascade automatically

---

## Indexing Strategy

### Performance-Critical Indexes

1. **Query Performance**:
   - `VectorEmbeddings.embedding` with IVFFlat index for similarity search
   - `Transitions.status` for dashboard filtering
   - `Artifacts.status` for approval workflows

2. **Security Lookups**:
   - `TransitionUsers(transitionId, userId)` for access control
   - `TransitionUsers.securityStatus` for clearance checks

3. **Audit Queries**:
   - `ArtifactAuditLog.performedAt` for chronological audit trails
   - `QuerySessions.createdAt` for analytics

### Composite Indexes

1. `idx_transition_users_access` ON `(transitionId, platformAccess, securityStatus)`
2. `idx_artifacts_review_queue` ON `(status, submittedAt)` WHERE `status = 'Submitted'`
3. `idx_knowledge_chunks_active` ON `(transitionId, isActive)` WHERE `isActive = true`

---

## Data Security Considerations

### Encryption Requirements

1. **At Rest**: All sensitive fields encrypted using PostgreSQL TDE
2. **In Transit**: All database connections use TLS 1.3
3. **Application Level**: PII fields use application-level encryption

### Access Control

1. **Row-Level Security**: Implemented on all core tables
2. **Role-Based Access**: Database roles mirror application roles
3. **Audit Logging**: All data access logged with user context

### Data Classification

- **Public**: System settings, organization names
- **Internal**: Transition metadata, milestone information
- **Confidential**: Artifact content, user PII
- **Restricted**: Security clearance status, audit logs

---

## Migration and Evolution Strategy

### Schema Versioning

1. **Version Control**: All schema changes tracked in version control
2. **Migration Scripts**: Idempotent migration scripts for all environments
3. **Rollback Plans**: Tested rollback procedures for all changes

### Backward Compatibility

1. **Additive Changes**: New columns added as nullable initially
2. **Deprecation Process**: 3-release deprecation cycle for removed features
3. **API Versioning**: Database changes coordinated with API versioning

### Performance Monitoring

1. **Query Performance**: Automated monitoring of slow queries
2. **Index Usage**: Regular analysis of index effectiveness
3. **Storage Growth**: Monitoring and archival strategies

---

## Implementation Notes

### Technology Integration

1. **Prisma ORM**: Schema designed for optimal Prisma generation
2. **PostgreSQL Extensions**: Requires pgvector, uuid-ossp, and pg_crypto
3. **Keycloak Integration**: User management delegated to Keycloak
4. **MinIO Integration**: File storage paths reference MinIO bucket structure

### Development Considerations

1. **Test Data**: Anonymized production data for development environments
2. **Seed Scripts**: Comprehensive seed data for local development
3. **Performance Testing**: Load testing with realistic data volumes
4. **Documentation**: Auto-generated API documentation from schema

---

*This schema serves as the authoritative data architecture blueprint for the Transition Intelligence Platform MVP and future enhancements.*