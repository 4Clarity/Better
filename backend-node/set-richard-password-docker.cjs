const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://user:password@localhost:5433/tip?schema=public'
    }
  }
});

async function setRichardPasswordDocker() {
  console.log('🔐 Setting Richard Roach password in Docker database...\\n');
  
  try {
    console.log('1️⃣ Finding Richard Roach user...');
    
    const user = await prisma.user.findFirst({
      where: {
        person: {
          OR: [
            { primaryEmail: 'richard.roach@gmail.com' },
            { firstName: 'Richard', lastName: 'Roach' }
          ]
        }
      },
      include: { person: true }
    });
    
    if (!user) {
      console.log('❌ Richard Roach user not found in Docker database');
      console.log('   The user might not exist in the Docker environment');
      console.log('   This is expected if the Docker database was reset');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user.id,
      username: user.username,
      email: user.person.primaryEmail,
      status: user.accountStatus
    });
    
    console.log('\\n2️⃣ Updating user data...');
    
    // Ensure user is active and has correct data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: 'ACTIVE',
        emailVerified: true
      }
    });
    
    // Ensure person data is correct  
    await prisma.person.update({
      where: { id: user.personId },
      data: {
        firstName: 'Richard',
        lastName: 'Roach',
        title: 'System Administrator'
      }
    });
    
    console.log('✅ User data updated');
    
    console.log('\\n3️⃣ Setting password...');
    
    const password = 'T1PAdmin1234!';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false
      }
    });
    
    console.log('✅ Password set successfully');
    
    console.log('\\n4️⃣ Verifying password...');
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { person: true }
    });
    
    const passwordValid = await bcrypt.compare(password, updatedUser.passwordHash);
    
    console.log('✅ Verification complete:');
    console.log('   Password Valid:', passwordValid ? 'YES' : 'NO');
    console.log('   Account Status:', updatedUser.accountStatus);
    console.log('   Email:', updatedUser.person.primaryEmail);
    console.log('   Name:', updatedUser.person.firstName, updatedUser.person.lastName);
    
    if (passwordValid && updatedUser.accountStatus === 'ACTIVE') {
      console.log('\\n🎉 SUCCESS! Richard Roach can now login to Docker environment');
      console.log('');
      console.log('Docker Login Credentials:');
      console.log('Email: richard.roach@gmail.com');
      console.log('Password: T1PAdmin1234!');
    }
    
  } catch (error) {
    console.error('❌ Failed to set password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setRichardPasswordDocker();