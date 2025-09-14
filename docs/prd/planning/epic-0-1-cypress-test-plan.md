**Cypress E2E Test Plan — Epic 0 and Epic 1**

**Scope**
- Validate end-to-end user journeys and critical flows for:
  - Epic 0: User Management System (Security dashboard and related operations)
  - Epic 1: Transition setup, Milestones CRUD, Tasks (CRUD + hierarchy), and Planning View
- Cover happy paths, key edge cases, and error handling; ensure routes are reachable behind Traefik and in localhost.

**Assumptions**
- Auth Bypass header is used in dev (`x-auth-bypass: true`) via the UI toggle.
- DB is seeded with baseline org/users/contracts/transitions; test suites can create and delete entities without affecting production.
- Base URL for Cypress points to the Traefik frontend (`http://tip.localhost`) with API proxy (`http://api.tip.localhost`).

**Tooling & Conventions**
- Cypress v15 headless in CI; headed locally for development.
- Data setup via API calls where possible (e.g., create transition, milestone, task).
- Use stable selectors (`data-testid`) where necessary; otherwise, target semantic labels and accessible roles.
- Prefer deterministic waits (assert for network responses/UI states) over arbitrary timeouts.

**Global Setup**
- cypress.config.ts
  - baseUrl: `http://tip.localhost`
  - retries: { runMode: 2, openMode: 0 }
  - video/screenshots enabled in CI
- Support commands (cypress/support/commands.ts)
  - cy.toggleAuthBypass(true|false) → sets localStorage `authBypass` and reloads
  - cy.createTransition(), cy.createMilestone(transitionId, payload), cy.createTask(transitionId, payload)
  - cy.cleanUpTransition(id), cy.deleteMilestone(id), cy.deleteTask(id)
- Fixtures
  - seed users, transitions, and default payloads for milestones/tasks

**Data Reset Strategy**
- Each suite creates isolated data and cleans it up via API on after/afterEach.
- Use unique suffix (timestamp) in titles to avoid collisions; rely on backend idempotency when provided.

**Test Matrix (Specs)**

1) smoke/smoke_stack.cy.ts
- Visits `/` and verifies primary navigation and “Transitions Overview” presence
- GET `/api/health` returns 200 (via cy.request)

2) security/security_users.cy.ts (Epic 0)
- Toggle Auth Bypass ON in UI
- Navigate `/security`, list users paginated, verify 6 seeded users
- Filter/search by name/email; clear filters
- Open a user detail dialog (if present) or navigate to detail view, verify key fields

3) security/security_invite_user.cy.ts (Epic 0)
- Open invite dialog, validate required fields, submit valid invite
- Assert success UI and presence in list with PENDING status
- Edge: invalid email → error message displayed

4) security/security_update_status.cy.ts (Epic 0)
- Change a user’s account status (ACTIVE → SUSPENDED → ACTIVE), verify toasts and list updates
- Edge: attempting invalid transition yields proper error (if enforced)

5) transitions/transitions_overview.cy.ts (Epic 1)
- Navigate to Transitions list, verify rows and basic columns
- Click through to Project Hub and Enhanced Transition Detail routes

6) transitions/project_hub_milestones_crud.cy.ts (Epic 1)
- Create Milestone (Title, Due Date, Priority, Description), verify visible
- Edit the milestone inline: change Title/Date/Priority/Status/Description
- Delete milestone and verify it disappears
- Edge: create with past date → shows backend error

7) transitions/enhanced_detail_milestones_crud.cy.ts (Epic 1)
- Repeat the Milestones CRUD set on Enhanced Transition Detail page
- Ensure counts/visibility updated as expected

8) transitions/transition_status_patch.cy.ts (Epic 1)
- Change Transition status (NOT_STARTED → ON_TRACK → AT_RISK → BLOCKED → COMPLETED), validate UI and API

9) tasks/tasks_crud_project_hub.cy.ts (Epic 1)
- Add Task with Title/Due/Priority/Description; verify list update
- Edit Task inline (Title/Due/Priority/Status/Description)
- Delete Task; verify update
- Edge: due date outside transition window → error message displayed

10) tasks/tasks_crud_enhanced_detail.cy.ts (Epic 1)
- Add Task; verify list
- Add Subtask via “Add Subtask” button; verify created
- Edit Task (incl. status), delete
- Associate Task with a Milestone via edit dropdown; verify saved and visible in planning view (optional cross-check)

11) tasks/planning_view_tree.cy.ts (Epic 1)
- Navigate `/transitions/:id/tasks-milestones` or `/tasks` selector
- Unassigned: add a root task; verify sequence 1, 2, … ordering
- Add subtask (indent): verify nested sequence (e.g., 1.1)
- Reorder with Up/Down; verify sequences update (1, 2 → 2, 1)
- Outdent to parent’s sibling group; verify sequence updates
- Milestone group: add task within group and verify association

12) tasks/planning_view_move_reparent.cy.ts (Epic 1)
- Move a task between milestones using controls (outdent to root, then re-add under another group)
- Verify API returns updated parent/milestone and UI reflects change

13) tasks/validation_and_errors.cy.ts (Epic 1)
- Create task with past due → expect 400 and UI alert
- Create task with milestone from another transition (simulated) → expect error message from backend validation

14) business_ops/business_operations_basic.cy.ts (Epic 1 context)
- Navigate `Business Operations` list, open a detail page and verify key fields (non-destructive read-only coverage)

15) layout/auth_bypass_toggle.cy.ts
- Toggle “Auth Bypass” in layout; perform protected action (create milestone/task) and confirm success
- Turn off bypass (if no JWT); protected action should be rejected with 401/403 and show helpful message

**Selectors & Stability**
- Prefer `data-testid` for buttons that have duplicate labels (“Save”, “Delete”):
  - data-testid="add-milestone", "edit-milestone-btn", "delete-milestone-btn"
  - data-testid="add-task", "edit-task-btn", "delete-task-btn", "add-subtask-btn"
  - data-testid="status-select", "priority-select", "milestone-select"
- If adding testids is not feasible immediately, select by accessible labels and scoped containers.

**Network & Auth**
- Use cy.request() for API setup/teardown with headers:
  - 'x-user-role': 'program_manager'
  - 'x-auth-bypass': 'true'
- Intercept network calls to assert payloads where valuable; avoid mocking success paths unless necessary.

**CI Integration**
- Jobs
  - Boot stack via docker-compose
  - Wait for DB and backend `/api/health`
  - Run Cypress headless specs in parallel (by folder group) to reduce total time
- Artifacts: store videos/screenshots on failure

**Coverage Validation**
- Requirement → Test mapping (traceability):
  - Maintain a checklist mapping each Epic 0/1 requirement to a spec/test case ID.
  - Gate CI with a simple JSON-based coverage report (number of mapped requirements covered).
- Target: 100% of listed user stories validated by at least one E2E; key negative/error paths covered for critical CRUD.

**Implementation Order**
1. Add missing `data-testid` hooks to critical UI controls (small PR).
2. Implement smoke, transitions, and milestone CRUD suites.
3. Add tasks CRUD suites (Project Hub, Enhanced Detail).
4. Implement planning tree (sequence, indent/outdent/reorder/move) suites.
5. Add validation/error suites and auth bypass toggle suite.
6. Wire CI parallelization and traceability mapping.

**Risks & Mitigations**
- Flakiness due to async loads: always assert network completion/DOM states; increase timeouts only where necessary.
- Data dependencies: isolate with unique titles and clean up entities in after hooks.
- Traefik routing delays on cold start: include wait-for-health in CI before launching tests.

