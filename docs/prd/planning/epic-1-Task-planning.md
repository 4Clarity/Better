**Epic 1: Tasks ↔ Milestones Hierarchy & Planning View**

**Scope**
- Introduce hierarchical Tasks with parent/child subtasks and ordered sequences (e.g., 1.1.2.1) that adjust and cascade on reordering.
- Strengthen Task ↔ Milestone relation: a Milestone can have many Tasks; Tasks can optionally belong to a Milestone.
- Provide a relational “Tasks & Milestones” planning view for each Transition with reordering, nesting, and inline CRUD.

**Goals**
- Model: Self-referential Task hierarchy; stable sibling ordering; milestone association.
- Backend: CRUD + reorder/move APIs; sequence computation and/or denormalization; validation.
- Frontend: New “Tasks & Milestones” page with nested list UI, drag-and-drop, inline edit, and milestone-task linking.
- Testing: Unit tests for ordering/sequence; E2E for planning workflows.

**Non-Goals (Now)**
- Cross-transition linking of Tasks/Milestones.
- Advanced dependencies/critical-path computation.
- Gantt timeline rendering.

**Data Model Changes (Prisma)**
- Task
  - Add `parentTaskId String?` with self-relation: `parent Task? @relation("TaskHierarchy", fields: [parentTaskId], references: [id])` and `children Task[] @relation("TaskHierarchy")`.
  - Add `orderIndex Int @default(0)` for sibling ordering.
  - Keep `milestoneId String?` relation to `Milestone` (already present).
  - Optional: `sequencePath String? @db.VarChar(255)` for denormalized sequence cache (computed server-side on mutations).
  - Indexes: `@@index([transitionId, parentTaskId, orderIndex])`, `@@index([milestoneId])`.
- Milestone
  - Already has `tasks Task[]`; no change required.

**Migration Plan**
- Create migration adding `parentTaskId`, `orderIndex`, optional `sequencePath`, and self-relation constraints.
- Backfill existing Tasks:
  - Set `orderIndex` within each `(transitionId, parentTaskId)` group using creation time.
  - Compute `sequencePath` if selected approach stores it.
- Regenerate Prisma client and verify schema.

**Sequence Strategy**
- Preferred: Compute sequences on read from `orderIndex` and hierarchy.
  - Pros: Avoids mass updates on reorder; source of truth is simple (parent + orderIndex).
  - Cons: Requires recursive traversal per response; mitigate with batched queries and in-memory DFS.
- Optional denormalization: Maintain `sequencePath` string (e.g., "1.2.3") on mutations for quick listing/sorting; server recomputes cascading children when a node moves.

**Backend API Changes (Fastify)**
- Endpoints (prefix `/api/transitions/:transitionId/tasks`):
  - `POST /` Create Task (accept optional `parentTaskId`, `milestoneId`).
  - `PUT /:taskId` Update Task (allow `title`, `description`, `dueDate`, `priority`, `status`, `milestoneId`, and `parentTaskId`).
  - `DELETE /:taskId` Delete Task (safe delete with audit cleanup; cascade reindex siblings).
  - `PATCH /:taskId/move` Reorder/move:
    - Body: `{ parentTaskId?: string | null, milestoneId?: string | null, beforeTaskId?: string, afterTaskId?: string, position?: number }`.
    - Adjust `orderIndex` atomically within the new sibling group; recompute sequences (if denormalized) for moved node subtree.
  - `GET /tree` Hierarchical list for planning view (tasks grouped by milestone, then by parent/children), includes computed `sequence` fields.
- Validation & Guards
  - Extend Zod schemas for new fields; ensure `parentTaskId` references same `transitionId`.
  - `pmOnly` remains for mutating routes; GET is open per current access patterns.
- Services
  - Add helpers: `buildTaskTree(transitionId, filters)`, `computeSequences(tree)`, `reindexSiblings(parentTaskId)`.
  - Ensure `dueDate` validations still respect Transition window.
  - On delete: compact `orderIndex` for remaining siblings.

**Frontend Changes**
- New Page: `frontend/src/pages/TasksAndMilestonesPage.tsx`
  - Route: `/transitions/:id/tasks-milestones`.
  - Menu: Add “Tasks & Milestones” nav item where Transition tools live.
  - Data load: `GET /api/transitions/:id/milestones?includeTasks=true` (if extended) or `GET /api/transitions/:id/tasks/tree` plus `GET milestones`.
  - Features:
    - Nested list showing Milestones with their Tasks; Tasks expandable to show subtasks.
    - Inline CRUD for Tasks (add sibling, add subtask, edit, delete) and move to milestone.
    - Drag-and-drop to reorder tasks among siblings and to reparent (within same Transition); update via `PATCH /move`.
    - Display sequence numbers for each Task (e.g., 1.2.3) and keep updated on reorder.
    - Filters: by milestone, status, priority; simple search by title.
  - Libraries: Prefer `@dnd-kit` for DnD. If dependency policy limits, implement up/down controls + “indent/outdent” buttons as fallback.
- Existing Pages
  - Project Hub & Enhanced Transition Detail: Optionally surface sequence numbers in lists and add quick “Add Subtask” actions.

**API Client (frontend/src/services/api.ts)**
- Extend `Task` type with `parentTaskId`, `orderIndex`, and optional `sequence` (from backend) plus `children?: Task[]` for tree responses.
- Add `moveTask(transitionId, taskId, body)` to `taskApi`.
- Add `getTaskTree(transitionId)` to fetch hierarchical data.

**Algorithm Details**
- Reindexing on Move
  - Determine target sibling group `(transitionId, parentTaskId)`.
  - If `beforeTaskId`/`afterTaskId` provided, place accordingly; else use `position` or append.
  - Shift `orderIndex` for affected siblings in a single transaction to avoid gaps.
  - If denormalized, recompute `sequencePath` for moved node and its descendants via DFS (root to leaves).
- Sequence Computation (read-time)
  - Build tree grouped by `(parentTaskId)` sorted by `orderIndex`.
  - DFS with counters per sibling array; accumulate path numbers into `sequence` string.

**Testing Plan**
- Unit (Backend)
  - `move` service: sibling reindex correctness; reparent across milestones; validation (no cross-transition parent).
  - Sequence computation: consistent numbering across various structures.
  - CRUD with parent/milestone constraints; dueDate window validation intact.
- E2E (Frontend)
  - Create milestone and tasks, add subtasks, verify sequences 1, 1.1, 1.2, 2, etc.
  - Drag to reorder; sequences update and persist on reload.
  - Move task between milestones and into/out of subtask state.

**Deployment & Rollout**
- Feature flag (optional): Hide DnD until stable; ship with up/down + indent/outdent first.
- Backfill migration non-destructive; ensure Prisma client regenerate and app boot.
- Add API docs in README/API section for new routes.

**Security & RBAC**
- Preserve `pmOnly` for create/update/delete/move.
- GET tree allowed same as current list endpoints;
  later tighten when Keycloak is fully integrated.

**Risks & Mitigations**
- Large trees performance: Implement pagination per milestone and lazy expansion; debounce autosave on reorder.
- Denormalization drift: Prefer compute-on-read initially; if sequencePath is used, centralize recompute logic.
- DnD complexity: Provide keyboard-accessible controls as fallback.

**Open Questions**
- Should Tasks always belong to a Milestone? Current plan keeps it optional (“Unassigned Tasks”).
- Persist `sequencePath` or compute on read only? Plan favors compute-on-read, with optional cache later.
- Limit hierarchy depth? Implicitly unlimited; consider max depth (e.g., 6) for UX.

**Work Breakdown**
1) Schema & Migration
- Add fields/relations and indexes; run migration; regenerate Prisma client; backfill `orderIndex`.

2) Backend Services & Routes
- Extend Zod schemas; implement `move` endpoint; add `GET /tree` and tree builder; keep existing CRUD.

3) Frontend API Client
- Types extended; add `moveTask` and `getTaskTree`.

4) Planning View UI
- New page + route + nav item; nested list; inline CRUD; DnD or controls; sequence display.

5) Integrations
- Show sequences in existing pages; add “Add Subtask” actions.

6) Tests
- Unit tests for move/sequence; E2E flows for CRUD and reordering.

7) Docs & Dev Log
- Update DEVELOPMENT_LOG.md and README with new endpoints and UI links.

