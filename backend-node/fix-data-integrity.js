// Fix data integrity issue for Richard Roach
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDataIntegrity() {
  console.log('🔧 Fixing data integrity issue for Richard Roach...\n');
  
  try {
    // First, let's find all users and persons to understand the data structure
    console.log('🔍 Analyzing current data...\n');
    
    // Find the person with richard.roach@gmail.com
    const personWithEmail = await prisma.person.findFirst({
      where: { primaryEmail: 'richard.roach@gmail.com' }
    });
    
    console.log('👤 Person with richard.roach@gmail.com email:');
    if (personWithEmail) {
      console.log('   ID:', personWithEmail.id);
      console.log('   Name:', personWithEmail.firstName, personWithEmail.lastName);
      console.log('   Display Name:', personWithEmail.displayName);
      console.log('   Email:', personWithEmail.primaryEmail);
    } else {
      console.log('   ❌ No person found with this email');
    }
    
    // Find all persons named Richard Roach
    const richardPersons = await prisma.person.findMany({
      where: {
        OR: [
          { firstName: 'Richard', lastName: 'Roach' },
          { displayName: { contains: 'Richard Roach' } },
          { firstName: { contains: 'Richard' } }
        ]
      }
    });
    
    console.log('\n👥 All Richard/Roach related persons:');
    richardPersons.forEach(person => {
      console.log(`   - ID: ${person.id}`);
      console.log(`     Name: ${person.firstName} ${person.lastName}`);
      console.log(`     Display: ${person.displayName}`);
      console.log(`     Email: ${person.primaryEmail}`);
      console.log('');
    });
    
    // Find the user currently using richard.roach@gmail.com
    const currentUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: 'richard.roach@gmail.com'
        }
      },
      include: { person: true }
    });
    
    console.log('🔗 User currently linked to richard.roach@gmail.com:');
    if (currentUser) {
      console.log('   User ID:', currentUser.id);
      console.log('   Username:', currentUser.username);
      console.log('   Account Status:', currentUser.accountStatus);
      console.log('   Person ID:', currentUser.personId);
      console.log('   Person Name:', currentUser.person?.firstName, currentUser.person?.lastName);
    }
    
    // Look for any System Administrator users
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'admin' } },
          { username: { contains: 'roach' } },
          { username: { contains: 'richard' } }
        ]
      },
      include: { person: true }
    });
    
    console.log('\n👨‍💼 Admin/Richard related users:');
    adminUsers.forEach(user => {
      console.log(`   - User ID: ${user.id}`);
      console.log(`     Username: ${user.username}`);
      console.log(`     Status: ${user.accountStatus}`);
      console.log(`     Person: ${user.person?.firstName} ${user.person?.lastName}`);
      console.log(`     Email: ${user.person?.primaryEmail}`);
      console.log('');
    });
    
    // Now let's propose a fix
    console.log('🔧 PROPOSED SOLUTION:\n');
    
    // Option 1: If there's a correct Richard Roach person record
    const correctRichardPerson = richardPersons.find(p => 
      p.firstName === 'Richard' && p.lastName === 'Roach' && p.primaryEmail !== 'richard.roach@gmail.com'
    );
    
    if (correctRichardPerson && currentUser) {
      console.log('OPTION 1: Update person record email');
      console.log(`   - Change person ${correctRichardPerson.id} email to richard.roach@gmail.com`);
      console.log(`   - Change person ${currentUser.personId} email to something else`);
      console.log(`   - Link user ${currentUser.id} to correct person ${correctRichardPerson.id}`);
      console.log(`   - Set user account status to ACTIVE`);
    } else {
      console.log('OPTION 2: Fix current user record');
      console.log(`   - Update person ${currentUser?.personId} name to Richard Roach`);
      console.log(`   - Set user ${currentUser?.id} account status to ACTIVE`);
      console.log(`   - Update display name to "Richard Roach, System Administrator"`);
    }
    
    console.log('\n⚠️  Manual intervention required. Review the data above and choose the appropriate fix.');
    console.log('🚨 Do not run automatic fixes without understanding the data implications!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDataIntegrity();