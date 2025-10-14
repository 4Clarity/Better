# Prisma Quick Reference Card
**🚨 READ THIS BEFORE WRITING ANY PRISMA QUERIES 🚨**

---

## Golden Rules

### Rule #1: Check Schema First
```bash
# ALWAYS open this file before writing Prisma code:
backend-node/prisma/schema.prisma
```

### Rule #2: Use Exact Names
❌ **WRONG**: Guessing model names
```typescript
const data = await prisma.contract.findMany();     // ❌ Singular - might be wrong!
const data = await prisma.transition.findMany();   // ❌ Might be plural!
```

✅ **CORRECT**: Check schema, use exact name
```typescript
const data = await prisma.contracts.findMany();    // ✅ Check schema first!
const data = await prisma.transitions.findMany();  // ✅ Verified in schema!
```

### Rule #3: Regenerate After Changes
```bash
# After ANY schema.prisma change:
docker-compose exec backend-node sh -c "npx prisma generate"
docker-compose restart backend-node
```

---

## Common Mistakes & Fixes

### 1. Model Name Pluralization
```typescript
// ❌ WRONG - Using singular
prisma.contract.findMany()
prisma.transition.findMany()
prisma.milestone.findMany()

// ✅ CORRECT - Check schema.prisma
prisma.contracts.findMany()
prisma.transitions.findMany()
prisma.milestones.findMany()
```

### 2. Relation Names Casing
```typescript
// ❌ WRONG - Capitalized
include: {
  Milestone: true,
  User: true,
  BusinessOperation: true
}

// ✅ CORRECT - Check schema.prisma
include: {
  milestones: true,
  transition_users: true,
  business_operations: true
}
```

### 3. Field Name Mapping
```typescript
// ❌ WRONG - Not mapping field names
await prisma.contracts.create({
  data: {
    contractName: data.contractName,      // ❌ Database expects snake_case
    startDate: data.startDate,            // ❌ Wrong field name
  }
});

// ✅ CORRECT - Map camelCase to snake_case
await prisma.contracts.create({
  data: {
    contract_name: data.contractName,     // ✅ Matches database column
    start_date: data.startDate,           // ✅ Correct mapping
  }
});
```

### 4. Non-Existent Relations
```typescript
// ❌ WRONG - Assuming relation exists
include: {
  user: true,                    // ❌ This relation might not exist!
  contract: true,                // ❌ Check schema first!
}

// ✅ CORRECT - Verify in schema.prisma
include: {
  transition_users: true,        // ✅ Verified in schema
  business_operations: true,     // ✅ Relation exists
}
```

---

## Step-by-Step Workflow

### Before Writing Prisma Code:

```
1. Open: backend-node/prisma/schema.prisma
2. Search for: model <your_table_name>
3. Note:
   - Exact model name (singular/plural?)
   - All relation names (exact casing)
   - All field names (snake_case)
4. Write query using EXACT names from schema
```

### After Changing Schema:

```bash
# Required steps (NO SHORTCUTS!):

1. Edit schema.prisma
2. docker-compose exec backend-node sh -c "npx prisma generate"
3. docker-compose restart backend-node
4. docker-compose logs backend-node | grep "Server listening"
5. Test your endpoint
```

---

## Quick Checklist

When writing Prisma queries, ask yourself:

- [ ] Did I open schema.prisma first?
- [ ] Is the model name exactly as shown in schema?
- [ ] Are all relation names lowercase/exact?
- [ ] Did I map camelCase fields to snake_case?
- [ ] Did I verify the relation exists on both sides?
- [ ] Did I regenerate Prisma client after schema changes?
- [ ] Did I restart the backend service?

---

## Common Error Messages & Solutions

### "Cannot read properties of undefined (reading 'findMany')"
**Cause**: Wrong model name or Prisma client not regenerated
**Fix**: Check schema.prisma for exact model name, regenerate client

### "Unknown argument `fieldName`"
**Cause**: Field doesn't exist in model or wrong field name
**Fix**: Check schema.prisma for correct field names

### "Invalid ... invocation"
**Cause**: Using camelCase when database expects snake_case
**Fix**: Map field names: `contract_name` not `contractName`

### "Relation ... does not exist"
**Cause**: Trying to include a relation that's not defined
**Fix**: Check schema.prisma for actual relation name

---

## Field Naming Convention

| Layer | Convention | Example |
|-------|-----------|---------|
| Database | snake_case | `contract_name` |
| Prisma Schema | snake_case | `contract_name` |
| TypeScript API | camelCase | `contractName` |
| Service Layer | **Map between** | `contract_name: data.contractName` |

---

## Emergency Debugging

If you're getting Prisma errors:

```bash
# 1. Check what Prisma thinks is in the database
docker-compose exec backend-node sh -c "npx prisma db pull"

# 2. Check generated Prisma client
cat backend-node/node_modules/.prisma/client/index.d.ts | grep "model.*{"

# 3. Verify backend logs
docker-compose logs backend-node | tail -50

# 4. Reset if needed (CAUTION: drops data)
docker-compose exec backend-node sh -c "npx prisma db push --force-reset"
```

---

## Remember

> **"Check schema.prisma first, guess never"**
> - Every Prisma query

> **"Regenerate and restart after schema changes"**
> - Every successful deployment

> **"One character difference breaks everything"**
> - `transition` vs `transitions`

---

**Keep this file open when writing Prisma code!**
