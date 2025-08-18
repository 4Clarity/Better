# Epic 1: Transition Setup & Management (Expanded for Development)

**Summary:** This epic covers the foundational features that allow a Program Manager (Brenda) to initiate, define, and monitor a new contract transition. It establishes the core workspace for all subsequent transition activities.

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