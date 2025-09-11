const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findAllRichardAccounts() {
  console.log('🔍 Finding all Richard Roach accounts...\\n');
  
  try {
    // Find all users with richard.roach email (case variations)
    const users = await prisma.user.findMany({
      where: {
        person: {
          OR: [
            { primaryEmail: { contains: 'richard.roach', mode: 'insensitive' } },
            { firstName: { contains: 'Richard', mode: 'insensitive' } }
          ]
        }
      },
      include: { person: true }
    });
    
    console.log(`Found ${users.length} account(s) related to Richard Roach:\\n`);
    
    users.forEach((user, index) => {
      console.log(`Account ${index + 1}:`);
      console.log('   User ID:', user.id);
      console.log('   Username:', user.username);
      console.log('   Account Status:', user.accountStatus);
      console.log('   Person Name:', `${user.person.firstName} ${user.person.lastName}`);
      console.log('   Email:', user.person.primaryEmail);
      console.log('   Title:', user.person.title);
      console.log('   Has Password Hash:', !!user.passwordHash);
      console.log('   Must Change Password:', user.mustChangePassword);
      console.log('   Password Changed At:', user.passwordChangedAt);
      console.log('   Created At:', user.createdAt);
      console.log('');
    });
    
    // Determine which one should be the main account
    console.log('🎯 ANALYSIS:');
    const activeAccounts = users.filter(u => u.accountStatus === 'ACTIVE');
    const accountsWithPassword = users.filter(u => u.passwordHash);
    const correctEmailAccounts = users.filter(u => 
      u.person.primaryEmail.toLowerCase() === 'richard.roach@gmail.com'
    );
    
    console.log(`   - Active accounts: ${activeAccounts.length}`);
    console.log(`   - Accounts with password: ${accountsWithPassword.length}`);
    console.log(`   - Accounts with correct email: ${correctEmailAccounts.length}`);
    
    // Determine which account to use for login
    if (correctEmailAccounts.length === 1) {
      const mainAccount = correctEmailAccounts[0];
      console.log('\\n📌 MAIN ACCOUNT FOR LOGIN:');
      console.log('   User ID:', mainAccount.id);
      console.log('   Username:', mainAccount.username);
      console.log('   Email:', mainAccount.person.primaryEmail);
      console.log('   Status:', mainAccount.accountStatus);
      console.log('   Has Password:', !!mainAccount.passwordHash);
      
      if (!mainAccount.passwordHash) {
        console.log('\\n⚠️  WARNING: Main account does not have a password set!');
        console.log('   Need to set password for this account.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAllRichardAccounts();