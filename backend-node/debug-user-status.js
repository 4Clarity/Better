// Debug script to check user status in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUserStatus() {
  console.log('🔍 Debugging user status for richard.roach@gmail.com...\n');
  
  try {
    // Query the user exactly like the auth service does
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
      console.log('❌ User not found in database');
      return;
    }

    console.log('👤 User found:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Account Status:', user.accountStatus);
    console.log('   Created:', user.createdAt);
    console.log('   Last Login:', user.lastLoginAt);
    console.log('   Keycloak ID:', user.keycloakId);
    
    console.log('\n👨 Person details:');
    if (user.person) {
      console.log('   Name:', user.person.firstName, user.person.lastName);
      console.log('   Email:', user.person.primaryEmail);
      console.log('   Display Name:', user.person.displayName);
    }

    console.log('\n🔐 Roles: (checking separately)');
    
    // Query roles separately if needed
    try {
      // This might not work depending on the schema structure
      const userWithRoles = await prisma.user.findFirst({
        where: { id: user.id },
        // We'll skip roles for now since the schema structure is unclear
      });
      console.log('   Roles query skipped - schema structure unclear');
    } catch (e) {
      console.log('   Could not fetch roles:', e.message);
    }

    console.log('\n🧪 Testing auth service behavior...');
    
    // Test what the auth service would do
    if (user.accountStatus !== 'ACTIVE') {
      console.log(`❌ AUTH SERVICE WOULD REJECT: Account is ${user.accountStatus.toLowerCase()}`);
    } else {
      console.log('✅ AUTH SERVICE WOULD ACCEPT: Account is active');
    }

    // Check for any inconsistencies
    console.log('\n🔍 Consistency check:');
    console.log('   Account Status field type:', typeof user.accountStatus);
    console.log('   Account Status value:', JSON.stringify(user.accountStatus));
    console.log('   Is exactly ACTIVE?', user.accountStatus === 'ACTIVE');
    console.log('   Loose equality check:', user.accountStatus == 'ACTIVE');

    // List all possible account statuses
    console.log('\n📋 Database schema check (AccountStatus enum values):');
    const allUsers = await prisma.user.findMany({
      select: { accountStatus: true },
      distinct: ['accountStatus']
    });
    
    const uniqueStatuses = [...new Set(allUsers.map(u => u.accountStatus))];
    console.log('   Found statuses in DB:', uniqueStatuses);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserStatus();