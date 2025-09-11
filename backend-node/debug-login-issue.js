const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugLoginIssue() {
  console.log('🔍 Debugging login issue for Richard.Roach@gmail.com...\\n');
  
  try {
    const testEmail = 'Richard.Roach@gmail.com';
    const testPassword = 'T1PAdmin1234!';
    
    console.log('1️⃣ Testing exact email match...');
    console.log('   Searching for:', testEmail);
    
    // Test exact email match (case sensitive)
    const exactUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: testEmail
        }
      },
      include: { person: true }
    });
    
    console.log('   Exact match result:', exactUser ? 'FOUND' : 'NOT FOUND');
    if (exactUser) {
      console.log('   User ID:', exactUser.id);
      console.log('   Username:', exactUser.username);
      console.log('   Account Status:', exactUser.accountStatus);
      console.log('   Has Password:', !!exactUser.passwordHash);
    }
    
    console.log('\\n2️⃣ Testing case-insensitive email match...');
    
    const caseInsensitiveUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: {
            equals: testEmail,
            mode: 'insensitive'
          }
        }
      },
      include: { person: true }
    });
    
    console.log('   Case-insensitive result:', caseInsensitiveUser ? 'FOUND' : 'NOT FOUND');
    if (caseInsensitiveUser) {
      console.log('   User ID:', caseInsensitiveUser.id);
      console.log('   Username:', caseInsensitiveUser.username);
      console.log('   Account Status:', caseInsensitiveUser.accountStatus);
      console.log('   Has Password:', !!caseInsensitiveUser.passwordHash);
      console.log('   Actual Email:', caseInsensitiveUser.person.primaryEmail);
    }
    
    console.log('\\n3️⃣ Testing lowercase email match...');
    
    const lowercaseUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: testEmail.toLowerCase()
        }
      },
      include: { person: true }
    });
    
    console.log('   Lowercase result:', lowercaseUser ? 'FOUND' : 'NOT FOUND');
    if (lowercaseUser) {
      console.log('   User ID:', lowercaseUser.id);
      console.log('   Username:', lowercaseUser.username);
      console.log('   Account Status:', lowercaseUser.accountStatus);
      console.log('   Has Password:', !!lowercaseUser.passwordHash);
      console.log('   Actual Email:', lowercaseUser.person.primaryEmail);
      
      if (lowercaseUser.passwordHash) {
        console.log('\\n4️⃣ Testing password verification...');
        const passwordValid = await bcrypt.compare(testPassword, lowercaseUser.passwordHash);
        console.log('   Password verification:', passwordValid ? 'VALID' : 'INVALID');
      }
    }
    
    console.log('\\n5️⃣ Finding all Richard Roach accounts...');
    
    const allUsers = await prisma.user.findMany({
      where: {
        person: {
          OR: [
            { primaryEmail: { contains: 'richard.roach', mode: 'insensitive' } },
            { firstName: 'Richard' }
          ]
        }
      },
      include: { person: true }
    });
    
    console.log(`   Found ${allUsers.length} accounts:\\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`   Account ${index + 1}:`);
      console.log(`     - User ID: ${user.id}`);
      console.log(`     - Email: ${user.person.primaryEmail}`);
      console.log(`     - Status: ${user.accountStatus}`);
      console.log(`     - Has Password: ${!!user.passwordHash}`);
      console.log(`     - Name: ${user.person.firstName} ${user.person.lastName}`);
      console.log('');
    });
    
    console.log('🔍 DIAGNOSIS:');
    
    // Check auth service implementation
    console.log('\\n6️⃣ Checking auth service implementation...');
    
    const fs = require('fs');
    const authServiceContent = fs.readFileSync('./src/modules/auth/auth.service.ts', 'utf8');
    
    const hasEmailQuery = authServiceContent.includes('primaryEmail');
    const hasCaseInsensitive = authServiceContent.includes('mode:') || authServiceContent.includes('insensitive');
    const hasPasswordVerification = authServiceContent.includes('verifyPassword');
    
    console.log('   Auth service analysis:');
    console.log('     - Queries by email:', hasEmailQuery ? 'YES' : 'NO');
    console.log('     - Case insensitive search:', hasCaseInsensitive ? 'YES' : 'NO');
    console.log('     - Password verification:', hasPasswordVerification ? 'YES' : 'NO');
    
    // Find the exact query pattern used in auth service
    const emailQueryPattern = authServiceContent.match(/primaryEmail[^}]+}/g);
    if (emailQueryPattern) {
      console.log('\\n   Email query pattern found:');
      emailQueryPattern.forEach(pattern => {
        console.log(`     ${pattern}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLoginIssue();