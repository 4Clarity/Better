# KM.1.4 Blocking Schema Change Resolution Task List

**Created:** 2025-09-18
**Status:** Active
**Priority:** BLOCKING
**Epic:** Knowledge Management - Database Schema and Backend Foundation
**Parent Story:** KM.1.4 Complete Backend API Foundation

## Overview

This document outlines the specific schema mismatches and compilation errors that must be resolved before the Knowledge Management API implementation can be deployed to production. These issues were identified during comprehensive QA review and TypeScript compilation analysis.

## Critical Schema Alignment Issues

### 1. Categories Service Schema Mismatches

**File:** `src/modules/knowledge/categories.service.ts`
**Issue:** Service references fields that don't exist in the current Prisma schema

#### Missing Fields in `km_categories` Model:
- ❌ `sortOrder` - Referenced in service but schema has `displayOrder`
- ❌ `usageCount` - Referenced in service but not in schema

#### Resolution Tasks:

##### T1.1: Fix Categories Field Mapping
**Estimated Time:** 30 minutes
**Dependencies:** None

**Steps:**
1. **Update field references in `categories.service.ts`:**
   - Replace all instances of `sortOrder` with `displayOrder`
   - Remove all references to `usageCount` field from Prisma queries
   - Update the `calculateUsageStatistics` method to calculate usage count without storing it in database

2. **Files to modify:**
   - `src/modules/knowledge/categories.service.ts` (lines 247, 269, 275, 341, 347, 353, 413, 420, 526, 532, 750, 753)

3. **Specific changes needed:**
   ```typescript
   // BEFORE:
   sortOrder: categoryData.sortOrder
   usageCount: true

   // AFTER:
   displayOrder: categoryData.displayOrder
   // Remove usageCount from select statements
   ```

##### T1.2: Update Categories Route Schema
**Estimated Time:** 15 minutes
**Dependencies:** T1.1

**Steps:**
1. **Update Zod schemas in `categories.route.ts`:**
   - Change `sortOrder` to `displayOrder` in validation schemas
   - Update TypeScript interfaces to match

2. **Files to modify:**
   - `src/modules/knowledge/categories.route.ts`

### 2. Facts Service Schema Mismatches

**File:** `src/modules/knowledge/facts.service.ts`
**Issue:** Service references fields with incorrect names or missing relationships

#### Schema Mismatches in `km_facts` Model:
- ❌ `source` - Service expects this field but schema has `sourceDocumentId`/`sourceCommunicationId`
- ❌ `sourceEntityType` - Referenced in service but not in schema
- ❌ `metadata` - Service expects this but schema has `extractionMetadata`
- ❌ `km_documents` relationship - Incorrect include syntax

#### Resolution Tasks:

##### T2.1: Fix Facts Field Mapping
**Estimated Time:** 45 minutes
**Dependencies:** None

**Steps:**
1. **Update field references in `facts.service.ts`:**
   - Replace `source` references with proper `sourceDocumentId`/`sourceCommunicationId` logic
   - Replace `sourceEntityType` with conditional logic based on which source field is populated
   - Replace `metadata` with `extractionMetadata`
   - Fix relationship includes from `km_documents` to `source_document`

2. **Files to modify:**
   - `src/modules/knowledge/facts.service.ts` (lines 236, 263, 369, 441, 522, 523, 583)

3. **Specific changes needed:**
   ```typescript
   // BEFORE:
   source: 'DOCUMENT',
   sourceEntityType: fact.sourceEntityType,
   metadata: fact.metadata,
   km_documents: { select: {...} }

   // AFTER:
   sourceDocumentId: sourceDocumentId,
   // Calculate sourceEntityType based on sourceDocumentId vs sourceCommunicationId
   extractionMetadata: fact.extractionMetadata,
   source_document: { select: {...} }
   ```

##### T2.2: Update Facts Route Schema
**Estimated Time:** 20 minutes
**Dependencies:** T2.1

**Steps:**
1. **Update Zod schemas in `facts.route.ts`:**
   - Update field names to match corrected schema
   - Add proper validation for source relationships

2. **Files to modify:**
   - `src/modules/knowledge/facts.route.ts`

### 3. Tags Service Schema Mismatches

**File:** `src/modules/knowledge/tags.service.ts`
**Issue:** Service references `type` field but schema has `tagType`

#### Schema Mismatches in `km_tags` Model:
- ❌ `type` - Service expects this field but schema has `tagType`

#### Resolution Tasks:

##### T3.1: Fix Tags Field Mapping
**Estimated Time:** 30 minutes
**Dependencies:** None

**Steps:**
1. **Update field references in `tags.service.ts`:**
   - Replace all instances of `type` with `tagType`
   - Update the `mapTagType` method to use correct field name

2. **Files to modify:**
   - `src/modules/knowledge/tags.service.ts` (lines 212, 499, 506, 514, 557, 577)

3. **Specific changes needed:**
   ```typescript
   // BEFORE:
   type: this.mapTagType(tagData.type)
   type: currentTag.type

   // AFTER:
   tagType: this.mapTagType(tagData.type)
   tagType: currentTag.tagType
   ```

##### T3.2: Update Tags Route Schema
**Estimated Time:** 15 minutes
**Dependencies:** T3.1

**Steps:**
1. **Update Zod schemas in `tags.route.ts`:**
   - Update validation to use `tagType` instead of `type`

2. **Files to modify:**
   - `src/modules/knowledge/tags.route.ts`

### 4. Communications Service Schema Mismatches

**File:** `src/modules/knowledge/communications.service.ts`
**Issue:** Direction field enum mapping inconsistencies

#### Schema Mismatches in `km_communications` Model:
- ⚠️ `direction` - Field exists but enum mapping may be inconsistent
- ❌ `recipientEmails` - Service uses this but schema has `toEmails`
- ❌ `participants` - Service references this but schema doesn't have this exact field
- ❌ `externalParticipants` - Service references this but not in schema

#### Resolution Tasks:

##### T4.1: Fix Communications Field Mapping
**Estimated Time:** 60 minutes
**Dependencies:** None

**Steps:**
1. **Review and fix field mappings in `communications.service.ts`:**
   - Map `recipientEmails` to `toEmails` in schema
   - Handle `participants` and `externalParticipants` using existing JSON fields
   - Verify direction enum mapping is correct

2. **Files to modify:**
   - `src/modules/knowledge/communications.service.ts`

3. **Check schema for direction field:**
   - Verify `CommunicationDirection` enum values match service expectations
   - Schema has: `Inbound`, `Outbound`, `Internal`
   - Service maps: `'INBOUND': 'Inbound'`, `'OUTBOUND': 'Outbound'`, `'INTERNAL': 'Internal'`

##### T4.2: Update Communications Route Schema
**Estimated Time:** 20 minutes
**Dependencies:** T4.1

**Steps:**
1. **Update Zod schemas to match corrected field names**

2. **Files to modify:**
   - `src/modules/knowledge/communications.route.ts`

### 5. Audit Log Schema Issues

**File:** `src/modules/knowledge/facts.service.ts`
**Issue:** AuditLog model field references

#### Schema Mismatches in `AuditLog` Model:
- ❌ `createdAt` - Service expects this but schema has `timestamp`

#### Resolution Tasks:

##### T5.1: Fix Audit Log Field References
**Estimated Time:** 15 minutes
**Dependencies:** None

**Steps:**
1. **Update AuditLog references in `facts.service.ts`:**
   - Replace `createdAt` with `timestamp` in orderBy clauses

2. **Files to modify:**
   - `src/modules/knowledge/facts.service.ts` (lines 684, 694)

## Logger Interface Issues

### 6. Fastify Logger Method Issues

**Files:** All controller files in Knowledge Management module
**Issue:** Controllers using `logger.error()` method not available in Fastify logger interface

#### Affected Files:
- `src/modules/knowledge/categories.controller.ts`
- `src/modules/knowledge/communications.controller.ts`
- `src/modules/knowledge/documents.controller.ts`
- `src/modules/knowledge/facts.controller.ts`
- `src/modules/knowledge/tags.controller.ts`

#### Resolution Tasks:

##### T6.1: Fix Logger Interface Calls
**Estimated Time:** 30 minutes
**Dependencies:** None

**Steps:**
1. **Replace `logger.error()` calls with correct Fastify logger methods:**
   - Use `req.log.error()` or `reply.log.error()` instead of `logger.error()`
   - Ensure all logging statements use proper Fastify request/reply logger

2. **Files to modify:**
   - `src/modules/knowledge/categories.controller.ts` (lines 103, 145, 186, 300, 395)
   - `src/modules/knowledge/communications.controller.ts` (lines 68, 110, 151, 218, 292)
   - `src/modules/knowledge/documents.controller.ts` (lines 68, 110, 151, 218, 292)
   - `src/modules/knowledge/facts.controller.ts` (lines 92, 145, 186, 289, 372)
   - `src/modules/knowledge/tags.controller.ts` (lines 88, 139, 180, 285, 379)

3. **Pattern to follow:**
   ```typescript
   // BEFORE:
   logger.error('Error message', error);

   // AFTER:
   req.log.error({ error }, 'Error message');
   ```

## Validation and Testing Tasks

### 7. Post-Fix Validation

#### T7.1: TypeScript Compilation Verification
**Estimated Time:** 15 minutes
**Dependencies:** T1.1, T2.1, T3.1, T4.1, T5.1, T6.1

**Steps:**
1. **Run TypeScript compilation:**
   ```bash
   npm run build
   ```

2. **Verify no compilation errors in Knowledge Management modules**

3. **Fix any remaining TypeScript errors**

#### T7.2: Unit Test Updates
**Estimated Time:** 45 minutes
**Dependencies:** T7.1

**Steps:**
1. **Update unit tests to match corrected field names:**
   - Update mock data in test files
   - Verify test assertions match corrected schema

2. **Files to update:**
   - `src/modules/knowledge/__tests__/categories.service.test.ts`
   - `src/modules/knowledge/__tests__/facts.service.test.ts`
   - `src/modules/knowledge/__tests__/tags.service.test.ts`
   - `src/modules/knowledge/__tests__/communications.service.test.ts`

3. **Run tests to verify fixes:**
   ```bash
   npm test
   ```

#### T7.3: Integration Testing
**Estimated Time:** 30 minutes
**Dependencies:** T7.2

**Steps:**
1. **Test API endpoints with corrected schema:**
   - Verify all CRUD operations work correctly
   - Test request/response validation
   - Confirm database operations succeed

2. **Run integration tests if available:**
   ```bash
   npm run test:integration
   ```

## Implementation Checklist

### Phase 1: Core Schema Fixes (Blocking)
- [ ] **T1.1:** Fix Categories field mapping (sortOrder → displayOrder, remove usageCount)
- [ ] **T1.2:** Update Categories route schema
- [ ] **T2.1:** Fix Facts field mapping (source, sourceEntityType, metadata)
- [ ] **T2.2:** Update Facts route schema
- [ ] **T3.1:** Fix Tags field mapping (type → tagType)
- [ ] **T3.2:** Update Tags route schema
- [ ] **T4.1:** Fix Communications field mapping (recipientEmails, participants)
- [ ] **T4.2:** Update Communications route schema
- [ ] **T5.1:** Fix Audit Log field references (createdAt → timestamp)

### Phase 2: Interface Fixes (High Priority)
- [ ] **T6.1:** Fix Fastify logger interface calls across all controllers

### Phase 3: Validation (Required)
- [ ] **T7.1:** TypeScript compilation verification
- [ ] **T7.2:** Unit test updates and verification
- [ ] **T7.3:** Integration testing

## Success Criteria

✅ **Deployment Ready When:**
1. All TypeScript compilation errors resolved
2. All unit tests passing
3. Integration tests passing
4. No runtime errors during API operations
5. All CRUD operations working correctly with actual database

## Estimated Total Time

**Total Implementation Time:** ~5.5 hours
- Phase 1: ~3.5 hours
- Phase 2: ~0.5 hours
- Phase 3: ~1.5 hours

## Risk Assessment

**High Risk Areas:**
1. **Database field mappings** - Changes may affect existing data
2. **API contract changes** - Frontend may need updates if field names change in responses
3. **Test data compatibility** - Existing test fixtures may need updates

**Mitigation Strategies:**
1. Test thoroughly in development environment first
2. Coordinate with frontend team on any API contract changes
3. Update API documentation to reflect field name changes
4. Consider database migration scripts if data transformation needed

## Notes for Implementation

1. **Field Name Changes:** Some field names in the service layer differ from the database schema. The service layer should be updated to match the schema rather than changing the schema.

2. **Calculated Fields:** Fields like `usageCount` in categories should be calculated dynamically rather than stored in the database, which aligns with the current schema design.

3. **Relationship Includes:** Prisma include statements must use the exact relationship names defined in the schema.

4. **Enum Mappings:** Verify all enum mappings between API layer and database layer are correct and consistent.

5. **Logger Pattern:** Fastify uses request/reply-scoped loggers rather than global logger instances.

## Follow-up Actions

After completing these tasks:
1. Update API documentation to reflect any field name changes
2. Coordinate with frontend team on response format changes
3. Consider implementing database migration scripts if needed
4. Update deployment documentation with schema requirements
5. Schedule comprehensive end-to-end testing session

---

**Developer Notes:**
- This task list is based on TypeScript compilation errors and QA review findings
- Each task includes specific file locations and line numbers where possible
- Implementation should follow the existing coding standards and patterns
- Test-driven development approach recommended for complex changes