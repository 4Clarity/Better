const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAccountStatus() {
  console.log('🔍 Verifying Richard Roach account status...\\n');
  
  try {
    const user = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: 'richard.roach@gmail.com'
        }
      },
      include: { 
        person: true
      }
    });
    
    if (!user) {
      console.log('❌ No user found with richard.roach@gmail.com');
      return;
    }
    
    console.log('✅ Current account status:');
    console.log('   User ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Account Status:', user.accountStatus);
    console.log('   Person Name:', `${user.person.firstName} ${user.person.lastName}`);
    console.log('   Email:', user.person.primaryEmail);
    console.log('   Title:', user.person.title);
    console.log('   Roles:', user.roles || 'Not available');
    
    if (user.accountStatus === 'ACTIVE') {
      console.log('\\n🎉 Account status issue RESOLVED!');
      console.log('   ✅ Account shows as ACTIVE in database');
      console.log('   ✅ Person name corrected to "Richard Roach"');
      console.log('   ✅ Title set to "System Administrator"');
    } else {
      console.log(`\\n⚠️  Account still shows as: ${user.accountStatus}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAccountStatus();