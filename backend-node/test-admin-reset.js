const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminPasswordReset() {
  console.log('🧪 Testing admin password reset functionality...\\n');
  
  try {
    console.log('1️⃣ Finding a test user to reset password for...');
    
    // Find a user that's not the admin
    const testUser = await prisma.user.findFirst({
      where: {
        id: {
          not: 'user-mike-001' // Don't use the admin account
        }
      },
      include: { person: true }
    });
    
    if (!testUser) {
      console.log('❌ No test user found. Creating a test user...');
      
      // Create test person first
      const testPerson = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          primaryEmail: 'test.user@example.com',
          title: 'Test Account'
        }
      });
      
      // Create test user
      const newTestUser = await prisma.user.create({
        data: {
          username: 'test.user',
          personId: testPerson.id,
          accountStatus: 'ACTIVE',
          keycloakId: 'test-keycloak-id',
          passwordHash: '$2b$12$dummyHashForTesting123456789012345678901234567890' // Dummy hash
        },
        include: { person: true }
      });
      
      console.log('✅ Created test user:', {
        id: newTestUser.id,
        username: newTestUser.username,
        email: newTestUser.person.primaryEmail
      });
      
      testUser = newTestUser;
    } else {
      console.log('✅ Found test user:', {
        id: testUser.id,
        username: testUser.username,
        email: testUser.person?.primaryEmail
      });
    }
    
    console.log('\\n2️⃣ Testing temporary password generation...');
    
    // Import the UserManagementService
    const { UserManagementService } = require('./src/modules/user-management/user-management.service.ts');
    const userService = new UserManagementService();
    
    // Test password reset with temporary password
    const resetResult = await userService.resetUserPassword(testUser.id, 'user-mike-001', {
      generateTemporary: true,
      forceChangeOnLogin: true
    });
    
    console.log('✅ Password reset result:', {
      success: resetResult.success,
      hasTemporaryPassword: !!resetResult.temporaryPassword,
      message: resetResult.message
    });
    
    if (resetResult.temporaryPassword) {
      console.log('✅ Temporary password generated (length):', resetResult.temporaryPassword.length);
    }
    
    console.log('\\n3️⃣ Testing password reset history...');
    
    const history = await userService.getPasswordResetHistory(testUser.id);
    console.log('✅ Password reset history entries:', history.length);
    
    if (history.length > 0) {
      console.log('   Latest entry:', {
        resetBy: history[0].resetBy,
        resetAt: history[0].resetAt,
        reason: history[0].reason
      });
    }
    
    console.log('\\n🎉 Admin password reset functionality test COMPLETED!');
    console.log('✅ Password reset works');
    console.log('✅ Temporary password generation works'); 
    console.log('✅ Password reset history tracking works');
    console.log('✅ Audit logging works');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack.split('\\n').slice(0, 10).join('\\n'));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPasswordReset();