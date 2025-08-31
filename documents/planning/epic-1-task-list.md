# Epic 1: Transition Setup & Management — Implementation Plan and Task List

Scope
- Establish Business Operation → Contract → Transition hierarchy with a working Project Hub.
- Enable Transition creation, status management, and milestone CRUD with secure RBAC.
- Integrate minimal Keycloak-based gating for PM-only actions; lay groundwork for audit.

Current State (from repo and logs)
- Epic 0 (User Management) complete; Security UI present.
- Backend modules exist for transitions, milestones, contracts, business-operations.
- Frontend pages for BusinessOperations, Transitions, Project Hub present; Cypress E2E exists.
- Keycloak service available in Docker; not fully integrated with API.

Delivery Sprints
- Sprint 1: Transition Create + Project Hub Baseline
- Sprint 2: Business Operations and Contracts Integration
- Sprint 3: Timeline/Milestones Enhancements + Status
- Sprint 4: RBAC via Keycloak + Basic Audit

Sprint 1: Transition Create + Project Hub Baseline
- Backend: Confirm `POST /api/transitions`, `GET /api/transitions/:id` shape; add Zod validation; return 201 with object.
  - Files: `backend-node/src/modules/transition/{transition.route.ts,transition.controller.ts,transition.service.ts}`
- Frontend: New Transition dialog/page; redirect to `/transitions/:id`; basic Project Hub Overview.
  - Files: `frontend/src/components/NewTransitionDialog.tsx`, `frontend/src/pages/ProjectHubPage.tsx`, `frontend/src/pages/TransitionsPage.tsx`
- QA: Cypress E2E for create + redirect; contract tests for transitions API.

Sprint 2: Business Ops and Contracts Integration
- Backend: Ensure relations (Operation→Contracts→Transitions) in Prisma; add list/filter endpoints.
  - Files: `backend-node/src/modules/{business-operation,contract}/*`
- Frontend: Business Operation detail shows contracts and transitions; link flows to create transition under a contract.
  - Files: `frontend/src/pages/BusinessOperationsPage.tsx`, `frontend/src/components/ContractSelector.tsx`
- QA: E2E for create Operation→Contract→Transition happy path.

Sprint 3: Timeline + Status
- Backend: Milestone CRUD nested under transition; `PATCH /api/transitions/:id` for status enum.
  - Files: `backend-node/src/modules/milestone/{milestone.route.ts,milestone.controller.ts,milestone.service.ts}`, `backend-node/src/modules/transition/transition.route.ts`
- Frontend: Project Hub Timeline tab with table and dialogs; status badge with inline update.
  - Files: `frontend/src/pages/ProjectHubPage.tsx`, `frontend/src/components/ui/{table,dialog,select,badge}.tsx`
- QA: E2E for milestone add/edit/delete; status update reflected on dashboard.

Sprint 4: RBAC + Audit (Minimum Viable)
- Backend: Integrate Keycloak JWT verification; role check for PM on create/update; basic audit log entity and middleware hook.
  - Frontend: Role-aware UI guards; show 403 states; security indicators in Hub.
  - QA: Negative tests for unauthorized actions; basic audit entry verification.

API Contracts (authoritative)
- POST `/api/transitions`
  - Request: { contractName: string, contractNumber: string, startDate: ISO8601, endDate: ISO8601, keyPersonnel?: string, description?: string }
  - 201 Response: { id: string, contractName: string, contractNumber: string, startDate: ISO8601, endDate: ISO8601, status: 'NOT_STARTED'|'ON_TRACK'|'AT_RISK'|'BLOCKED'|'COMPLETED', keyPersonnel: string|null, description: string|null, createdBy: string, createdAt: ISO8601, updatedAt: ISO8601, _count?: { milestones: number } }
- GET `/api/transitions`
  - Query: status?, search?, page=1, limit=10, sortBy in [contractName,contractNumber,startDate,endDate,status,createdAt], sortOrder in [asc,desc]
  - 200 Response: { data: Transition[], pagination: { page:number, limit:number, total:number, totalPages:number } }
- GET `/api/transitions/:id`
  - 200 Response: Transition & { milestones: Milestone[] }
- PUT `/api/transitions/:id`
  - Request: Partial of POST body; dates as ISO8601; 200 Response: Transition
- PATCH `/api/transitions/:id/status`
  - Request: { status: enum }; 200 Response: Transition
- Milestones under a Transition
  - POST `/api/transitions/:transitionId/milestones`
    - Request: { title: string, description?: string, dueDate: ISO8601, priority: 'LOW'|'MEDIUM'|'HIGH' }
    - 201 Response: Milestone
  - GET `/api/transitions/:transitionId/milestones`
    - Query: status?, priority?, overdue?, upcoming?(days), page, limit, sortBy, sortOrder
    - 200 Response: { data: Milestone[], pagination }
  - PUT `/api/transitions/:transitionId/milestones/:milestoneId` → 200 Milestone
  - DELETE `/api/transitions/:transitionId/milestones/:milestoneId` → 200 { message }

Example Transition (201)
{
  "id":"tr_123","contractName":"Aegis Support","contractNumber":"CN-2025-0042",
  "startDate":"2025-09-01T00:00:00.000Z","endDate":"2026-09-01T00:00:00.000Z",
  "status":"NOT_STARTED","keyPersonnel":null,"description":null,
  "createdBy":"user_123","createdAt":"2025-08-30T12:00:00.000Z","updatedAt":"2025-08-30T12:00:00.000Z",
  "_count":{ "milestones":0 }
}

Example Milestone (201)
{
  "id":"ms_001","title":"Kickoff","description":"Initial meeting",
  "dueDate":"2025-09-05T12:00:00.000Z","priority":"MEDIUM","status":"PENDING",
  "transitionId":"tr_123","createdAt":"2025-08-30T12:00:00.000Z","updatedAt":"2025-08-30T12:00:00.000Z"
}

Tasks (Tracked)
- BE-1.1: Validate and harden transitions endpoints (Zod, 201, errors) — Planned
- FE-1.1: New Transition form + redirect — Planned
- QA-1.1: Transitions contract and E2E tests — Planned
- DB-1.2: Ensure Prisma relations for Operation/Contract/Transition — Planned
- FE-1.2: Operation detail links and creation flows — Planned
- BE-1.3: Milestone CRUD nested routes with auth — Planned
- FE-1.3: Timeline UI + dialogs — Planned
- BE-1.4: Transition status enum + PATCH — Planned
- FE-1.4: Status badge + change control — Planned
- BE-1.5: Keycloak middleware + PM role gating — Planned
- BE-1.6: Minimal audit trail (action, actor, ts) — Planned
- FE-1.5: Role-aware guards and 403 UX — Planned
- QA-1.2: Negative tests (403) + audit checks — Planned

Acceptance Criteria (Epic 1 Done)
- PM can create transition, view Project Hub, set status, manage milestones.
- Operations show contracts and linked transitions; navigable flows exist.
- RBAC enforced for PM-only actions; unauthorized users receive 403.
- E2E suite covers create-flow, timeline ops, and status updates.

Runbook
- Dev: `docker-compose up --build` → FE (`npm run dev`), BE (`npm run dev`), Prisma (`db:migrate`).
- Tests: `frontend/npm run test:e2e:headless`; API contract tests per service.
