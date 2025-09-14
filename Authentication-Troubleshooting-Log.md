# Authentication Troubleshooting Log

## Incident Summary
**Date:** September 12, 2025  
**Incident Type:** Authentication System Failure  
**Severity:** Critical  
**Status:** Active Investigation  
**Impact:** Complete user login failure

---

## Problem Statement

The Better TIP application authentication system is experiencing complete failure, preventing user login and system access. Initial investigation reveals fundamental schema mismatches between the database and application code, particularly around session management and password authentication.

---

## Investigation Timeline

### Initial Symptoms Observed
- Users unable to log in with valid credentials
- Login page shows generic "Login failed" errors
- Session management not working
- Only demo accounts functional
- Intermittent database connection errors during authentication

### Discovery Process

#### Phase 1: Code Review
**Files Analyzed:**
- `backend-node/src/modules/auth/auth.service.ts`
- `frontend/src/contexts/AuthContext.tsx`  
- `frontend/src/services/authApi.ts`
- `backend-node/prisma/schema.prisma`

#### Phase 2: Database Schema Analysis
**Migrations Reviewed:**
- `20240819000000_initial_comprehensive_schema/migration.sql` ✅ Applied
- `001_add_transition_hierarchy.sql` ✅ Applied
- **Missing:** Authentication system migrations ❌

#### Phase 3: Schema Mismatch Identification
**Critical Findings:**
1. `userSession` table missing from database
2. `passwordHash` field missing from users table  
3. User roles implementation mismatch
4. Foreign key constraint issues

---

## Root Cause Analysis

### Primary Root Cause
**Authentication Feature Development Without Migrations**

The authentication system was enhanced with advanced features including:
- Session management with refresh tokens
- Password hashing and verification
- Advanced security features
- User role management improvements

However, the corresponding database schema changes were never migrated to the actual database, creating a fundamental disconnect between code expectations and database reality.

### Contributing Factors

1. **Development Workflow Gap**
   - Features developed using demo/mock data
   - Testing relied on authentication bypass modes
   - Schema changes not validated against production database structure

2. **Migration Management Issues**
   - Manual SQL migrations not integrated with Prisma workflow
   - No automated schema validation in CI/CD
   - Missing pre-deployment schema consistency checks

3. **Testing Limitations**
   - End-to-end authentication tests missing
   - Database integration tests insufficient
   - Production schema not tested in staging

---

## Specific Technical Issues Identified

### Issue #1: Missing userSession Table
**Error Pattern:**
```
PrismaClientKnownRequestError: Unknown arg `userSession` in query.findFirst()
```

**Code References:**
- `auth.service.ts:185` - Session lookup for refresh tokens
- `auth.service.ts:284` - Session invalidation during logout  
- `auth.service.ts:334` - Concurrent session management
- `auth.service.ts:342` - Session cleanup operations
- `auth.service.ts:350` - New session creation

**Impact:** Complete session management failure

### Issue #2: Missing passwordHash Field
**Error Pattern:**
```
PrismaClientKnownRequestError: Unknown arg `passwordHash` in users.findUnique()
```

**Code References:**
- `auth.service.ts:726` - Password hash retrieval
- `auth.service.ts:729` - Password existence check
- `auth.service.ts:735` - Password verification with bcrypt

**Impact:** Password authentication impossible for real users

### Issue #3: User Roles Schema Mismatch
**Current Schema:**
```prisma
roles Json @default("[]")
```

**Code Expects:**
```typescript
user.roles.map(r => r.name) // Expects array of objects with name property
```

**Frontend Expects:**
```typescript
roles: string[] // Expects simple string array
```

**Impact:** Role-based access control broken

### Issue #4: User-Person Relationship Constraints
**Issue:** Users table requires personId but person creation flow unclear
**Impact:** May prevent new user creation

---

## Failed Troubleshooting Attempts

### Attempt #1: Authentication Bypass
**Approach:** Tried to use existing demo authentication bypass
**Result:** ❌ Failed - Bypass only works for hardcoded demo users
**Lesson:** Need actual database integration, not workarounds

### Attempt #2: Schema Introspection  
**Approach:** Analyzed current database schema vs code expectations
**Result:** ✅ Successful - Identified specific missing tables/fields
**Lesson:** Schema drift is the primary issue

### Attempt #3: Migration Investigation
**Approach:** Reviewed existing migration files for authentication changes
**Result:** ❌ No authentication migrations found
**Lesson:** Features were developed without corresponding database changes

---

## Solution Analysis

### Option A: Emergency Schema Fix
**Approach:** Create emergency migration to add missing authentication schema

**Required Changes:**
```sql
-- Add userSession table
CREATE TABLE "userSessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add passwordHash field
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

-- Create necessary indexes
CREATE INDEX "idx_userSessions_userId" ON "userSessions"("userId");
CREATE INDEX "idx_userSessions_refreshToken" ON "userSessions"("refreshToken");
```

**Risks:**
- Complex migration with potential for new issues
- Need extensive testing before production
- May introduce data consistency problems
- Time-consuming validation process

### Option B: Rollback to Stable Version  
**Approach:** Revert to last known working authentication version

**Steps:**
1. Identify last stable authentication commit
2. Create rollback branch
3. Document current feature changes for future reimplementation
4. Deploy stable version

**Risks:**
- Loss of recent feature development work
- Need to re-implement features later
- May affect other integrated features

### Option C: Hybrid Approach
**Approach:** Partial rollback with strategic feature preservation

**Steps:**
1. Rollback authentication system to stable version
2. Preserve non-authentication features
3. Create proper migration strategy for authentication features
4. Reimplement authentication features with proper migrations

**Risks:**
- Complex merge conflicts
- Need careful testing of preserved features
- Longer timeline to restore full functionality

---

## Lessons Learned

### Development Process Issues
1. **Schema-Code Synchronization:** Need automated validation that code matches database schema
2. **Migration Management:** All schema changes must go through proper migration process
3. **Testing Strategy:** Need comprehensive database integration tests
4. **Feature Development:** Cannot develop database-dependent features without corresponding schema

### Technical Process Improvements Needed
1. **Pre-deployment Schema Validation**
2. **Automated Migration Testing**
3. **Schema Documentation and Versioning**
4. **Database Integration Test Coverage**
5. **Production Schema Monitoring**

### Operational Improvements
1. **Staging Environment:** Must mirror production database exactly
2. **Code Review Process:** Must validate schema compatibility
3. **Feature Branch Requirements:** Include required migrations
4. **Deployment Checklist:** Include schema validation steps

---

## Future Prevention Strategy

### Short-term Fixes
1. **Emergency Response Plan:** Clear process for authentication failures
2. **Schema Validation Tools:** Automated checking of code vs database
3. **Enhanced Testing:** Comprehensive authentication flow tests
4. **Documentation:** Clear authentication architecture documentation

### Long-term Improvements
1. **Migration Strategy:** Comprehensive migration management process
2. **Development Workflow:** Schema changes integrated into development cycle
3. **Monitoring:** Database schema monitoring and alerting
4. **Training:** Team education on database integration best practices

---

## Technical Debt Created

### Immediate Technical Debt
- Authentication system in unstable state
- Inconsistent error handling across authentication flows
- Demo/development code mixed with production code
- Missing comprehensive authentication tests

### Accumulated Technical Debt  
- Gap between designed features and implemented features
- Complex authentication code without corresponding database support
- Multiple authentication patterns in codebase
- Insufficient documentation of authentication architecture

---

## Next Steps & Recommendations

### Immediate Actions (Next 24 Hours)
1. **Decision Point:** Choose solution approach (Fix vs Rollback vs Hybrid)
2. **Stakeholder Communication:** Notify relevant parties of issue and approach
3. **Environment Setup:** Prepare staging environment for testing chosen solution
4. **Backup Planning:** Ensure database backups before any changes

### Short-term Actions (Next 1-2 Weeks)
1. **Implementation:** Execute chosen solution with comprehensive testing
2. **Validation:** Full authentication flow testing in staging
3. **Documentation:** Update authentication system documentation
4. **Process Improvement:** Implement prevention measures

### Long-term Actions (Next 1-3 Months)
1. **Architecture Review:** Complete authentication system architecture review
2. **Security Audit:** Comprehensive security testing after stabilization
3. **Process Enhancement:** Improve development and deployment processes
4. **Team Training:** Education on database integration best practices

---

## Troubleshooting Quick Reference

### Common Error Patterns
```
Error: Unknown arg `userSession` in prisma.userSession.findFirst()
→ userSession table missing from database

Error: Unknown arg `passwordHash` in prisma.users.findUnique()
→ passwordHash field missing from users table

Error: Cannot read property 'name' of undefined (roles)
→ User roles schema mismatch between database and code

Error: Foreign key constraint violation
→ User-person relationship issues
```

### Emergency Commands
```bash
# Check current database schema
npx prisma db pull

# Generate fresh Prisma client
npx prisma generate

# Check migration status  
npx prisma migrate status

# Reset database to schema (DESTRUCTIVE)
npx prisma migrate reset --force
```

### Rollback Commands
```bash
# Create rollback branch
git checkout -b emergency-auth-rollback

# Find last stable authentication commit
git log --oneline --grep="auth" --since="2 weeks ago"

# Rollback to specific commit
git checkout <commit-hash> -- backend-node/src/modules/auth/
```

---

**Log Maintained By:** System Architecture Team  
**Last Updated:** September 12, 2025  
**Classification:** Internal Technical Documentation  
**Escalation Contact:** Development Team Lead