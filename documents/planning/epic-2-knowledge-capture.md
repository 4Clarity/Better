# Epic 2: Core Knowledge & Compliance Capture (Expanded for Development)

**Summary:** This epic focuses on the core functionality for capturing transition knowledge and ensuring compliance. It includes the system for managing official documents (Artifact Vault), tracking personnel readiness, and ingesting initial data from external systems.

---

## User Story 2.1.1: Upload Transition Artifact

**As a** Departing Contractor (David),
**I want to** upload required documents and artifacts to a secure, centralized repository,
**So that** I can fulfill my contractual obligations and have a clear record of submission.

### Acceptance Criteria:
- A Departing Contractor can see a list of required artifacts for a specific transition.
- The user can select a file from their local machine to upload.
- The user can add an optional comment with the upload.
- Upon successful upload, the artifact's status changes to "Submitted."
- The uploaded file is stored securely in the MinIO object storage.
- An audit trail entry is created for the file upload event.

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-2.1.1:** Define `artifacts` and `artifact_audit_log` table schemas. The `artifacts` table should include a foreign key to `transitions`, a path to the file in MinIO, a status enum, and the current version.
- **Task BE-2.1.2:** Create an endpoint `POST /api/transitions/:id/artifacts` to handle file uploads. This should be a multipart form data endpoint.
- **Task BE-2.1.3:** Integrate with the MinIO SDK to upload the file to a bucket specific to the transition.
- **Task BE-2.1.4:** After a successful upload, create a record in the `artifacts` table and an entry in the `artifact_audit_log`.
- **Task BE-2.1.5:** Secure the endpoint for Departing Contractors.

#### Frontend Engineer (React/Vite)
- **Task FE-2.1.1:** In the Project Hub's "Artifacts" tab, display a list of required artifacts for the transition.
- **Task FE-2.1.2:** Create an "Upload" button for each artifact that opens a `Dialog` component.
- **Task FE-2.1.3:** The dialog should contain a file input, a textarea for comments, and a submit button, all styled with `shadcn/ui`.
- **Task FE-2.1.4:** Implement the logic to post the file and metadata to the backend API.
- **Task FE-2.1.5:** On success, the UI should update to show the artifact's status as "Submitted."

#### QA & Test Automation Engineer
- **Task QA-2.1.1:** Write a Pact contract test for the file upload endpoint.
- **Task QA-2.1.2:** Write a Cypress E2E test for the upload flow, including mocking the file input and verifying the UI status change.

---

## User Story 2.1.2: Review Transition Artifact

**As a** Government PM (Brenda),
**I want to** review submitted artifacts, approve or reject them with comments,
**So that** I can ensure compliance and maintain a complete audit trail.

### Acceptance Criteria:
- A PM can view a list of submitted artifacts.
- A PM can download and view the content of a submitted artifact.
- A PM can change the status of an artifact to "Approved" or "Rejected."
- When rejecting, a PM must provide a comment.
- All review actions (Approve, Reject) are recorded in the audit trail.

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-2.2.1:** Create an endpoint `PATCH /api/artifacts/:id/status` to update an artifact's status.
- **Task BE-2.2.2:** The endpoint should require a comment if the new status is "Rejected."
- **Task BE-2.2.3:** Create a new entry in the `artifact_audit_log` for every status change.
- **Task BE-2.2.4:** Create an endpoint `GET /api/artifacts/:id/download` that generates a secure, time-limited pre-signed URL for downloading the file from MinIO.
- **Task BE-2.2.5:** Secure these endpoints for Program Managers.

#### Frontend Engineer (React/Vite)
- **Task FE-2.2.1:** In the "Artifacts" tab, provide "Approve" and "Reject" buttons for artifacts with "Submitted" status.
- **Task FE-2.2.2:** Clicking "Reject" should open a dialog requiring a comment.
- **Task FE-2.2.3:** Implement the API calls to update the status and download the file.
- **Task FE-2.2.4:** The UI should clearly display the current status of each artifact using colored `Badge` components.

#### QA & Test Automation Engineer
- **Task QA-2.2.1:** Write Pact contract tests for the status update and download link endpoints.
- **Task QA-2.2.2:** Write a Cypress E2E test for the review flow: approve an artifact and verify the status change; reject another and verify the status and comment requirement.

---

## User Story 2.2.1: Track Onboarding Readiness

**As a** Government PM (Brenda),
**I want to** track the security clearance and badging status of incoming contractors,
**So that** I can manage and control their access to sensitive project information.

### Acceptance Criteria:
- A PM can view a list of all users associated with a transition.
- The list must display each user's role, security clearance status, and platform access level.
- A PM can invite new users to a transition by email.
- A PM can manually update a user's security status (e.g., to "Cleared").
- A user's platform access must be disabled by default and only enabled when their security status is "Cleared."

---

### Development Tasks:

#### Backend Engineer (Node.js/Fastify)
- **Task BE-2.3.1:** Define a `transition_users` table to link users from Keycloak to transitions, including columns for `security_status` and `platform_access`.
- **Task BE-2.3.2:** Create endpoints to manage users for a transition: `GET /api/transitions/:id/users`, `POST /api/transitions/:id/users` (invite), `PATCH /api/transitions/:id/users/:userId`.
- **Task BE-2.3.3:** The PATCH endpoint should automatically set `platform_access` to `enabled` when `security_status` is set to `Cleared`.
- **Task BE-2.3.4:** Integrate with Keycloak to create user accounts when inviting them.

#### Frontend Engineer (React/Vite)
- **Task FE-2.3.1:** Create the "Team & Access" tab in the Project Hub.
- **Task FE-2.3.2:** Use a `Table` component to display the list of users and their status.
- **Task FE-2.3.3:** Implement a form to invite new users by email.
- **Task FE-2.3.4:** Add controls (e.g., a `Select` dropdown) for the PM to update a user's security status.

#### QA & Test Automation Engineer
- **Task QA-2.3.1:** Write Pact contract tests for the user management endpoints.
- **Task QA-2.3.2:** Write a Cypress E2E test for the readiness tracker: invite a user, verify their access is disabled, update their status to "Cleared," and verify their access is now enabled.