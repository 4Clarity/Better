#!/usr/bin/env node

/**
 * Seed script to create Dan Demont demo user
 * Run with: node scripts/seed-demo-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedDemoUser() {
  console.log('🌱 Starting demo user seeding...');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create GSA organization
      let gsaOrg;
      try {
        gsaOrg = await tx.organizations.findFirst({
          where: { name: 'General Services Administration' }
        });

        if (!gsaOrg) {
          console.log('📋 Creating GSA organization...');
          gsaOrg = await tx.organizations.create({
            data: {
              id: randomUUID(),
              name: 'General Services Administration',
              abbreviation: 'GSA',
              type: 'Government_Agency',
              contactEmail: 'contact@gsa.gov',
              securityOfficerEmail: 'security@gsa.gov',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ GSA organization created');
        } else {
          console.log('✅ GSA organization already exists');
        }
      } catch (error) {
        console.error('❌ Error creating GSA organization:', error.message);
        throw error;
      }

      // 2. Create person record for Dan Demont
      const personId = 'dan-demont-person-id';
      let person;
      try {
        person = await tx.persons.findFirst({
          where: { primaryEmail: 'dan.demo@tip.gov' }
        });

        if (!person) {
          console.log('👤 Creating person record for Dan Demont...');
          person = await tx.persons.create({
            data: {
              id: personId,
              firstName: 'Dan',
              lastName: 'Demont',
              primaryEmail: 'dan.demo@tip.gov',
              workPhone: '+1-202-555-0123',
              title: 'Government Project Manager',
              workLocation: 'Washington, DC',
              securityClearanceLevel: 'Top_Secret',
              timeZone: 'America/New_York',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Person record created for Dan Demont');
        } else {
          console.log('✅ Person record already exists for Dan Demont');
        }
      } catch (error) {
        console.error('❌ Error creating person record:', error.message);
        throw error;
      }

      // 3. Create user record
      const userId = 'dan-demont-user-id';
      let user;
      try {
        user = await tx.user.findFirst({
          where: { email: 'dan.demo@tip.gov' }
        });

        if (!user) {
          console.log('👤 Creating user record for Dan Demont...');
          const hashedPassword = await bcrypt.hash('dandemo1234!', 12);

          user = await tx.user.create({
            data: {
              id: userId,
              email: 'dan.demo@tip.gov',
              firstName: 'Dan',
              lastName: 'Demont',
              role: 'program_manager',
              personId: person.id,
            }
          });
          console.log('✅ User record created for Dan Demont');
        } else {
          console.log('✅ User record already exists for Dan Demont');
        }
      } catch (error) {
        console.error('❌ Error creating user record:', error.message);
        throw error;
      }

      // 4. Ensure roles exist
      console.log('🔐 Setting up roles...');
      const rolesToEnsure = [
        { name: 'admin', description: 'System Administrator' },
        { name: 'program_manager', description: 'Government Program Manager' },
        { name: 'user', description: 'Standard User' },
        { name: 'security_officer', description: 'Security Officer' },
        { name: 'observer', description: 'Observer' }
      ];

      for (const roleData of rolesToEnsure) {
        let role = await tx.roles.findFirst({ where: { name: roleData.name } });
        if (!role) {
          role = await tx.roles.create({
            data: {
              id: randomUUID(),
              name: roleData.name,
              description: roleData.description,
              permissions: JSON.stringify([]),
              isActive: true,
            }
          });
          console.log(`✅ Created role: ${roleData.name}`);
        }
      }

      // 5. Assign roles to Dan Demont
      console.log('🎭 Assigning roles to Dan Demont...');
      const rolesToAssign = ['program_manager', 'user'];

      for (const roleName of rolesToAssign) {
        const role = await tx.roles.findFirst({ where: { name: roleName } });
        if (role) {
          const existingUserRole = await tx.user_roles.findFirst({
            where: { userId: user.id, roleId: role.id }
          });

          if (!existingUserRole) {
            await tx.user_roles.create({
              data: {
                id: randomUUID(),
                userId: user.id,
                roleId: role.id,
                assignedBy: user.id, // Self-assigned for demo
                isActive: true,
              }
            });
            console.log(`✅ Assigned role '${roleName}' to Dan Demont`);
          } else {
            console.log(`✅ Role '${roleName}' already assigned to Dan Demont`);
          }
        }
      }

      // 6. Create person-organization affiliation
      console.log('🏢 Creating GSA affiliation...');
      const existingAffiliation = await tx.person_organization_affiliations.findFirst({
        where: { personId: person.id, organizationId: gsaOrg.id }
      });

      if (!existingAffiliation) {
        await tx.person_organization_affiliations.create({
          data: {
            id: randomUUID(),
            personId: person.id,
            organizationId: gsaOrg.id,
            jobTitle: 'Government Project Manager',
            department: 'Technology Transformation Services',
            employeeId: 'GSA-DAN-2024',
            workLocation: 'Washington, DC',
            affiliationType: 'Employee',
            employmentStatus: 'Active',
            securityClearanceRequired: 'Top_Secret',
            startDate: new Date('2024-01-01'),
            isActive: true,
            isPrimary: true,
            accessLevel: 'Elevated',
            createdBy: user.id,
            updatedAt: new Date(),
          }
        });
        console.log('✅ GSA affiliation created for Dan Demont');
      } else {
        console.log('✅ GSA affiliation already exists for Dan Demont');
      }

      console.log('🎉 Demo user seeding completed successfully!');
      console.log('📋 User Details:');
      console.log(`   - Name: Dan Demont`);
      console.log(`   - Username: dan.demont`);
      console.log(`   - Email: dan.demo@tip.gov`);
      console.log(`   - Password: dandemo1234!`);
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Person ID: ${person.id}`);
      console.log(`   - Roles: ${rolesToAssign.join(', ')}`);
      console.log(`   - Organization: GSA`);
      console.log(`   - Security Clearance: Top Secret`);
    });

  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedDemoUser()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDemoUser };