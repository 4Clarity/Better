// Quick fix for Richard Roach's account
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRichardRoach() {
  console.log('🔧 Fixing Richard Roach account issues...\n');
  
  try {
    console.log('1️⃣ Finding current user with richard.roach@gmail.com...');
    
    const currentUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: 'richard.roach@gmail.com'
        }
      },
      include: { person: true }
    });
    
    if (!currentUser) {
      console.log('❌ No user found with richard.roach@gmail.com');
      return;
    }
    
    console.log('Found user:', {
      userId: currentUser.id,
      username: currentUser.username,
      status: currentUser.accountStatus,
      personName: `${currentUser.person.firstName} ${currentUser.person.lastName}`,
      email: currentUser.person.primaryEmail
    });
    
    console.log('\n2️⃣ Applying fixes...\n');
    
    // Fix 1: Update the person name to Richard Roach
    console.log('Updating person name to Richard Roach...');
    await prisma.person.update({
      where: { id: currentUser.personId },
      data: {
        firstName: 'Richard',
        lastName: 'Roach',
        title: 'System Administrator'
      }
    });
    console.log('✅ Person name updated');
    
    // Fix 2: Set account status to ACTIVE
    console.log('Setting account status to ACTIVE...');
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        accountStatus: 'ACTIVE'
      }
    });
    console.log('✅ Account status updated to ACTIVE');
    
    // Fix 3: Update username if needed
    if (currentUser.username !== 'richard.roach' && currentUser.username !== 'rroach') {
      console.log(`Updating username from ${currentUser.username} to richard.roach...`);
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          username: 'richard.roach'
        }
      });
      console.log('✅ Username updated');
    }
    
    console.log('\n3️⃣ Verifying fixes...');
    
    const updatedUser = await prisma.user.findFirst({
      where: {
        person: {
          primaryEmail: 'richard.roach@gmail.com'
        }
      },
      include: { person: true }
    });
    
    console.log('Updated user:', {
      userId: updatedUser.id,
      username: updatedUser.username,
      status: updatedUser.accountStatus,
      personName: `${updatedUser.person.firstName} ${updatedUser.person.lastName}`,
      title: updatedUser.person.title,
      email: updatedUser.person.primaryEmail
    });
    
    console.log('\n🎉 Richard Roach account fixed successfully!');
    console.log('✅ Account Status: ACTIVE');
    console.log('✅ Name: Richard Roach');
    console.log('✅ Title: System Administrator'); 
    console.log('✅ Email: richard.roach@gmail.com');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRichardRoach();