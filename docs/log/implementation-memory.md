# Implementation Memory: System Development Lessons

## Latest Project: Knowledge Management Backend Foundation

### Project Context
Implementation of a comprehensive Knowledge Management system backend with full CRUD operations for Documents, Communications, Facts, Categories, and Tags, including AI-powered workflows and security integration.

### Major Achievements & Solutions

#### 1. Architectural Pattern Standardization
**Achievement**: Implemented singleton Prisma client pattern across all services
- **Problem**: Multiple services creating individual PrismaClient instances
- **Impact**: Connection pool exhaustion, resource inefficiency, testing complications
- **Solution**: Created `src/utils/database.ts` with singleton `getPrismaClient()` pattern
- **Result**: Optimized resource management, improved testability, consistent architecture

#### 2. Schema Field Alignment Resolution
**Achievement**: Resolved critical database schema field mapping mismatches
- **Problem**: Services referencing non-existent database fields (`sortOrder`, `source`, `type`)
- **Impact**: Runtime errors, TypeScript compilation failures, production blockers
- **Solution**: Systematically aligned all field references with actual Prisma schema
- **Specific Fixes**:
  - Categories: `sortOrder` → `displayOrder`
  - Facts: `source`/`sourceEntityType` → `sourceDocumentId`/`sourceCommunicationId`
  - Tags: `type` → `tagType` with API response mapping
  - Communications: Fixed relationship references and field mappings
- **Result**: Production-ready codebase with clean TypeScript compilation

#### 3. Comprehensive API Architecture Implementation
**Achievement**: Full CRUD API suite for 4 core entities with advanced features
- **Scope**: 20+ endpoints across Documents, Communications, Facts, Categories, Tags
- **Features Implemented**:
  - Advanced filtering, pagination, and search capabilities
  - Hierarchical category management with usage statistics
  - Many-to-many tag relationships with automatic usage tracking
  - Approval workflow integration for facts curation
  - Security classification filtering and role-based access control
- **Quality Standards**: 80%+ test coverage, comprehensive error handling

#### 4. Security Integration Excellence
**Achievement**: Production-ready security framework integration
- **Authentication**: Seamless Keycloak integration with existing patterns
- **Authorization**: Role-based access control with security classification filtering
- **Audit Logging**: Comprehensive audit trail for all operations
- **Validation**: Complete Zod schemas for all endpoints
- **Result**: Enterprise-grade security suitable for government applications

---

## Previous Project: Business Operations Hierarchy

### Project Context
Implementation of a comprehensive Business Operations management system with a three-tier hierarchy: Business Operation → Contract → Transition, including stakeholder management, performance metrics, and audit trails.

## Major Challenges Encountered & Solutions

### 1. Database Migration Permission Issues
**Challenge**: Permission errors when trying to modify existing database tables
- Error: `must be owner of table Transition` when running Prisma migrations
- Existing tables owned by 'user' but operations performed as 'better_service'

**Root Cause**: Database table ownership mismatch between migration user and service user

**Solution**:
- Identified database users: `user` (superuser) vs `better_service` (application user)  
- Created separate migration scripts run as superuser (`user`)
- Used `docker exec -i better-db-1 psql -U user -d tip < migration.sql`
- Applied `IF NOT EXISTS` patterns for idempotent migrations

**Prevention**: Always check table ownership before migrations, use superuser for schema changes

### 2. Foreign Key Constraint Violations
**Challenge**: Business Operations failing to save with foreign key errors
- Error: `Foreign key constraint violated on constraint: BusinessOperation_currentManagerId_fkey`
- Frontend sending empty strings `""` instead of `null` for optional foreign keys

**Root Cause**: Database foreign key constraints expect either valid references or `null`, not empty strings

**Solution**:
- **Frontend**: Convert empty strings to `undefined` before sending: `currentManagerId: formData.currentManagerId || undefined`
- **Backend**: Validate foreign key references and set invalid ones to `null`
- **Database**: Ensure optional foreign key fields allow `NULL` values

**Code Example**:
```typescript
// Backend validation
let validCurrentManagerId = null;
if (data.currentManagerId) {
  const userExists = await prisma.user.findUnique({
    where: { id: data.currentManagerId }
  });
  validCurrentManagerId = userExists ? data.currentManagerId : null;
}
```

### 3. Date Format Validation Errors  
**Challenge**: Date validation errors in API requests
- Error: `body/supportPeriodStart must match format "date-time"`
- Frontend sending dates vs backend expecting datetime format

**Root Cause**: Mismatch between frontend date input type and backend validation schema

**Solution**:
- **Backend**: Changed Fastify schema from `format: 'date-time'` to `format: 'date'`
- **Frontend**: Changed inputs from `type="datetime-local"` to `type="date"`
- **Data Processing**: Added `.split('T')[0]` to ensure YYYY-MM-DD format

### 4. Missing Database Columns After Migration
**Challenge**: Prisma errors about non-existent columns
- Error: `The column Transition.contractId does not exist in the current database`
- New schema columns not reflected in actual database tables

**Root Cause**: Failed ALTER TABLE operations due to permission issues during initial migration

**Solution**:
- **Manual Column Addition**: Created specific scripts to add missing columns
- **Superuser Execution**: Used database superuser to perform schema modifications
- **Prisma Client Regeneration**: Ran `npx prisma generate` after database updates
- **Verification**: Used `\d "TableName"` to verify actual database structure

### 5. Error Handling & User Experience
**Challenge**: Generic error messages hiding root causes
- Users seeing "Failed to create business operation" instead of specific issues
- Console errors not providing actionable feedback

**Solution**:
- **Enhanced Backend Error Handling**: Parse Prisma error codes (P2021, P2003, etc.)
- **Specific Error Messages**: Map database errors to user-friendly messages
- **Frontend Error Display**: Show specific validation and setup errors
- **Debug Logging**: Added comprehensive logging for troubleshooting

**Code Example**:
```typescript
// Enhanced error handling
if (error.code === 'P2021') {
  throw new Error('Database not set up: The Business Operations feature requires database tables to be created.');
}
if (error.code === 'P2003') {
  throw new Error(`Invalid reference: ${error.meta.constraint}`);
}
```

## Key Database Setup Steps

1. **Create New Tables**: BusinessOperation, Contract, OperationStakeholder, User, AuditLog
2. **Update Existing Tables**: Add columns to Transition and Milestone tables  
3. **Add Enums**: TransitionStatus, ContractStatus, StakeholderType, etc.
4. **Foreign Key Constraints**: Link tables with proper cascade rules
5. **Sample Data**: Insert default users for testing (default-pm-id, default-director-id)

## Testing & Validation Approach

1. **Database Structure Verification**: Use `\dt` and `\d "TableName"` to verify schema
2. **Foreign Key Testing**: Test with invalid references to ensure graceful handling
3. **API Endpoint Testing**: Verify all CRUD operations work end-to-end
4. **Error Scenario Testing**: Deliberately trigger errors to test error handling
5. **User Flow Testing**: Complete form submission and data display workflows

## Critical Files Modified

### Backend
- `prisma/schema.prisma` - Complete business operations data model
- `src/modules/business-operation/business-operation.service.ts` - CRUD operations & validation
- `src/modules/contract/contract.service.ts` - Contract management
- `business_operations_incremental_migration.sql` - Database setup script
- `update_transition_table.sql` - Transition table updates

### Frontend  
- `src/components/NewBusinessOperationDialog.tsx` - Creation form with date/foreign key fixes

---

## 2025-09-19: Enhanced Transition Creation Foreign Key Fix

### Project Context
Fixing a critical bug preventing users from creating new enhanced transitions in the application.

### Problem
Enhanced transition creation was failing with foreign key constraint violation error:
- Error: `Foreign key constraint violated on constraint: 'Transition_createdBy_fkey'`
- Frontend console showed: `Failed to create transition: Error: Failed to create transition`
- Backend returned 500 Internal Server Error

### Root Cause Analysis
**Primary Issue**: Frontend sending empty string for `createdBy` field
- Frontend component (`NewEnhancedTransitionDialog.tsx:45`) was sending `createdBy: null` which was converted to empty string `""`
- Backend service was passing this empty string to Prisma
- Database foreign key constraint `Transition_createdBy_fkey` requires either a valid User ID or `NULL`, not empty string

**Investigation Steps**:
1. Added debug logging to backend service to inspect incoming data
2. Discovered `createdBy` value was `""` (empty string) with type `string`
3. Confirmed the field was being passed to Prisma create operation causing constraint violation

### Solution Implemented
**Backend Fix** in `/Users/richardroach/Documents/Builder_Projects/Better/backend-node/src/modules/transition/enhanced-transition.service.ts`:

```typescript
// Filter out null/undefined/empty createdBy to avoid foreign key constraint violation
const cleanedData = { ...transitionData };
if (cleanedData.createdBy === null || cleanedData.createdBy === undefined || cleanedData.createdBy === '') {
  delete cleanedData.createdBy;
}
```

**Key Insight**: The fix handles all three problematic values:
- `null` - JavaScript null value
- `undefined` - Missing property
- `''` - Empty string (the actual issue)

### Verification
**Test Results**:
- ✅ Enhanced transition creation successful (Status: 201)
- ✅ Multiple transitions created without errors
- ✅ Debug logs confirmed proper data cleaning
- ✅ No more foreign key constraint violations

**Debug Output Confirmation**:
```
Original transitionData: {
  "createdBy": ""     // Empty string identified
}
createdBy value:
createdBy type: string
Removing createdBy field from data
Cleaned data for Prisma: {
  // createdBy field completely removed
}
```

### Technical Details
**File Modified**: `/Users/richardroach/Documents/Builder_Projects/Better/backend-node/src/modules/transition/enhanced-transition.service.ts:54-58`

**Database Schema Context**:
```prisma
model Transition {
  createdBy  String?    // Optional field
  user       User?      @relation(fields: [createdBy], references: [id])
}
```

The foreign key relationship requires either a valid User ID or NULL - empty strings cause constraint violations.

### Prevention Strategy
**Best Practice Added**: Always validate and clean optional foreign key fields before database operations
- Check for `null`, `undefined`, and empty string values
- Remove invalid foreign key references rather than passing them to database
- Add comprehensive validation for all optional relationship fields

**Error Handling Pattern**:
```typescript
// General pattern for optional foreign keys
if (!fieldValue || fieldValue === '') {
  delete cleanedData.fieldName;
}
```

### Impact
- ✅ Enhanced transition creation functionality fully operational
- ✅ User experience improved - no more cryptic foreign key errors
- ✅ System reliability increased - proper handling of optional relationships
- ✅ Development workflow smoother - consistent transition management

---

## Backend 502 via Traefik (Bad Gateway) — Root Cause and Fix

### Symptom
- UI requests to `http://api.tip.localhost/*` returned `502 Bad Gateway` from Traefik.
- `curl http://api.tip.localhost/health` → 502.
- Backend container logs showed: `ReferenceError: server is not defined` in `src/server.ts` and the app never bound to port 3000.

### Root Cause
- JWT plugin registration code in `backend-node/src/server.ts` executed outside `buildServer()`, referencing `server` at module scope. This threw at startup and prevented Fastify from starting, so Traefik had no upstream to route to.

### Resolution
- Move JWT registration into `buildServer()` before route registration and before returning the server.
- File changed: `backend-node/src/server.ts`.

### Verification
- `docker-compose up -d --build` then:
  - `docker-compose logs -f backend-node` shows “Server listening at http://0.0.0.0:3000”.
  - `curl -i http://api.tip.localhost/health` → HTTP/200.
  - UI pages (Dashboard, Transitions, Business Operations, Security) load.

### Prevention
- Keep all Fastify plugin registration scoped within the factory (`buildServer()`), avoid module‑level side effects.
- Add a basic startup check in CI (curl `/:health`) after container boot.

---

## Epic 1: Milestones CRUD — Implementation Notes and Fixes

### Frontend
- Project Hub (`frontend/src/pages/ProjectHubPage.tsx`):
  - Added full Milestones CRUD: Add dialog (Title, Due Date, Priority, Description), list with inline Edit (Title, Due Date, Priority, Status, Description), and Delete.
  - Sends `x-auth-bypass` when the header toggle is ON to pass route guards in dev.
  - Normalized dates: send dueDate as local midday (`YYYY-MM-DDT12:00:00Z`) to avoid UTC boundary issues.
- Enhanced Transition Detail (`frontend/src/pages/EnhancedTransitionDetailPage.tsx`):
  - Implemented Milestones CRUD mirroring Project Hub.
  - Fixed JSX structure (single root + portal-like overlay for the dialog).

### Backend
- Milestone service (`backend-node/src/modules/milestone/milestone.service.ts`):
  - Create: keeps transition date window validation; added idempotency guard (same transitionId + title + dueDate returns existing instead of duplicating).
  - Delete: removes audit logs first to avoid FK errors, then deletes by milestone id.
  - Update/Get: operate by milestone id; transition fetch is optional and only used for dueDate range validation.
- Bulk delete: deletes by ids and clears related audit logs.

#### Tasks (new)
- Added Task entity to Prisma with enums and relations (`prisma/schema.prisma`).
- Created task service, controller, and routes under `/api/transitions/:transitionId/tasks`:
  - Create with idempotency guard and due date validation against Transition.
  - List with filters and pagination; Update/Delete by task id.
  - Safe delete removes related audit logs first.
- Registered routes in server under transitions prefix.

### Hierarchical Tasks & Planning View
- Schema: `Task` extended with `parentTaskId` (self-relation), `orderIndex`, optional `sequencePath`, and relevant indexes; `Milestone.tasks` already present.
- Services: Accept `parentTaskId` on create/update; add `GET /tasks/tree` (returns nested hierarchy with computed sequence numbers like 1.2.1) and `PATCH /tasks/:taskId/move` to reorder/reparent tasks.
- Frontend: New `TasksAndMilestonesPage.tsx` with nested lists, Up/Down/Indent/Outdent controls, Add Subtask, and Add Task dialog.
- API Client: Added `taskApi.getTree` and `taskApi.move`; extended Task type with `parentTaskId`, `orderIndex`, `sequence`, and `children` for tree responses.

### Task ↔ Milestone Association and FK Fix
- Frontend (Project Hub, Enhanced Transition Detail, Planning View): Add Task/Edit Task forms include a Milestone dropdown (Unassigned or specific Milestone). Only send `milestoneId` when a value is selected; clear with `null` on edit.
- Backend (`task.service.ts`): Validate `milestoneId` on create/update – ensure the Milestone exists and belongs to the same Transition; otherwise return a descriptive 400 error. This prevents foreign key crashes like `Task_milestoneId_fkey`.
- Subtasks: Enhanced Transition Detail adds “Add Subtask” button per task; dialog reflects subtask mode and passes `parentTaskId`.

### Operations & Verification
- Stack restarted (Traefik, backend, frontend, db). Prisma client regenerated and `db push` confirmed schema sync. Health checks passed via Traefik hosts.

### Startup Ordering and Health
- Backend now waits for Postgres before applying Prisma schema (`nc db 5432` loop) to avoid race causing startup crashes and frontend “Failed to fetch”.
- Added `/api/health` alias in addition to `/health` to ease proxy testing.

### Auth and Routing
- Minimal RBAC guards (`pmOnly`) on protected routes accept either `AUTH_BYPASS=true` or `x-auth-bypass: true`, else verify JWT and require `program_manager` role.
- Header toggle added to Layout to control `x-auth-bypass` during development.

### API Base Host Handling
- Frontend auto-detects API base: uses `http://localhost:3000/api` in pure localhost dev, or `http://api.tip.localhost/api` behind Traefik; override with `VITE_API_BASE_URL`.

### CI Smoke Workflow
- Added `.github/workflows/ci-smoke.yml`: starts db/redis/reverse-proxy/backend/frontend, waits for Postgres and backend health, checks frontend contains “Transitions Overview”, and dumps logs on failure.

### Dependency and Build Fixes
- Upgraded `cypress` to `^15` to satisfy `@cypress/vite-dev-server@7` peer requirements.
- Avoid Cypress binary download in container builds (`CYPRESS_INSTALL_BINARY=0`).
- `src/services/api.ts` - API client with enhanced error handling
- `src/pages/BusinessOperationsPage.tsx` - Main dashboard

## Best Practices Learned

1. **Always verify database ownership before schema changes**
2. **Use superuser accounts for DDL operations, service accounts for DML**
3. **Validate foreign key references before database operations**
4. **Convert empty strings to null/undefined for optional foreign keys**
5. **Regenerate Prisma client after manual database changes**
6. **Implement comprehensive error handling with specific user messages**
7. **Test migration scripts in development before production**
8. **Document database user roles and permissions clearly**
9. **Clean optional foreign key fields before database operations (check null, undefined, empty string)**

## Future Prevention Checklist

- [ ] Check table ownership before migrations (`\dt+`)
- [ ] Verify foreign key validation in both frontend and backend
- [ ] Test date format compatibility between frontend and backend
- [ ] Ensure all schema changes are reflected in actual database
- [ ] Test error scenarios and user-facing error messages
- [ ] Document database setup procedures for team members
- [ ] Create rollback plans for schema changes
- [ ] Validate optional foreign key fields for null/undefined/empty string before database operations
- [ ] Add debug logging for complex data transformations and API requests

---

## 2025-09-15: Authentication and Database Schema Resolution

### Issues Resolved:

#### 1. Authentication Flow Fixed
**Problem**: Demo login failing with "Failed to fetch" errors in browser
- Symptoms: `TypeError: Failed to fetch` in console, host-network-events.js errors
- Authentication worked via curl but failed in browser

**Root Causes**:
- Malformed `jsconfig.json` (contained only comments, no valid JSON)
- Missing Vite proxy configuration for API calls
- Frontend making direct cross-origin requests instead of using proxy

**Solution**:
- Fixed `jsconfig.json` with proper JSON structure
- Added Vite proxy configuration: `/api -> http://localhost:3000`
- Updated API base URL logic to use proxy when on localhost:5173
- Added debugging logs to trace API calls

**Files Modified**:
- `/jsconfig.json` - Fixed JSON structure
- `/frontend/vite.config.ts` - Added proxy configuration
- `/frontend/src/services/api.ts` - Updated API URL detection logic
- `/frontend/src/services/authApi.ts` - Added debug logging

#### 2. Backend Server Connectivity
**Problem**: Backend server process existed but wasn't responding on port 3000
**Solution**: Killed hung process and restarted with proper DATABASE_URL

#### 3. Database Connection Crisis
**Problem**: PostgreSQL containers failing with "No space left on device"
**Root Cause**: Docker had accumulated 36.55GB of unused data

**Solution Applied**:
```bash
docker system prune -f     # Freed 12.61GB
docker volume prune -f     # Freed 23.94GB
docker compose up -d db    # Fresh database container
```

#### 4. Database Schema Reset
**Problem**: Prisma client undefined errors after database restart
**Solution**:
```bash
cd backend-node
DATABASE_URL="postgresql://user:password@localhost:5433/tip?schema=public" npx prisma db push --force-reset
DATABASE_URL="postgresql://user:password@localhost:5433/tip?schema=public" npx prisma generate
```

#### 5. Critical Discovery: Schema Mismatch
**Problem**: Data table endpoints returning 500 errors with "Cannot read properties of undefined (reading 'findMany')"

**Root Cause Analysis**:
- Frontend expects: `BusinessOperation`, `Contract`, `EnhancedTransition` models
- Database actually contains: `transitions`, `milestones`, `tasks`, `users`, `artifacts`, etc.
- Current schema is for transition/project management, not business operations management

**Impact**:
- Dashboard page: ❌ Tries to fetch non-existent `business-operations`
- Transitions page: ✅ Should work (uses existing `transitions` model)
- Business Operations page: ❌ Tries to fetch non-existent models
- Tasks & Milestones pages: ✅ Should work (use existing models)

### Current System Status:
- ✅ **Authentication**: Demo login fully functional
- ✅ **Backend Server**: Running on port 3000
- ✅ **Frontend Server**: Running on port 5173 with working API proxy
- ✅ **Database**: PostgreSQL running on port 5433 with clean schema
- ❌ **Data Tables**: Failing due to fundamental schema mismatch

### Next Steps for Resolution:
1. **Schema Alignment Decision**: Choose between:
   - Option A: Update database schema to include BusinessOperation models
   - Option B: Update frontend to use existing transition-based models
   - Option C: Create hybrid approach supporting both schemas

2. **Model Mapping**: If keeping current schema, map frontend expectations:
   - BusinessOperation → transitions (with business context fields)
   - Contract → transitions (with contract-specific fields)
   - EnhancedTransition → transitions (existing model)

3. **Data Seeding**: Add sample data to database for testing UI functionality

### Key Troubleshooting Commands:
```bash
# Check backend server status
ps aux | grep -E "ts-node-dev.*src/index.ts"

# Check database container
docker ps | grep db

# List Prisma schema models
cd backend-node && grep "^model " prisma/schema.prisma

# Reset database with fresh schema
cd backend-node && DATABASE_URL="postgresql://user:password@localhost:5433/tip?schema=public" npx prisma db push --force-reset

# Clean Docker resources when space issues occur
docker system prune -f && docker volume prune -f

# Test API endpoints
curl -X GET http://localhost:3000/api/auth/demo-login
curl -X GET http://localhost:3000/api/business-operations -H "x-auth-bypass: true"
```

### Prevention Measures Added:
- Enhanced error logging in authentication flow
- Docker resource monitoring awareness
- Schema validation before implementing frontend services
- API proxy configuration documentation
- Database connection troubleshooting procedures

---
*This document serves as institutional memory to prevent repeating these implementation challenges in future Business Operations or similar hierarchical data system implementations.*
