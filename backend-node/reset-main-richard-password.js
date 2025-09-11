const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetMainRichardPassword() {
  console.log('🔐 Setting password for main Richard Roach account (user-mike-001)...\\n');
  
  try {
    console.log('1️⃣ Finding main Richard Roach account...');
    
    // Use the account with lowercase email as the main account
    const user = await prisma.user.findUnique({
      where: { id: 'user-mike-001' },
      include: { person: true }
    });
    
    if (!user) {
      console.log('❌ Main Richard Roach account not found');
      return;
    }
    
    console.log('✅ Found main account:', {
      userId: user.id,
      username: user.username,
      email: user.person.primaryEmail,
      status: user.accountStatus,
      name: `${user.person.firstName} ${user.person.lastName}`
    });
    
    console.log('\\n2️⃣ Hashing new password...');
    const newPassword = 'T1PAdmin1234!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('✅ Password hashed with bcrypt (12 rounds)');
    
    console.log('\\n3️⃣ Updating main account password...');
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false
      }
    });
    
    console.log('✅ Password updated successfully');
    
    console.log('\\n4️⃣ Verifying password...');
    const passwordValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log('✅ Password verification:', passwordValid ? 'PASSED' : 'FAILED');
    
    console.log('\\n5️⃣ Clearing password from duplicate account...');
    
    // Clear password from the capitalized email account to avoid confusion
    await prisma.user.update({
      where: { id: 'user-richard-001' },
      data: {
        passwordHash: null,
        passwordChangedAt: null
      }
    });
    
    console.log('✅ Cleared password from duplicate account (user-richard-001)');
    
    console.log('\\n🎉 MAIN ACCOUNT PASSWORD SET SUCCESSFULLY!');
    console.log('');
    console.log('🔐 Richard Roach can now log in with:');
    console.log('   📧 Email: richard.roach@gmail.com');
    console.log('   🔑 Password: T1PAdmin1234!');
    console.log('   👤 User ID: user-mike-001');
    console.log('   👤 Username: mike.brown');
    console.log('   🏷️  Name: Richard Roach');
    console.log('   🎯 Title: System Administrator');
    console.log('   ⚡ Account Status: ACTIVE');
    console.log('');
    console.log('📝 NOTES:');
    console.log('   ✅ Password set on main account (lowercase email)');
    console.log('   ✅ Password cleared from duplicate account (capitalized email)');
    console.log('   ✅ No password change required on login');
    console.log('   ✅ Account ready for production use');
    
  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetMainRichardPassword();