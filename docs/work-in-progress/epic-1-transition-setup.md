# Epic 1: Transition Setup & Management (Expanded for Development)

**Summary:** This epic covers the foundational features that allow a Program Manager (Brenda) to initiate, define, and monitor a new contract transition. It establishes the core workspace for all subsequent transition activities.

---

## User Story 1.0.1: System Admin - User Account Management

**As a** System Administrator,
**I want to** manage user accounts, roles, and access permissions through the Security & Access section,
**So that** I can maintain secure access control and ensure only authorized personnel can access appropriate system resources.

### Acceptance Criteria:
- System Administrator can access a comprehensive User Management interface from Security & Access section
- Admin can view all user accounts with their current status (Active, Inactive, Suspended, Locked, Pending)
- Admin can invite new users by email with role assignment and PIV requirements
- Admin can modify user roles and permissions with proper approval workflow
- Admin can deactivate/reactivate user accounts with reason tracking
- All user management actions create immutable audit log entries
- PIV status and security clearance levels are tracked and enforced
- Role-based access control prevents unauthorized account modifications

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.0.1:** Implement comprehensive User and Person management schemas according to data_schema.md
- **Task BE-1.0.2:** Create User Management API endpoints with full CRUD operations and security controls
- **Task BE-1.0.3:** Implement invitation system with token generation, expiration, and email integration
- **Task BE-1.0.4:** Build role assignment and permission management system with audit trails
- **Task BE-1.0.5:** Create user account lifecycle management (deactivation, reactivation, suspension)

#### Frontend Engineer (React/Vite)
- **Task FE-1.0.1:** Build comprehensive User Management interface in Security & Access section
- **Task FE-1.0.2:** Create user invitation workflow with role selection and PIV requirement setting
- **Task FE-1.0.3:** Implement user account status management with reason tracking
- **Task FE-1.0.4:** Build audit trail viewer for user management actions
- **Task FE-1.0.5:** Create role-based permission matrix visualization

#### QA & Test Automation Engineer
- **Task QA-1.0.1:** Write comprehensive Pact contract tests for all user management endpoints
- **Task QA-1.0.2:** Create Cypress E2E tests for complete user lifecycle management workflows
- **Task QA-1.0.3:** Implement security testing for role-based access controls and privilege escalation prevention

---

## User Story 1.0.2: System Admin - User Invitation and Registration

**As a** System Administrator,
**I want to** invite new users with specific roles and guide them through secure registration,
**So that** new team members can quickly gain appropriate access while maintaining security standards.

### Acceptance Criteria:
- Admin can send secure invitation emails with unique tokens and expiration dates
- Invitation includes role assignment, PIV requirements, and onboarding instructions
- Invited users receive clear guidance on registration requirements and security expectations
- Registration process validates PIV status and security clearance before account activation
- Failed invitations and registration attempts are logged for security monitoring
- Invitation system supports bulk invitations for team onboarding
- Re-invitation capability for expired or failed invitation attempts

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.0.6:** Implement secure invitation token generation and validation system
- **Task BE-1.0.7:** Create email service integration for invitation and notification delivery
- **Task BE-1.0.8:** Build registration verification system with PIV and clearance validation
- **Task BE-1.0.9:** Implement bulk invitation processing with status tracking
- **Task BE-1.0.10:** Create invitation lifecycle management (resend, expire, cancel)

#### Frontend Engineer (React/Vite)
- **Task FE-1.0.6:** Build user invitation interface with role selection and bulk invite capability
- **Task FE-1.0.7:** Create registration completion interface with PIV status verification
- **Task FE-1.0.8:** Implement invitation status tracking dashboard for administrators
- **Task FE-1.0.9:** Build user onboarding guidance interface with role-specific instructions
- **Task FE-1.0.10:** Create invitation management interface for resending and cancelling invites

#### QA & Test Automation Engineer
- **Task QA-1.0.3:** Write contract tests for invitation and registration workflows
- **Task QA-1.0.4:** Create E2E tests covering complete invitation-to-activation user journey
- **Task QA-1.0.5:** Implement security testing for token validation and registration bypass attempts

---

## User Story 1.0.3: System Admin - Role Assignment and Access Control

**As a** System Administrator,
**I want to** assign and modify user roles with granular permissions,
**So that** each user has appropriate access levels based on their responsibilities and security clearance.

### Acceptance Criteria:
- Admin can assign users to predefined roles (Program Manager, Government PM, Security Officer, etc.)
- Role assignments automatically configure appropriate system permissions and UI access
- Permission changes take effect immediately with session validation
- Role modifications require approval workflow for sensitive role changes
- Admin can create custom permission sets for special circumstances
- Role assignments respect PIV status and security clearance requirements
- Historical role changes are tracked with change reason and approver information

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.0.11:** Implement comprehensive RBAC system with hierarchical roles and permissions
- **Task BE-1.0.12:** Create role assignment workflow with approval process for sensitive changes
- **Task BE-1.0.13:** Build permission enforcement middleware for all API endpoints
- **Task BE-1.0.14:** Implement dynamic role validation based on PIV status and clearance level
- **Task BE-1.0.15:** Create role change audit system with approval tracking

#### Frontend Engineer (React/Vite)
- **Task FE-1.0.11:** Build role assignment interface with permission preview capability
- **Task FE-1.0.12:** Create permission matrix visualization for role understanding
- **Task FE-1.0.13:** Implement role change approval workflow interface
- **Task FE-1.0.14:** Build role-based navigation and feature visibility system
- **Task FE-1.0.15:** Create role change history and audit trail interface

#### QA & Test Automation Engineer
- **Task QA-1.0.6:** Write comprehensive tests for RBAC system and permission enforcement
- **Task QA-1.0.7:** Create E2E tests for role assignment and permission validation workflows
- **Task QA-1.0.8:** Implement privilege escalation and role bypass security testing

---

## User Story 1.0.4: System Admin - Account Deactivation and Lifecycle Management

**As a** System Administrator,
**I want to** safely deactivate user accounts while preserving audit trails and data integrity,
**So that** departing personnel lose access immediately while maintaining historical accountability.

### Acceptance Criteria:
- Admin can immediately deactivate user accounts with mandatory reason documentation
- Deactivated accounts lose all system access while preserving audit and historical data
- Account deactivation triggers notification to relevant stakeholders and system administrators
- Deactivated accounts can be reactivated with proper approval and reason documentation
- System supports temporary account suspension for security incidents or administrative holds
- Account lifecycle events integrate with audit logging and compliance reporting
- Bulk account management for organizational changes (team transfers, contract endings)

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.0.16:** Implement account deactivation system with immediate access revocation
- **Task BE-1.0.17:** Create account lifecycle state management (Active, Suspended, Deactivated)
- **Task BE-1.0.18:** Build notification system for account status changes
- **Task BE-1.0.19:** Implement account reactivation workflow with approval controls
- **Task BE-1.0.20:** Create bulk account management capabilities for organizational changes

#### Frontend Engineer (React/Vite)
- **Task FE-1.0.16:** Build account deactivation interface with reason tracking and confirmation
- **Task FE-1.0.17:** Create account status management dashboard with lifecycle visualization
- **Task FE-1.0.18:** Implement bulk account operations interface for organizational changes
- **Task FE-1.0.19:** Build account reactivation workflow with approval request system
- **Task FE-1.0.20:** Create account lifecycle reporting and analytics interface

#### QA & Test Automation Engineer
- **Task QA-1.0.9:** Write tests for account deactivation and immediate access revocation
- **Task QA-1.0.10:** Create E2E tests for complete account lifecycle management workflows
- **Task QA-1.0.11:** Implement security testing for deactivated account access prevention

---

## User Story 1.0.5: Security Officer - PIV Status and Clearance Management

**As a** Security Officer,
**I want to** monitor and manage PIV status and security clearance levels for all users,
**So that** access controls align with current security requirements and compliance standards.

### Acceptance Criteria:
- Security Officer can view comprehensive PIV status dashboard for all users
- System tracks PIV card validation, expiration dates, and exception statuses
- Security clearance levels are monitored with expiration tracking and renewal alerts
- PIV exceptions require documented justification and have automatic expiration
- Access levels automatically adjust based on PIV status and clearance changes
- Security Officer receives alerts for expiring clearances and PIV exceptions
- Compliance reporting available for security audits and reviews

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.0.21:** Implement PIV status tracking and validation system
- **Task BE-1.0.22:** Create security clearance management with expiration monitoring
- **Task BE-1.0.23:** Build PIV exception workflow with justification and approval tracking
- **Task BE-1.0.24:** Implement automated access level adjustment based on security status
- **Task BE-1.0.25:** Create security alert system for expiring credentials and exceptions

#### Frontend Engineer (React/Vite)
- **Task FE-1.0.21:** Build PIV status dashboard with comprehensive user security overview
- **Task FE-1.0.22:** Create security clearance management interface with renewal tracking
- **Task FE-1.0.23:** Implement PIV exception management workflow with justification capture
- **Task FE-1.0.24:** Build security alert dashboard with expiration and compliance monitoring
- **Task FE-1.0.25:** Create security compliance reporting interface with audit trail export

#### QA & Test Automation Engineer
- **Task QA-1.0.12:** Write tests for PIV validation and security clearance systems
- **Task QA-1.0.13:** Create E2E tests for security status management workflows
- **Task QA-1.0.14:** Implement compliance testing for security requirement enforcement

---

## User Story 1.1.1: Create New Transition Project

**As a** Government PM (Brenda),
**I want to** create a new transition project and define its core metadata (contract number, scope, key personnel),
**So that** I can establish a centralized, authoritative workspace for the transition.

### Acceptance Criteria:
- A Program Manager must be able to access a "New Transition" form.
- The form must capture Contract Name, Contract Number, and Key Dates.
- Upon successful submission, a new transition record is created in the database.
- The user is redirected to the dedicated "Project Hub" for the newly created transition.
- Only users with the "Program Manager" role can create a new transition.

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.1.1:** Define a new PostgreSQL schema for a `transitions` table. Include columns for `id`, `contract_name`, `contract_number`, `start_date`, `end_date`, and a default `status` (e.g., 'Not Started').
- **Task BE-1.1.2:** Create a new API endpoint: `POST /api/transitions`.
- **Task BE-1.1.3:** Secure the endpoint using Keycloak, ensuring only users with the `program_manager` role can access it.
- **Task BE-1.1.4:** Implement request body validation using Zod to ensure all required fields are present and correctly formatted.
- **Task BE-1.1.5:** The endpoint should persist the new transition to the database and return the created object with a `201 Created` status.

#### Frontend Engineer (React/Vite)
- **Task FE-1.1.1:** Create a "New Transition" button component using `shadcn/ui` Button. This button should be prominently displayed on the main dashboard and only visible to users with the PM role.
- **Task FE-1.1.2:** Develop a "New Transition" form as a page or modal, using `shadcn/ui` components (Input, DatePicker, Textarea) that adhere to the `style-guide.md`.
- **Task FE-1.1.3:** Implement client-side form validation to provide immediate feedback to the user.
- **Task FE-1.1.4:** On form submission, call the `POST /api/transitions` endpoint.
- **Task FE-1.1.5:** On a successful API response, redirect the user to the new Project Hub URL (e.g., `/transitions/:id`).

#### QA & Test Automation Engineer
- **Task QA-1.1.1:** Write a Pact contract test for the `POST /api/transitions` endpoint, covering success (201), validation error (400), and authorization error (403) scenarios.
- **Task QA-1.1.2:** Write a Cypress E2E test for the "Create New Transition" flow:
    1. Log in as a Program Manager.
    2. Click the "New Transition" button.
    3. Fill out and submit the form.
    4. Verify redirection to the new Project Hub page.
    5. Verify the new transition appears on the main dashboard.

---

## User Story 1.2.1: Define Transition Timeline

**As a** Government PM (Brenda),
**I want to** create a transition plan with key milestones, tasks, and deadlines,
**So that** all parties have a clear and shared understanding of the schedule.

### Acceptance Criteria:
- Within a Project Hub, a PM can view a list of milestones.
- A PM can add a new milestone with a title, description, and due date.
- A PM can edit and delete existing milestones.
- The milestone list should be clearly visible within the Project Hub.

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.2.1:** Define a new PostgreSQL schema for a `milestones` table with a foreign key relationship to the `transitions` table.
- **Task BE-1.2.2:** Create full CRUD API endpoints for milestones, nested under a specific transition:
    - `GET /api/transitions/:id/milestones`
    - `POST /api/transitions/:id/milestones`
    - `PUT /api/transitions/:id/milestones/:milestoneId`
    - `DELETE /api/transitions/:id/milestones/:milestoneId`
- **Task BE-1.2.3:** Secure all milestone endpoints, ensuring they are only accessible by PMs associated with that transition.

#### Frontend Engineer (React/Vite)
- **Task FE-1.2.1:** In the Project Hub, create a "Timeline" tab or section.
- **Task FE-1.2.2:** Develop a component to display milestones using the `shadcn/ui` Table component.
- **Task FE-1.2.3:** Implement a form (e.g., in a `Dialog` component) to add and edit milestones.
- **Task FE-1.2.4:** Wire up the UI to the backend API endpoints for creating, reading, updating, and deleting milestones.

#### QA & Test Automation Engineer
- **Task QA-1.2.1:** Write Pact contract tests for all `milestones` API endpoints.
- **Task QA-1.2.2:** Write a Cypress E2E test for the milestone management flow:
    1. Navigate to a Project Hub.
    2. Add a new milestone and verify it appears in the list.
    3. Edit the milestone and verify the changes.
    4. Delete the milestone and verify it is removed.

---

## User Story 1.3.1: View High-Level Status

**As a** Government PM (Brenda),
**I want to** see a high-level dashboard of my active transition, with manually updated status indicators (e.g., On Track, At Risk),
**So that** I can quickly assess its health and report to leadership.

### Acceptance Criteria:
- The Project Hub must display a large, clear status indicator for the transition.
- A PM must be able to manually change the status (e.g., from 'On Track' to 'At Risk').
- The main dashboard must show a list of all active transitions with their current status.
- The status indicator colors must align with the semantic colors in the style guide (Success, Warning, Error).

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-1.3.1:** Add a `status` column of type `enum` to the `transitions` table (e.g., 'On Track', 'At Risk', 'Blocked').
- **Task BE-1.3.2:** Create an endpoint to update a transition's status: `PATCH /api/transitions/:id`.
- **Task BE-1.3.3:** Create an endpoint to get a list of all transitions for the logged-in PM: `GET /api/transitions`.

#### Frontend Engineer (React/Vite)
- **Task FE-1.3.1:** On the Project Hub's "Overview" tab, create a status indicator component (e.g., using `Badge` from `shadcn/ui`). The color should dynamically change based on the status value, using colors from the `style-guide.md` (e.g., `bg-success` for 'On Track').
- **Task FE-1.3.2:** Add a `Select` or `DropdownMenu` component to allow the PM to change the status.
- **Task FE-1.3.3:** On the main dashboard, fetch and display the list of transitions in cards, each showing the transition name and its current status indicator.

#### QA & Test Automation Engineer
- **Task QA-1.3.1:** Write a Pact contract test for the `PATCH /api/transitions/:id` status update endpoint.
- **Task QA-1.3.2:** Write a Cypress E2E test for the status update flow:
    1. Navigate to a Project Hub.
    2. Change the project's status.
    3. Verify the indicator color and text change.
    4. Navigate back to the main dashboard and verify the status is updated there as well.