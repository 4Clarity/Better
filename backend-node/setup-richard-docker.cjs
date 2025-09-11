const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://user:password@localhost:5433/tip?schema=public'
    }
  }
});

async function setupRichardInDocker() {
  console.log('🔧 Setting up Richard Roach account in Docker database...\\n');
  
  try {
    console.log('1️⃣ Checking if Richard Roach person exists...');
    
    let person = await prisma.person.findFirst({
      where: {
        OR: [
          { primaryEmail: 'richard.roach@gmail.com' },
          { firstName: 'Richard', lastName: 'Roach' }
        ]
      }
    });
    
    if (!person) {
      console.log('Creating Richard Roach person record...');
      person = await prisma.person.create({
        data: {
          firstName: 'Richard',
          lastName: 'Roach',
          primaryEmail: 'richard.roach@gmail.com',
          title: 'System Administrator'
        }
      });
      console.log('✅ Person created:', person.id);
    } else {
      console.log('✅ Person exists:', person.id);
      // Update to ensure correct data
      person = await prisma.person.update({
        where: { id: person.id },
        data: {
          firstName: 'Richard',
          lastName: 'Roach',
          primaryEmail: 'richard.roach@gmail.com',
          title: 'System Administrator'
        }
      });
      console.log('✅ Person updated');
    }
    
    console.log('\\n2️⃣ Checking if user exists...');
    
    let user = await prisma.user.findFirst({
      where: { personId: person.id }
    });
    
    if (!user) {
      console.log('Creating Richard Roach user record...');
      user = await prisma.user.create({
        data: {
          username: 'richard.roach',
          personId: person.id,
          keycloakId: 'richard-roach-keycloak-id',
          accountStatus: 'ACTIVE',
          emailVerified: true,
          roles: ['ADMIN', 'Observer']
        }
      });
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ User exists:', user.id);
      // Update to ensure correct status
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          accountStatus: 'ACTIVE',
          emailVerified: true
        }
      });
      console.log('✅ User updated');
    }
    
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
    
    console.log('\\n4️⃣ Verifying setup...');
    
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { person: true }
    });
    
    const passwordValid = await bcrypt.compare(password, finalUser.passwordHash);
    
    console.log('✅ Final verification:');
    console.log('   User ID:', finalUser.id);
    console.log('   Username:', finalUser.username);
    console.log('   Email:', finalUser.person.primaryEmail);
    console.log('   Name:', finalUser.person.firstName, finalUser.person.lastName);
    console.log('   Status:', finalUser.accountStatus);
    console.log('   Password Valid:', passwordValid ? 'YES' : 'NO');
    console.log('   Has Password Hash:', !!finalUser.passwordHash);
    
    console.log('\\n🎉 Richard Roach account setup completed in Docker database!');
    console.log('');
    console.log('Login credentials for Docker environment:');
    console.log('Email: richard.roach@gmail.com');
    console.log('Password: T1PAdmin1234!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupRichardInDocker();