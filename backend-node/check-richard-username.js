const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRichardUsername() {
  console.log('🔍 Checking who has the "richard.roach" username...\n');
  
  try {
    const userWithRichardUsername = await prisma.user.findUnique({
      where: { username: 'richard.roach' },
      include: { person: true }
    });
    
    if (userWithRichardUsername) {
      console.log('👤 User with "richard.roach" username:');
      console.log('   ID:', userWithRichardUsername.id);
      console.log('   Username:', userWithRichardUsername.username);
      console.log('   Account Status:', userWithRichardUsername.accountStatus);
      console.log('   Person Name:', userWithRichardUsername.person?.firstName, userWithRichardUsername.person?.lastName);
      console.log('   Email:', userWithRichardUsername.person?.primaryEmail);
    } else {
      console.log('❌ No user found with username "richard.roach"');
    }
    
    // Check for similar usernames
    const similarUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'richard' } },
          { username: { contains: 'roach' } }
        ]
      },
      include: { person: true }
    });
    
    console.log('\n🔍 Similar usernames:');
    similarUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.person?.firstName} ${user.person?.lastName}) - ${user.accountStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRichardUsername();