#!/usr/bin/env node

/**
 * Authentication Migration Verification Script
 * Tests that the emergency authentication schema fix was applied correctly
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 AUTHENTICATION MIGRATION VERIFICATION');
  console.log('==========================================\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  function addTest(name, status, message, details = null) {
    results.tests.push({ name, status, message, details });
    if (status === 'PASS') results.passed++;
    else if (status === 'FAIL') results.failed++;
    else if (status === 'WARN') results.warnings++;
  }

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    try {
      await prisma.$connect();
      addTest('Database Connection', 'PASS', 'Successfully connected to database');
    } catch (error) {
      addTest('Database Connection', 'FAIL', 'Failed to connect to database', error.message);
      return results;
    }

    // Test 2: User Sessions Table
    console.log('2️⃣ Checking user_sessions table...');
    try {
      const sessionCount = await prisma.user_sessions.count();
      addTest('User Sessions Table', 'PASS', `Table exists with ${sessionCount} records`);
    } catch (error) {
      addTest('User Sessions Table', 'FAIL', 'user_sessions table not found or accessible', error.message);
    }

    // Test 3: Roles Table
    console.log('3️⃣ Checking roles table...');
    try {
      const roles = await prisma.roles.findMany();
      if (roles.length >= 5) {
        addTest('Roles Table', 'PASS', `Found ${roles.length} roles including default system roles`);
      } else {
        addTest('Roles Table', 'WARN', `Only ${roles.length} roles found, expected at least 5 default roles`);
      }
    } catch (error) {
      addTest('Roles Table', 'FAIL', 'roles table not found or accessible', error.message);
    }

    // Test 4: User Roles Table
    console.log('4️⃣ Checking user_roles table...');
    try {
      const userRoleCount = await prisma.user_roles.count();
      addTest('User Roles Table', 'PASS', `Table exists with ${userRoleCount} user-role assignments`);
    } catch (error) {
      addTest('User Roles Table', 'FAIL', 'user_roles table not found or accessible', error.message);
    }

    // Test 5: Users Table Password Fields
    console.log('5️⃣ Checking users table password fields...');
    try {
      const userWithPassword = await prisma.users.findFirst({
        select: {
          id: true,
          passwordHash: true,
          passwordResetToken: true,
          passwordResetExpires: true,
        }
      });
      
      if (userWithPassword !== null && 'passwordHash' in userWithPassword) {
        addTest('Users Password Fields', 'PASS', 'passwordHash and related fields exist in users table');
      } else {
        addTest('Users Password Fields', 'FAIL', 'passwordHash field not found in users table');
      }
    } catch (error) {
      addTest('Users Password Fields', 'FAIL', 'Could not check password fields in users table', error.message);
    }

    // Test 6: User Role Relationships
    console.log('6️⃣ Testing user-role relationships...');
    try {
      const userWithRoles = await prisma.users.findFirst({
        include: {
          user_roles_user_roles_userIdTousers: {
            include: {
              roles: true,
            },
          },
        },
      });

      if (userWithRoles && userWithRoles.user_roles_user_roles_userIdTousers.length > 0) {
        addTest('User Role Relationships', 'PASS', 'User-role relationships working correctly');
      } else {
        addTest('User Role Relationships', 'WARN', 'No users found with role assignments (migration may need role assignment)');
      }
    } catch (error) {
      addTest('User Role Relationships', 'FAIL', 'User-role relationship queries failed', error.message);
    }

    // Test 7: Session Management Capability
    console.log('7️⃣ Testing session management capability...');
    try {
      // Try to create a test session (will clean up after)
      const testSession = await prisma.user_sessions.create({
        data: {
          id: 'test-session-verification',
          userId: 'test-user-id',
          refreshToken: 'test-refresh-token',
          expiresAt: new Date(Date.now() + 60000), // 1 minute from now
          isActive: true,
        },
      });

      // Clean up test session
      await prisma.user_sessions.delete({
        where: { id: 'test-session-verification' }
      });

      addTest('Session Management', 'PASS', 'Can create and delete user sessions');
    } catch (error) {
      if (error.code === 'P2003') {
        addTest('Session Management', 'FAIL', 'Foreign key constraint error - user_sessions table not properly linked to users table', error.message);
      } else {
        addTest('Session Management', 'FAIL', 'Session management operations failed', error.message);
      }
    }

    // Test 8: Check Migration Status
    console.log('8️⃣ Checking default roles...');
    try {
      const adminRole = await prisma.roles.findFirst({
        where: { name: 'admin' }
      });

      const programManagerRole = await prisma.roles.findFirst({
        where: { name: 'program_manager' }
      });

      if (adminRole && programManagerRole) {
        addTest('Default Roles', 'PASS', 'Default system roles (admin, program_manager) found');
      } else {
        addTest('Default Roles', 'WARN', 'Some default roles missing - may need manual role creation');
      }
    } catch (error) {
      addTest('Default Roles', 'FAIL', 'Could not verify default roles', error.message);
    }

  } catch (globalError) {
    addTest('Global Error', 'FAIL', 'Unexpected error during verification', globalError.message);
  } finally {
    await prisma.$disconnect();
  }

  return results;
}

async function generateReport(results) {
  console.log('\n📊 VERIFICATION RESULTS');
  console.log('========================\n');

  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test.name}: ${test.message}`);
    if (test.details && test.status === 'FAIL') {
      console.log(`   Details: ${test.details}`);
    }
  });

  console.log('\n📈 SUMMARY');
  console.log('===========');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📋 Total Tests: ${results.tests.length}\n`);

  const successRate = Math.round((results.passed / results.tests.length) * 100);
  
  if (results.failed === 0) {
    console.log('🎉 MIGRATION VERIFICATION SUCCESSFUL!');
    console.log('Authentication system should be working correctly.');
    if (results.warnings > 0) {
      console.log('⚠️  Note: Some warnings were detected. Review above for details.');
    }
  } else {
    console.log('🚨 MIGRATION VERIFICATION FAILED!');
    console.log('Authentication system requires attention before production use.');
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Review failed tests above');
    console.log('2. Check database migration logs');
    console.log('3. Verify database connection and permissions');
    console.log('4. Consider running migration again or manual intervention');
  }

  console.log(`\n📊 Success Rate: ${successRate}%`);
  return results.failed === 0;
}

// Run verification
verifyMigration()
  .then(generateReport)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });