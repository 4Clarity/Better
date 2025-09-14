# Emergency Authentication Migration Guide

## Overview

This guide provides step-by-step instructions for implementing the emergency schema fix to resolve the critical authentication system failures in the Better TIP application.

**⚠️ CRITICAL**: This migration is required to fix broken authentication functionality. Without this fix, users cannot log in to the application.

## Pre-Migration Requirements

### 1. Database Backup
```bash
# Create a complete database backup before proceeding
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### 2. Environment Validation
Ensure these environment variables are properly configured:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (minimum 32 characters)

### 3. Application Downtime Planning
- Plan for brief application downtime during migration
- Notify users of maintenance window
- Prepare rollback plan if needed

## Migration Steps

### Step 1: Navigate to Backend Directory
```bash
cd backend-node
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Emergency Migration Script
```bash
# Option A: Use the automated script (recommended)
./emergency-auth-migration.sh

# Option B: Manual migration (if script fails)
npx prisma generate
npx prisma migrate deploy
```

### Step 4: Verify Migration Success
```bash
# Check migration status
npx prisma migrate status

# Verify new tables exist
psql $DATABASE_URL -c "\\d user_sessions"
psql $DATABASE_URL -c "\\d roles"
psql $DATABASE_URL -c "\\d user_roles"

# Check default roles were created
psql $DATABASE_URL -c "SELECT * FROM roles;"
```

### Step 5: Restart Application
```bash
# Restart your Node.js application
npm run start
# or
pm2 restart your-app-name
# or
docker-compose restart backend
```

## Post-Migration Verification

### 1. Database Schema Verification
Run these queries to confirm the migration was successful:

```sql
-- Check user_sessions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_sessions';

-- Check users table has passwordHash field
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'passwordHash';

-- Verify default roles exist
SELECT id, name, description FROM roles;

-- Check user roles migration (should show migrated roles)
SELECT 
    u.username, 
    r.name as role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id 
LIMIT 5;
```

### 2. Application Health Check
```bash
# Test API health endpoint
curl http://localhost:3000/api/health

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/demo-login
```

### 3. Frontend Integration Test
1. Access the application frontend
2. Attempt to log in with demo credentials
3. Verify session management works
4. Check user profile displays correctly

## Troubleshooting

### Issue: Migration Fails with Foreign Key Constraint Error
```bash
# If migration fails due to constraints, try running the manual SQL
psql $DATABASE_URL -f prisma/migrations/002_emergency_authentication_fix.sql
```

### Issue: Prisma Client Out of Sync
```bash
# Regenerate Prisma client
npx prisma generate --force

# Restart application
npm run start
```

### Issue: Authentication Still Fails After Migration
```bash
# Check application logs
tail -f logs/application.log

# Verify environment variables
node -e "console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)"

# Test database connection
npx prisma studio
```

### Issue: User Roles Not Working
```sql
-- Check if roles were migrated correctly
SELECT 
    u.id, 
    u.username, 
    u.roles as old_roles,
    COUNT(ur.id) as new_role_count
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur."userId"
WHERE u.roles != '[]'::jsonb
GROUP BY u.id, u.username, u.roles;
```

## Rollback Plan (Emergency Only)

If the migration causes critical issues and you need to rollback:

### Option 1: Database Restore
```bash
# Restore from backup (DESTRUCTIVE - loses all data since backup)
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

### Option 2: Selective Rollback
```sql
-- Drop new tables (keeps existing data)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Remove new columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS passwordHash;
ALTER TABLE users DROP COLUMN IF EXISTS passwordResetToken;
ALTER TABLE users DROP COLUMN IF EXISTS passwordResetExpires;
```

### Option 3: Code Rollback
```bash
# Revert to previous authentication code version
git checkout HEAD~1 -- src/modules/auth/
git checkout HEAD~1 -- prisma/schema.prisma

# Regenerate client and restart
npx prisma generate
npm run start
```

## Performance Impact Assessment

### Expected Performance Changes
- **Positive**: Better query performance for user role checks (indexed relations vs JSON parsing)
- **Positive**: Improved session management with proper indexing
- **Neutral**: Minimal impact on existing core functionality
- **Monitoring**: Watch for increased database connections during session management

### Monitoring Recommendations
```sql
-- Monitor session table growth
SELECT COUNT(*) as active_sessions FROM user_sessions WHERE "isActive" = true;

-- Check for slow queries
SELECT query, mean_time, calls FROM pg_stat_statements WHERE query LIKE '%user_sessions%' ORDER BY mean_time DESC;

-- Monitor role query performance  
EXPLAIN ANALYZE SELECT r.name FROM users u 
JOIN user_roles ur ON u.id = ur."userId" 
JOIN roles r ON ur."roleId" = r.id 
WHERE u.id = 'test-user-id';
```

## Security Considerations

### 1. Immediate Security Improvements
- ✅ Proper session management with expiration
- ✅ Password hashing capability restored
- ✅ Role-based access control normalized
- ✅ Session security fingerprinting enabled

### 2. Recommended Post-Migration Actions
```bash
# Update all demo/default passwords
# Enable proper password policies
# Review and update JWT secret rotation
# Implement session monitoring
# Enable audit logging
```

### 3. Security Validation Checklist
- [ ] Demo authentication bypass removed from production
- [ ] Password hashing working for new users
- [ ] Session expiration working correctly
- [ ] Role permissions enforced properly
- [ ] JWT tokens contain correct user information
- [ ] Refresh token rotation functioning

## Success Criteria

The migration is successful when:

1. ✅ All database tables created without errors
2. ✅ Default roles inserted successfully
3. ✅ Existing user roles migrated to new structure
4. ✅ Application starts without database connection errors
5. ✅ Demo login functionality works
6. ✅ User sessions are created and managed properly
7. ✅ Password authentication is functional (after setting passwords)
8. ✅ JWT tokens contain correct user and role information

## Support and Escalation

### If Migration Fails
1. **Immediate**: Check application logs for specific error messages
2. **Database**: Verify database connectivity and permissions
3. **Schema**: Confirm Prisma schema matches database state
4. **Rollback**: Use rollback procedures if system is unstable

### If Authentication Issues Persist
1. Check JWT secret configuration
2. Verify database foreign key constraints
3. Test with fresh browser session (clear cookies)
4. Review application middleware for authentication handling

### Emergency Contact Protocol
- **Critical System Down**: Implement immediate rollback
- **Partial Functionality**: Continue troubleshooting with monitoring
- **Security Concern**: Isolate issue and review audit logs

---

## Testing Commands Reference

```bash
# Quick health check
curl -X POST http://localhost:3000/api/auth/demo-login

# Database connectivity
npx prisma db pull --print | head -10

# Migration status  
npx prisma migrate status

# View active sessions
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_sessions WHERE \"isActive\" = true;"

# Check user roles
psql $DATABASE_URL -c "SELECT u.username, r.name FROM users u JOIN user_roles ur ON u.id = ur.\"userId\" JOIN roles r ON ur.\"roleId\" = r.id LIMIT 5;"
```

---

**Migration Prepared By**: Emergency Response Team  
**Date**: 2025-09-12  
**Version**: 1.0  
**Classification**: Critical System Maintenance