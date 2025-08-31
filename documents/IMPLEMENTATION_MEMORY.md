# Implementation Memory: Business Operations Hierarchy

## Project Context
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

## Future Prevention Checklist

- [ ] Check table ownership before migrations (`\dt+`)
- [ ] Verify foreign key validation in both frontend and backend
- [ ] Test date format compatibility between frontend and backend
- [ ] Ensure all schema changes are reflected in actual database
- [ ] Test error scenarios and user-facing error messages
- [ ] Document database setup procedures for team members
- [ ] Create rollback plans for schema changes

---
*This document serves as institutional memory to prevent repeating these implementation challenges in future Business Operations or similar hierarchical data system implementations.*
