# Epic 1: Transition Setup & Management - Detailed User Stories

**Epic Summary:** This epic covers the foundational features that allow a Program Manager (Brenda) to manage business operations, define contracts within operational context, and initiate contract transitions. It establishes the hierarchical structure (Business Operation → Contract → Transition) and core workspace for all transition activities, ensuring continuous service delivery and proper stakeholder coordination.

---

## 0. Business Operation Management

### User Story 0.1.1: Create Business Operation

**As a** Government PM (Brenda),
**I want to** create and define a new business operation with its scope, objectives, and governance structure,
**So that** I can establish the foundational context for all related contracts and transitions.

#### Acceptance Criteria:
- PM can access "New Business Operation" functionality from the main dashboard
- Form captures Operation Name, Business Function, Technical Domain, and Description
- Form captures Support Period (start/end dates) and Current Contract End Date
- Form captures Operation Objectives and Performance Metrics (operational, quality, compliance)
- Form captures Current Operation Manager and assigns Government PM and Director
- Operation scope definition includes functional and technical boundaries
- Form validation prevents submission with missing required fields
- Success notification displayed upon creation
- Operation appears in Business Operations list immediately after creation

#### Related Stories:
- 0.1.2 (View Business Operation Details)
- 0.1.3 (Update Business Operation Information)
- 0.2.1 (Manage Operation Stakeholders)
- 1.1.1 (Create New Transition Project)

#### Test Approach:
- **Unit Tests:** Form validation logic, business rules validation
- **Integration Tests:** Database creation, relationship establishment
- **End-to-End Tests:** Full operation creation workflow
- **Security Tests:** Role-based access control verification

---

### User Story 0.1.2: View Business Operation Details

**As a** Government PM (Brenda),
**I want to** view comprehensive details of a business operation including its scope, contracts, and current status,
**So that** I can understand the operational context before initiating transitions.

#### Acceptance Criteria:
- PM can access operation details from the Business Operations list
- Details view shows operation metadata: name, function, domain, scope
- Details view shows support period, current contract end date, and renewal status
- Details view shows current operation manager and assigned government personnel
- Details view shows operation objectives and current performance metrics
- Details view lists all associated contracts with their status and contractors
- Details view shows upcoming transition requirements (6-month planning window)
- Page loads within 2 seconds with proper error handling

#### Related Stories:
- 0.1.1 (Create Business Operation)
- 0.1.3 (Update Business Operation Information)
- 1.1.1 (Create New Transition Project)

---

### User Story 0.1.3: Update Business Operation Information

**As a** Government PM (Brenda) or Director,
**I want to** modify business operation details, objectives, and performance metrics,
**So that** I can keep operations aligned with current business requirements and strategic roadmaps.

#### Acceptance Criteria:
- Only Government PM and Director roles can edit operation information
- Edit form pre-populated with current operation data
- Editable fields include: objectives, performance metrics, scope description
- Changes to objectives require Director approval if PM is not Director
- Form validation ensures data integrity and business rule compliance
- Audit trail captures all changes with timestamp and user information
- Updated information immediately reflected in operation details view
- Stakeholders receive notifications for significant changes

#### Related Stories:
- 0.1.1 (Create Business Operation)
- 0.1.2 (View Business Operation Details)
- 0.2.1 (Manage Operation Stakeholders)

---

## 0.2. Operation Stakeholder Management

### User Story 0.2.1: Manage Operation Stakeholders

**As a** Government PM (Brenda),
**I want to** define and manage stakeholders for each business operation,
**So that** I can ensure proper communication and coordination during transitions.

#### Acceptance Criteria:
- PM can add stakeholders from operation details page
- Stakeholder types include: Internal Program, Internal Technical, Internal Executive, External Vendor, External Service, External SME Resource, Incoming Contractor
- Each stakeholder captures: name, role, contact information, organization
- System supports multiple stakeholders per type per operation
- Notification preferences configured for Internal Program, Technical, Executive, and Incoming Contractor types
- Stakeholder list displays with filtering and search capabilities
- Stakeholders can be marked as active/inactive without deletion
- Bulk stakeholder management for operations with similar requirements

#### Related Stories:
- 0.1.1 (Create Business Operation)
- 0.2.2 (Stakeholder Notifications)
- 1.1.1 (Create New Transition Project)

---

### User Story 0.2.2: Stakeholder Notifications

**As a** Government PM (Brenda),
**I want to** configure and send notifications to operation stakeholders based on transition events,
**So that** stakeholders stay informed and can take necessary actions.

#### Acceptance Criteria:
- Notification triggers include: transition initiation, milestone updates, status changes
- Only Internal Program, Technical, Executive, and Incoming Contractor receive notifications
- Email notifications with customizable templates per stakeholder type
- Notification preferences per stakeholder (immediate, daily digest, weekly summary)
- Dashboard notifications for urgent items requiring immediate attention
- Notification history and delivery status tracking
- Bulk notification capability for operation-wide communications
- Notification escalation for overdue responses or critical milestones

---

## 0.3. Operation-Contract-Transition Relationships

### User Story 0.3.1: Associate Contracts with Business Operations

**As a** Government PM (Brenda),
**I want to** link contracts to their parent business operations,
**So that** transitions inherit proper operational context and requirements.

#### Acceptance Criteria:
- Contract creation requires selection of parent Business Operation
- Contract inherits operation stakeholders as default (with ability to customize)
- Contract displays operation scope, objectives, and performance metrics
- Multiple contracts can be associated with single operation for different functional areas
- Contract-operation relationship cannot be changed once transitions are initiated
- Operation dashboard shows all associated contracts and their status
- Contract end date validation against operation support period
- Sequential contract release dates supported with flexible scheduling

#### Related Stories:
- 0.1.1 (Create Business Operation)
- 1.1.1 (Create New Transition Project)
- 0.3.2 (Transition Planning Timeline)

---

### User Story 0.3.2: Transition Planning Timeline

**As a** Government PM (Brenda),
**I want to** view transition planning requirements based on contract end dates and operation continuity needs,
**So that** I can initiate transitions at the appropriate 6-month planning window.

#### Acceptance Criteria:
- Dashboard shows operations requiring transition planning (6 months from contract end)
- Timeline view displays contract end dates, transition durations (30/45/60/90 days), and overlap periods
- Visual indicators for operations approaching transition deadlines
- Alerts for contracts requiring immediate attention or at risk of service interruption
- Transition duration selection based on operation complexity and requirements
- Continuous service requirements clearly marked for zero-downtime planning
- Contract extension processes and approval workflows integrated
- Automated notifications for transition planning initiation triggers

#### Related Stories:
- 0.3.1 (Associate Contracts with Business Operations)
- 1.1.1 (Create New Transition Project)
- 1.2.1 (Create Transition Milestones)

---

## 1. Transition Project Management

### User Story 1.1.1: Create New Transition Project
Status: Partially Implemented
Verification Notes:
- UI: NewTransitionDialog on DashboardPage with PM-only visibility; redirects to Project Hub on 201.
- API: POST /api/transitions returns 201 and object; schema validation in service.
- Gaps to close: Backend RBAC (Keycloak) for PM-only enforcement; stakeholder notifications; validate dates against Contract end; persist Contract/BusinessOperation linkage in Transition.

**As a** Government PM (Brenda),
**I want to** create a new transition project within the context of an existing Business Operation and Contract,
**So that** I can establish a centralized, authoritative workspace for the transition with proper operational context.

#### Acceptance Criteria:
- A Program Manager must be able to access a "New Transition" form from a Contract within a Business Operation
- The form must capture Transition Name, Contract selection (from parent Business Operation), Transition Start Date, Transition End Date, and Transition Duration (30/45/60/90 days)
- Form inherits and displays Business Operation context: operation name, scope, stakeholders, performance metrics
- Form validates transition dates against contract end date and ensures continuous service requirements
- Form validation must prevent submission with missing required fields or invalid date ranges
- Transition duration automatically calculated and validated against operational requirements
- Upon successful submission, a new transition record is created with links to contract and business operation
- The user is redirected to the dedicated "Project Hub" for the newly created transition
- Only users with the "Program Manager" role can create a new transition
- Success notification must be displayed upon successful creation
- Relevant stakeholders (Internal Program, Technical, Executive, Incoming Contractor) receive notification

#### Related Stories:
- 0.1.2 (View Business Operation Details)
- 0.3.1 (Associate Contracts with Business Operations)
- 0.3.2 (Transition Planning Timeline)
- 1.1.2 (Read Transition Details)
- 1.1.3 (Update Transition Information) 
- 1.1.4 (List All Transitions)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** Form validation logic, API endpoint validation
- **Integration Tests:** Database creation, role-based access control
- **End-to-End Tests:** Full user workflow from form to Project Hub
- **Contract Tests:** API endpoint behavior verification

#### Test Steps:
1. **Positive Path:**
   - Log in as Program Manager
   - Navigate to dashboard
   - Click "New Transition" button
   - Fill all required fields with valid data
   - Submit form
   - Verify redirect to Project Hub
   - Verify transition appears in database
   - Verify success notification displayed

2. **Negative Path:**
   - Attempt form submission with missing required fields
   - Verify validation errors displayed
   - Attempt access as non-PM user
   - Verify access denied

3. **Edge Cases:**
   - Test with maximum field lengths
   - Test special characters in contract names
   - Test duplicate contract numbers

---

### User Story 1.1.2: View Transition Project Details

**As a** Government PM (Brenda),
**I want to** view detailed information about a specific transition project,
**So that** I can review current project parameters and make informed decisions.

#### Acceptance Criteria:
- PM can access Project Hub by clicking on transition from dashboard
- Project Hub displays all transition metadata (contract name, number, dates, personnel)
- Information is read-only on the details view
- Page loads within 2 seconds
- Error handling for non-existent transitions
- Breadcrumb navigation shows current location

#### Related Stories:
- 1.1.1 (Create New Transition)
- 1.1.3 (Update Transition Information)
- 1.2.1 (Define Transition Timeline)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** Component rendering with mock data
- **Integration Tests:** API data fetching and display
- **End-to-End Tests:** Navigation flow from dashboard to details
- **Performance Tests:** Page load time verification

#### Test Steps:
1. **Positive Path:**
   - Navigate to transition list
   - Click on specific transition
   - Verify all project details displayed correctly
   - Verify page loads within performance threshold
   - Test breadcrumb navigation

2. **Negative Path:**
   - Navigate to non-existent transition ID
   - Verify appropriate error message
   - Test network failure scenarios
   - Verify graceful degradation

3. **Edge Cases:**
   - Test with very long contract names
   - Test with special characters in data
   - Test with missing optional fields

---

### User Story 1.1.3: Update Transition Project Information

**As a** Government PM (Brenda),
**I want to** modify existing transition project details,
**So that** I can keep project information current and accurate as circumstances change.

#### Acceptance Criteria:
- PM can access edit mode from Project Hub
- All editable fields pre-populated with current values
- Form validation prevents invalid data submission
- Changes are saved to database upon successful submission
- Audit trail tracks who made changes and when
- Confirmation required for significant changes (contract number, dates)
- User returned to read-only view after successful update

#### Related Stories:
- 1.1.1 (Create New Transition)
- 1.1.2 (View Transition Details)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** Form validation, data binding
- **Integration Tests:** Database updates, audit logging
- **End-to-End Tests:** Full edit workflow
- **Security Tests:** Authorization verification

#### Test Steps:
1. **Positive Path:**
   - Navigate to Project Hub
   - Click "Edit" button
   - Modify various fields
   - Submit changes
   - Verify updates saved
   - Verify audit trail created
   - Verify return to read-only view

2. **Negative Path:**
   - Submit form with invalid data
   - Verify validation errors
   - Test unauthorized access attempts
   - Test concurrent edit scenarios

3. **Edge Cases:**
   - Test partial form completion
   - Test browser refresh during edit
   - Test network interruption during save

---

### User Story 1.1.4: List All Active Transitions

**As a** Government PM (Brenda),
**I want to** view a comprehensive list of all my active transition projects,
**So that** I can navigate between projects and monitor overall portfolio status.

#### Acceptance Criteria:
- Dashboard displays all transitions accessible to current PM
- Each transition shows key information: name, contract number, status, dates
- List supports sorting by name, date, or status
- Search functionality to filter transitions
- Pagination for large numbers of transitions
- Click on transition navigates to Project Hub
- Visual indicators for overdue or at-risk transitions

#### Related Stories:
- 1.1.1 (Create New Transition)
- 1.1.2 (View Transition Details)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** List rendering, sorting, filtering logic
- **Integration Tests:** Data fetching, pagination
- **End-to-End Tests:** Navigation and search functionality
- **Performance Tests:** Large dataset handling

#### Test Steps:
1. **Positive Path:**
   - Log in as PM with multiple transitions
   - Verify all transitions displayed
   - Test sorting by different columns
   - Test search functionality
   - Test pagination controls
   - Click transition to navigate to details

2. **Negative Path:**
   - Test empty transition list
   - Test search with no results
   - Test invalid sort parameters

3. **Edge Cases:**
   - Test with maximum number of transitions
   - Test very long transition names
   - Test special characters in search

---

## 2. Milestone and Timeline Management

### User Story 1.2.1: Create Transition Milestones
Status: Implemented (Pending QA)
Verification Notes:
- API present: POST/GET/PUT/DELETE nested under /api/transitions/:transitionId/milestones with Zod schemas and audit.
- Validations: dueDate not past; within transition timeframe; pagination and filters.
- UI: Project Hub page shows milestones; add, edit, and delete supported and wired to API.

**As a** Government PM (Brenda),
**I want to** create milestones with titles, descriptions, and due dates for my transition project,
**So that** I can establish clear checkpoints and deadlines for the transition process.

#### Acceptance Criteria:
- PM can access "Add Milestone" functionality from Timeline section
- Form captures milestone title, description, due date, and priority level
- Due date validation ensures logical sequencing
- Milestone is associated with current transition project
- Success confirmation displayed after creation
- New milestone appears in timeline view immediately

#### Related Stories:
- 1.2.2 (View Milestone List)
- 1.2.3 (Update Milestone Information)
- 1.2.4 (Delete Milestones)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** Form validation, date logic
- **Integration Tests:** Database persistence, relationship integrity
- **End-to-End Tests:** Full milestone creation workflow
- **Contract Tests:** API endpoint validation

#### Test Steps:
1. **Positive Path:**
   - Navigate to Project Hub Timeline section
   - Click "Add Milestone" 
   - Fill required fields with valid data
   - Submit form
   - Verify milestone created in database
   - Verify milestone appears in timeline view
   - Verify success notification

2. **Negative Path:**
   - Submit form with missing required fields
   - Use invalid date formats
   - Create milestone with past due date
   - Verify appropriate error messages

3. **Edge Cases:**
   - Test with maximum description length
   - Test duplicate milestone titles
   - Test creating milestone for completed project

---

### User Story 1.2.2: View Milestone Timeline

**As a** Government PM (Brenda),
**I want to** see all milestones for my transition displayed in chronological order,
**So that** I can understand the project timeline and track progress.

#### Acceptance Criteria:
- Timeline section displays all milestones for current transition
- Milestones sorted chronologically by due date
- Visual indicators for completed, upcoming, and overdue milestones
- Each milestone shows title, description, due date, and status
- Timeline view is easily scannable and intuitive
- Filter options for milestone status (all, pending, completed, overdue)

#### Related Stories:
- 1.2.1 (Create Milestones)
- 1.2.3 (Update Milestone Information)
- 1.2.4 (Delete Milestones)
- 1.3.1 (View High-Level Status)

#### Test Approach:
- **Unit Tests:** Timeline rendering, sorting logic, filtering
- **Integration Tests:** Data fetching and display
- **End-to-End Tests:** Timeline navigation and interaction
- **Visual Tests:** UI consistency and accessibility

#### Test Steps:
1. **Positive Path:**
   - Navigate to Timeline section with multiple milestones
   - Verify chronological ordering
   - Test status filter functionality
   - Verify visual status indicators
   - Test responsive layout on different screen sizes

2. **Negative Path:**
   - Test timeline with no milestones
   - Test loading states and error conditions
   - Test with corrupted milestone data

3. **Edge Cases:**
   - Test with many milestones (50+)
   - Test milestones with same due dates
   - Test very long milestone descriptions

---

### User Story 1.2.3: Update Milestone Information

**As a** Government PM (Brenda),
**I want to** edit existing milestone details including dates and descriptions,
**So that** I can adapt the timeline as project requirements evolve.

#### Acceptance Criteria:
- PM can access edit functionality for individual milestones
- Edit form pre-populated with current milestone data
- Date changes validated for logical sequencing
- Status can be updated (pending, in-progress, completed, blocked)
- Changes immediately reflected in timeline view
- Audit trail captures milestone modifications

#### Related Stories:
- 1.2.1 (Create Milestones)
- 1.2.2 (View Milestone Timeline)
- 1.2.4 (Delete Milestones)

#### Test Approach:
- **Unit Tests:** Form validation, status logic
- **Integration Tests:** Database updates, audit logging
- **End-to-End Tests:** Edit workflow completion
- **Security Tests:** Authorization checks

#### Test Steps:
1. **Positive Path:**
   - Select milestone from timeline
   - Click edit option
   - Modify various fields
   - Submit changes
   - Verify updates reflected in timeline
   - Verify audit trail created

2. **Negative Path:**
   - Submit with invalid data
   - Test unauthorized edit attempts
   - Test editing deleted milestone

3. **Edge Cases:**
   - Test editing milestone during status transitions
   - Test concurrent editing by multiple users
   - Test editing with network interruptions

---

### User Story 1.2.4: Delete Transition Milestones

**As a** Government PM (Brenda),
**I want to** remove milestones that are no longer relevant to the transition,
**So that** the timeline remains accurate and focused on current objectives.

#### Acceptance Criteria:
- PM can access delete functionality for individual milestones
- Confirmation dialog required before deletion
- Milestone removed from timeline immediately after confirmation
- Soft delete preserves audit trail
- Cannot delete milestones with dependencies
- Bulk delete option for multiple milestones

#### Related Stories:
- 1.2.1 (Create Milestones)
- 1.2.2 (View Milestone Timeline)
- 1.2.3 (Update Milestone Information)

#### Test Approach:
- **Unit Tests:** Delete confirmation logic
- **Integration Tests:** Soft delete implementation
- **End-to-End Tests:** Delete workflow verification
- **Data Tests:** Audit trail preservation

#### Test Steps:
1. **Positive Path:**
   - Select milestone for deletion
   - Confirm deletion in dialog
   - Verify milestone removed from timeline
   - Verify soft delete in database
   - Test bulk delete functionality

2. **Negative Path:**
   - Cancel deletion confirmation
   - Attempt to delete milestone with dependencies
   - Test unauthorized delete attempts

3. **Edge Cases:**
   - Delete milestone during edit session
   - Test deletion of completed milestones
   - Test restoration of soft-deleted milestones

---

## 3. Status and Dashboard Management

### User Story 1.3.1: Update Transition Status
Status: Implemented (Pending QA)
Verification Notes:
- API present: PATCH /api/transitions/:id/status with audit logging.
- UI added: Status Select on ProjectHubPage updates status via API and refreshes local state; badge colors align with style.
- Next: Add Cypress E2E to assert badge and dashboard reflect updates.

**As a** Government PM (Brenda),
**I want to** manually update the high-level status of my transition project,
**So that** stakeholders can quickly understand project health and risks.

#### Acceptance Criteria:
- PM can change status from Project Hub overview
- Status options: "On Track", "At Risk", "Blocked", "Completed"
- Status change immediately reflected in visual indicators
- Status updates logged with timestamp and user information
- Dashboard list view shows updated status
- Color coding follows style guide semantic colors

#### Related Stories:
- 1.3.2 (View Status Dashboard)
- 1.1.2 (View Transition Details)
- 1.1.4 (List All Transitions)

#### Test Approach:
- **Unit Tests:** Status validation, color mapping
- **Integration Tests:** Status persistence, audit logging
- **End-to-End Tests:** Status change workflow
- **Visual Tests:** Color consistency verification

#### Test Steps:
1. **Positive Path:**
   - Navigate to Project Hub overview
   - Change status via dropdown/selector
   - Verify immediate visual update
   - Verify status reflected on dashboard
   - Verify audit log created

2. **Negative Path:**
   - Test invalid status values
   - Test unauthorized status changes
   - Test status changes on archived projects

3. **Edge Cases:**
   - Test rapid status changes
   - Test status changes during system maintenance
   - Test status rollback scenarios

---

### User Story 1.3.2: View Status Dashboard

**As a** Government PM (Brenda),
**I want to** see a high-level overview of all my transitions with their current status,
**So that** I can quickly identify projects needing attention and report to leadership.

#### Acceptance Criteria:
- Dashboard displays all accessible transitions with status indicators
- Visual differentiation for different status types using semantic colors
- Quick statistics showing count of projects by status
- Filter and sort options by status, date, or priority
- Click-through navigation to detailed project views
- Export functionality for status reports

#### Related Stories:
- 1.3.1 (Update Transition Status)
- 1.1.4 (List All Transitions)
- 1.1.2 (View Transition Details)

#### Test Approach:
- **Unit Tests:** Dashboard rendering, statistics calculation
- **Integration Tests:** Data aggregation, filtering
- **End-to-End Tests:** Dashboard navigation workflow
- **Performance Tests:** Large dataset handling

#### Test Steps:
1. **Positive Path:**
   - Navigate to main dashboard
   - Verify all transitions displayed with correct status
   - Test status-based filtering
   - Test statistics accuracy
   - Test export functionality
   - Navigate to project details

2. **Negative Path:**
   - Test dashboard with no projects
   - Test invalid filter combinations
   - Test export with no data

3. **Edge Cases:**
   - Test dashboard with mixed permissions
   - Test real-time status updates
   - Test dashboard during data synchronization

---

### User Story 1.3.3: Generate Status Reports

**As a** Government PM (Brenda),
**I want to** generate executive summary reports showing transition status and key metrics,
**So that** I can provide leadership with accurate and timely project updates.

#### Acceptance Criteria:
- Report generation accessible from dashboard or Project Hub
- Report includes project overview, status summary, milestone progress
- Multiple export formats supported (PDF, Excel, PowerPoint)
- Report templates customizable for different audiences
- Scheduled report generation capability
- Reports include charts and visual status indicators

#### Related Stories:
- 1.3.1 (Update Transition Status)
- 1.3.2 (View Status Dashboard)
- 1.2.2 (View Milestone Timeline)

#### Test Approach:
- **Unit Tests:** Report data compilation, template rendering
- **Integration Tests:** Export functionality, scheduling
- **End-to-End Tests:** Full report generation workflow
- **Performance Tests:** Large report generation

#### Test Steps:
1. **Positive Path:**
   - Navigate to report generation
   - Select report parameters and template
   - Generate report in various formats
   - Verify report content accuracy
   - Test scheduled report delivery

2. **Negative Path:**
   - Test report generation with incomplete data
   - Test invalid report parameters
   - Test report generation failures

3. **Edge Cases:**
   - Test reports with large datasets
   - Test custom template functionality
   - Test report generation during system load

---

## Cross-Cutting Test Considerations

### Performance Requirements:
- All list views must load within 2 seconds
- Form submissions must complete within 3 seconds
- Dashboard must handle up to 100 concurrent users
- Database queries optimized for sub-second response times

### Security Requirements:
- All endpoints protected with role-based authentication
- Audit trails for all data modifications
- Input validation and sanitization
- Protection against common web vulnerabilities

### Accessibility Requirements:
- WCAG 2.1 AA compliance for all interfaces
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### Browser Compatibility:
- Support for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Responsive design for tablets and mobile devices
- Progressive enhancement for older browsers

---

## Definition of Done

For each user story to be considered complete, the following criteria must be met:

1. **Functionality:** All acceptance criteria verified through testing
2. **Code Quality:** Code review completed and approved
3. **Testing:** Unit tests, integration tests, and E2E tests passing
4. **Documentation:** API documentation and user guides updated
5. **Security:** Security review completed for new endpoints
6. **Performance:** Performance requirements validated
7. **Accessibility:** Accessibility audit passed
8. **Browser Testing:** Cross-browser compatibility verified
9. **Deployment:** Successfully deployed to staging environment
10. **Stakeholder Approval:** Product Owner acceptance confirmed
