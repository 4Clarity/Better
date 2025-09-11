const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuthFlow() {
  console.log('🔍 Testing complete authentication flow...\\n');
  
  try {
    const testEmail = 'Richard.Roach@gmail.com';
    const testPassword = 'T1PAdmin1234!';
    
    console.log('1️⃣ Simulating findUserByEmail logic...');
    console.log('   Original email:', testEmail);
    console.log('   Lowercase email:', testEmail.toLowerCase());
    
    // Simulate the exact query from findUserByEmail
    const user = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: testEmail.toLowerCase(),
        },
      },
      include: {
        person: true,
      },
    });
    
    if (!user || !user.person) {
      console.log('❌ User not found with lowercase email search');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.person.primaryEmail,
      accountStatus: user.accountStatus,
      hasPasswordHash: !!user.passwordHash
    });
    
    console.log('\\n2️⃣ Checking account status...');
    
    if (user.accountStatus !== 'ACTIVE') {
      console.log('❌ Account is not ACTIVE:', user.accountStatus);
      if (user.statusReason) {
        console.log('   Status reason:', user.statusReason);
      }
      return;
    }
    
    console.log('✅ Account status is ACTIVE');
    
    console.log('\\n3️⃣ Testing password verification...');
    
    if (!user.passwordHash) {
      console.log('❌ No password hash found for user');
      return;
    }
    
    console.log('✅ Password hash exists');
    console.log('   Hash preview:', user.passwordHash.substring(0, 20) + '...');
    
    // Test password verification (simulating verifyPassword method)
    const isValidPassword = await bcrypt.compare(testPassword, user.passwordHash);
    
    console.log('✅ Password verification result:', isValidPassword ? 'VALID' : 'INVALID');
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed!');
      
      // Test if password was set correctly
      console.log('\\n   🔍 Testing with known working password...');
      
      // Try to find what password might work
      const testPasswords = ['T1PAdmin1234!', 'TIPAdmin1234!', 'admin', 'password'];
      
      for (const pwd of testPasswords) {
        const testResult = await bcrypt.compare(pwd, user.passwordHash);
        console.log(`     Testing "${pwd}":`, testResult ? 'MATCH' : 'no match');
        if (testResult) break;
      }
      
      return;
    }
    
    console.log('\\n4️⃣ Simulating auth response creation...');
    
    // Create auth user object (simulating the auth service response)
    const authUser = {
      id: user.id,
      email: user.person.primaryEmail,
      username: user.person.primaryEmail, // Use email as username per the change
      roles: Array.isArray(user.roles) ? user.roles : [],
      person: {
        id: user.person.id,
        firstName: user.person.firstName,
        lastName: user.person.lastName,
        displayName: user.person.displayName || `${user.person.firstName} ${user.person.lastName}`,
      },
    };
    
    console.log('✅ Auth user object created:', {
      id: authUser.id,
      email: authUser.email,
      username: authUser.username,
      personName: `${authUser.person.firstName} ${authUser.person.lastName}`
    });
    
    console.log('\\n🎉 AUTHENTICATION FLOW TEST RESULTS:');
    console.log('✅ Email lookup: WORKING');
    console.log('✅ Account status: ACTIVE');  
    console.log('✅ Password hash: EXISTS');
    console.log('✅ Password verification:', isValidPassword ? 'WORKING' : 'FAILED');
    console.log('✅ Auth object creation: WORKING');
    
    if (isValidPassword) {
      console.log('\\n🔐 LOGIN SHOULD WORK WITH:');
      console.log('   Email: Richard.Roach@gmail.com (or richard.roach@gmail.com)');
      console.log('   Password: T1PAdmin1234!');
      console.log('');
      console.log('⚠️  If login still fails, check:');
      console.log('   - Frontend form validation');
      console.log('   - Network connectivity');
      console.log('   - API endpoint routing');
      console.log('   - JWT token generation');
      console.log('   - Session management');
    }
    
  } catch (error) {
    console.error('❌ Auth flow test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFlow();