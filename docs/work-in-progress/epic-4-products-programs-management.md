# Epic 4: Products and Programs Management

**Epic ID:** Epic-4
**Epic Name:** Products and Programs Management
**Epic Type:** Brownfield Enhancement
**Created:** 2025-10-10
**Status:** Planning

---

## Epic Goal

Enable tracking and management of Products and Programs within Business Operations to define operational objectives, deliverables, and provide essential context for business knowledge and transition management.

## Epic Description

### Existing System Context

**Current relevant functionality:**
- Business Operations section exists with a placeholder Products and Programs page
- Currently displays support contracts
- Knowledge Management system is operational with role-based access controls
- Transitions feature exists and needs categorization capability

**Technology stack:**
- Frontend: React + TypeScript (Vite)
- Backend: Node.js (Fastify) + Prisma ORM
- Database: PostgreSQL
- Auth: Current authentication system (Keycloak paused)

**Integration points:**
- Knowledge Management system (linking references)
- User/Role management (RBAC for Admin, Government Program Director, Government Program Manager)
- Existing Transitions feature (categorization/assignment to Products/Programs)
- Business Operations parent section

### Enhancement Details

**What's being added/changed:**

A comprehensive Products and Programs management feature that captures operational details defining "What" the Business Operations support. This includes:

- Complete CRUD operations for Products/Programs
- Rich data model including:
  - Name
  - Description
  - Objectives
  - Key Stakeholders (list of Users)
  - Deliverables
  - Dependencies
  - Relationship to Business Operations
  - Context for business knowledge
  - Transitions
  - Tasks
  - Milestones
  - Security Classification
  - Critical Dates
  - Knowledge Reference Links

**How it integrates:**
- Extends existing Business Operations section architecture
- Leverages current RBAC patterns from user management
- Links to Knowledge Management for reference materials
- Updates Transitions to support Product/Program categorization
- Follows existing Prisma schema patterns for data persistence

**Success criteria:**
- Authorized users can create, edit, and view Products/Programs with all required fields
- Transitions can be assigned/categorized to Products/Programs
- Knowledge references are linkable from Products/Programs
- Role-based permissions enforce access controls correctly
- UI follows existing Business Operations patterns
- No regression in existing Business Operations or Knowledge Management features

## Stories

This epic is broken into 3 substantial stories that can be delivered sequentially:

### Story 4.1: Core Products/Programs Data Model and Basic CRUD

**Description:** Implement database schema, backend API, and basic UI for creating, reading, updating, and deleting Products/Programs with essential fields (name, description, objectives, deliverables, dependencies, security classification, critical dates).

**Scope:**
- Prisma schema additions for Products/Programs
- Backend API endpoints (CRUD)
- Frontend basic form and list view
- Role-based permission enforcement

**Acceptance Criteria:**
- Database schema created with all essential fields
- API endpoints functional for CRUD operations
- UI allows authorized users to create/edit/view Products/Programs
- Role-based access controls enforce permissions (Create/Edit: Admin, Gov Program Director, Gov Program Manager; Read: All users)
- Unit tests pass for all backend services
- Integration tests verify CRUD operations

**Story File:** `story-4.1-core-products-programs-crud.md`

---

### Story 4.2: Relationships and Integration (Stakeholders, Transitions, Business Ops)

**Description:** Connect Products/Programs to existing system features including stakeholder management (users), transition categorization/assignment, and business operations relationships.

**Scope:**
- Stakeholder assignment (many-to-many with Users)
- Transition updates for Product/Program categorization
- Business Operations relationship modeling
- UI updates for relationship management
- Migration script to allow existing transitions to be categorized

**Acceptance Criteria:**
- Stakeholders can be assigned to Products/Programs
- Existing transitions can be categorized/assigned to Products/Programs
- Business Operations relationships are functional
- UI provides intuitive relationship management
- Migration script successfully updates existing transitions
- No regression in Transitions or Business Operations features

**Story File:** `story-4.2-relationships-integration.md`

---

### Story 4.3: Knowledge Integration and Advanced Features (Tasks, Milestones, Knowledge Links)

**Description:** Implement Knowledge Management linking, internal task/milestone tracking, and knowledge context features to complete the Products/Programs management capability.

**Scope:**
- Knowledge reference links integration
- Tasks and Milestones sub-entities
- Knowledge context field/feature
- UI for managing all relationships
- Comprehensive testing of all integrations

**Acceptance Criteria:**
- Knowledge references can be linked from Products/Programs
- Tasks and Milestones can be created and tracked within Products/Programs
- Knowledge context is captured and displayable
- UI provides complete relationship management
- All integrations tested and verified
- No regression in Knowledge Management features

**Story File:** `story-4.3-knowledge-integration-advanced.md`

---

## Compatibility Requirements

- [ ] Existing Business Operations APIs remain unchanged
- [ ] Database schema changes use additive migrations (backward compatible)
- [ ] UI changes follow existing Business Operations section patterns
- [ ] Performance impact is minimal (proper indexing on foreign keys)
- [ ] Existing Knowledge Management and Transitions features remain fully functional
- [ ] Current RBAC patterns are extended consistently

## Risk Mitigation

**Primary Risk:** Complex data relationships and multiple integration points could cause regression in existing Transitions or Knowledge Management features.

**Mitigation:**
- Implement stories sequentially with isolated testing after each
- Use database transactions for multi-table operations
- Create comprehensive integration tests before each story completion
- Keep existing API endpoints unchanged; only add new endpoints
- Use feature flags if deploying to production incrementally

**Rollback Plan:**
- Database migrations are reversible (down migrations prepared)
- New API endpoints can be disabled via feature flag
- UI changes are isolated to Products/Programs section; can revert to placeholder
- No breaking changes to existing features; rollback is low-risk

## Definition of Done

- [ ] All 3 stories completed with acceptance criteria met
- [ ] Existing Business Operations, Knowledge Management, and Transitions functionality verified through regression testing
- [ ] Integration points working correctly (stakeholders, transitions, knowledge links)
- [ ] Role-based permissions enforced correctly across all operations
- [ ] Database performance validated with realistic data volumes
- [ ] Documentation updated (API docs, user guide for Products/Programs management)
- [ ] No regression in existing features
- [ ] All unit and integration tests passing

## Technical Architecture Notes

### Database Schema (Prisma)

**New Models:**
- `Product` (or `Program` - to be determined in Story 4.1)
- `ProductTask` (sub-entity)
- `ProductMilestone` (sub-entity)
- `ProductStakeholder` (junction table)
- `ProductKnowledgeLink` (junction table)

**Modified Models:**
- `Transition` - add foreign key to Product/Program for categorization

### API Endpoints (Fastify)

**New Routes:**
- `POST /api/products` - Create Product/Program
- `GET /api/products` - List Products/Programs
- `GET /api/products/:id` - Get Product/Program details
- `PUT /api/products/:id` - Update Product/Program
- `DELETE /api/products/:id` - Delete Product/Program
- Additional CRUD for tasks, milestones, stakeholders, knowledge links

### Frontend Components (React)

**New Components:**
- `ProductsList.tsx` - List view
- `ProductForm.tsx` - Create/Edit form
- `ProductDetails.tsx` - Detail view
- `StakeholderManager.tsx` - Manage stakeholders
- `TaskMilestoneManager.tsx` - Manage tasks/milestones
- `KnowledgeLinkManager.tsx` - Manage knowledge references

## Dependencies

- Existing User/Role management system
- Existing Knowledge Management system
- Existing Transitions feature
- Existing Business Operations section structure

## Success Metrics

- Products/Programs can be created and managed by authorized users
- Transitions are successfully categorized to Products/Programs
- Knowledge context is effectively linked and accessible
- No performance degradation in existing features
- User adoption by Program Directors and Program Managers

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **React + TypeScript (frontend), Node.js/Fastify + Prisma (backend), PostgreSQL (database)**
- **Integration points:**
  - Knowledge Management system (for reference linking)
  - User/Role management (for stakeholder assignment and RBAC)
  - Existing Transitions feature (for categorization updates)
  - Business Operations parent section
- **Existing patterns to follow:**
  - Prisma schema patterns for data modeling
  - Fastify route + service + controller architecture
  - React component structure with TypeScript interfaces
  - Current RBAC implementation patterns
- **Critical compatibility requirements:**
  - Additive-only database migrations
  - No changes to existing API endpoints
  - Role-based access: Create/Edit (Admin, Gov Program Director, Gov Program Manager), Read (All users)
  - UI must follow Business Operations section styling
- Each story must include:
  - Verification that existing functionality remains intact
  - Integration tests for cross-feature interactions
  - Regression testing for Transitions and Knowledge Management

The epic should maintain system integrity while delivering **comprehensive Products and Programs management that defines operational objectives and provides essential context for business knowledge and transitions**."

---

## Notes

- This epic extends the Business Operations capability significantly
- Sequential story delivery is recommended to minimize integration risk
- Each story should be fully tested before moving to the next
- Consider feature flags for incremental production rollout
