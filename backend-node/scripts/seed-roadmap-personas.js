#!/usr/bin/env node

/**
 * Seed script to create Roadmap Persona Users for Transition Management System
 * Creates three users representing key personas:
 * - Government Program Manager (Gary Grove)
 * - Outgoing Contractor (Henry Hou)
 * - Incoming Contractor (Ian Illum)
 *
 * Run with: node scripts/seed-roadmap-personas.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedRoadmapPersonas() {
  console.log('🎨 Starting Roadmap Persona seeding...');

  try {
    await prisma.$transaction(async (tx) => {
      // ========================================
      // 1. ENSURE ORGANIZATIONS EXIST
      // ========================================

      let dodOrg;
      try {
        dodOrg = await tx.organizations.findFirst({
          where: { name: 'Department of Justice' }
        });

        if (!dodOrg) {
          console.log('📋 Creating DOJ organization...');
          dodOrg = await tx.organizations.create({
            data: {
              id: randomUUID(),
              name: 'Department of Justice',
              abbreviation: 'DOJ',
              type: 'Government_Agency',
              contactEmail: 'contact@usdoj.gov',
              securityOfficerEmail: 'security@usdoj.gov',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ DOJ organization created');
        } else {
          console.log('✅ DOJ organization already exists');
        }
      } catch (error) {
        console.error('❌ Error creating DOJ organization:', error.message);
        throw error;
      }

      let outboundOrg;
      try {
        outboundOrg = await tx.organizations.findFirst({
          where: { name: 'Outbound Solutions Inc' }
        });

        if (!outboundOrg) {
          console.log('📋 Creating Outbound Solutions organization...');
          outboundOrg = await tx.organizations.create({
            data: {
              id: randomUUID(),
              name: 'Outbound Solutions Inc',
              abbreviation: 'OUTBOUND',
              type: 'Prime_Contractor',
              contactEmail: 'contact@outbound.com',
              securityOfficerEmail: 'security@outbound.com',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Outbound Solutions organization created');
        } else {
          console.log('✅ Outbound Solutions organization already exists');
        }
      } catch (error) {
        console.error('❌ Error creating Outbound organization:', error.message);
        throw error;
      }

      let inboundOrg;
      try {
        inboundOrg = await tx.organizations.findFirst({
          where: { name: 'Inbound Technologies LLC' }
        });

        if (!inboundOrg) {
          console.log('📋 Creating Inbound Technologies organization...');
          inboundOrg = await tx.organizations.create({
            data: {
              id: randomUUID(),
              name: 'Inbound Technologies LLC',
              abbreviation: 'INBOUND',
              type: 'Prime_Contractor',
              contactEmail: 'contact@inbound.com',
              securityOfficerEmail: 'security@inbound.com',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Inbound Technologies organization created');
        } else {
          console.log('✅ Inbound Technologies organization already exists');
        }
      } catch (error) {
        console.error('❌ Error creating Inbound organization:', error.message);
        throw error;
      }

      // ========================================
      // 2. ENSURE ROLES EXIST
      // ========================================

      console.log('🔐 Ensuring roles exist...');
      const rolesToEnsure = [
        {
          id: 'role-gov-pm',
          name: 'Government_Program_Manager',
          description: 'Government Program Manager with oversight access',
          permissions: JSON.stringify([
            'view_all_transitions',
            'create_transitions',
            'manage_transitions',
            'manage_stakeholders',
            'approve_artifacts',
            'generate_roadmaps',
            'manage_knowledge_curation'
          ])
        },
        {
          id: 'role-outgoing',
          name: 'Outgoing_Contractor',
          description: 'Departing contractor with knowledge transfer responsibilities',
          permissions: JSON.stringify([
            'view_assigned_transitions',
            'upload_artifacts',
            'document_knowledge',
            'create_knowledge_articles',
            'view_transition_tasks'
          ])
        },
        {
          id: 'role-incoming',
          name: 'Incoming_Contractor',
          description: 'Incoming contractor with learning and onboarding access',
          permissions: JSON.stringify([
            'view_assigned_transitions',
            'view_knowledge_base',
            'query_ai_assistant',
            'view_learning_roadmap',
            'complete_training_modules'
          ])
        },
        {
          id: 'role-user',
          name: 'User',
          description: 'Standard user with basic access' ,
          permissions: JSON.stringify(['view_profile', 'update_profile'])
        }
      ];

      for (const roleData of rolesToEnsure) {
        let role = await tx.roles.findFirst({ where: { name: roleData.name } });
        if (!role) {
          role = await tx.roles.create({
            data: {
              id: roleData.id,
              name: roleData.name,
              description: roleData.description,
              permissions: roleData.permissions,
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log(`✅ Created role: ${roleData.name}`);
        } else {
          console.log(`✅ Role already exists: ${roleData.name}`);
        }
      }

      // ========================================
      // 3. CREATE GOVERNMENT PM - GARY GROVE
      // ========================================

      console.log('\n👤 Creating Government PM: Gary Grove...');
      const garyPersonId = 'person-gary-grove-001';
      const garyUserId = 'user-gary-grove-001';

      let garyPerson;
      try {
        garyPerson = await tx.persons.findFirst({
          where: { primaryEmail: 'Garry.Grove@usdoj.gov' }
        });

        if (!garyPerson) {
          garyPerson = await tx.persons.create({
            data: {
              id: garyPersonId,
              firstName: 'Garry',
              lastName: 'Grove',
              primaryEmail: 'Garry.Grove@usdoj.gov',
              workPhone: '+1-202-555-0200',
              title: 'Government Program Manager',
              workLocation: 'Washington, DC',
              securityClearanceLevel: 'Secret',
              clearanceExpirationDate: new Date('2027-06-30'),
              skills: JSON.stringify(['Program Management', 'Contract Oversight', 'Knowledge Management', 'Transition Planning']),
              certifications: JSON.stringify(['PMP', 'ITIL', 'Federal Acquisition Certification']),
              professionalSummary: 'Experienced government program manager specializing in contract transitions and knowledge continuity.',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Person record created for Gary Grove');
        } else {
          console.log('✅ Person record already exists for Gary Grove');
        }
      } catch (error) {
        console.error('❌ Error creating Gary Grove person record:', error.message);
        throw error;
      }

      let garyUser;
      try {
        garyUser = await tx.user.findFirst({
          where: { username: 'Garry.Grove@usdoj.gov' }
        });

        if (!garyUser) {
          const hashedPassword = await bcrypt.hash('garygrove', 12);

          garyUser = await tx.user.create({
            data: {
              id: garyUserId,
              personId: garyPerson.id,
              username: 'Garry.Grove@usdoj.gov',
              keycloakId: `keycloak-gary-${randomUUID()}`,
              passwordHash: hashedPassword,
              accountStatus: 'Active',
              emailVerified: true,
              roles: JSON.stringify(['Government_Program_Manager', 'User']),
              updatedAt: new Date(),
            }
          });
          console.log('✅ User record created for Gary Grove');
          console.log(`   - Username: Garry.Grove@usdoj.gov`);
          console.log(`   - Password: garygrove`);
        } else {
          console.log('✅ User record already exists for Gary Grove');
        }
      } catch (error) {
        console.error('❌ Error creating Gary Grove user record:', error.message);
        throw error;
      }

      // Assign roles to Gary Grove
      const govPMRole = await tx.roles.findFirst({ where: { name: 'Government_Program_Manager' } });
      const userRole = await tx.roles.findFirst({ where: { name: 'User' } });

      if (govPMRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: garyUser.id, roleId: govPMRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: garyUser.id,
              roleId: govPMRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned Government_Program_Manager role to Gary Grove');
        }
      }

      if (userRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: garyUser.id, roleId: userRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: garyUser.id,
              roleId: userRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned User role to Gary Grove');
        }
      }

      // Create person-organization affiliation for Gary Grove
      const existingGaryAffiliation = await tx.person_organization_affiliations.findFirst({
        where: { personId: garyPerson.id, organizationId: dodOrg.id }
      });

      if (!existingGaryAffiliation) {
        await tx.person_organization_affiliations.create({
          data: {
            id: randomUUID(),
            personId: garyPerson.id,
            organizationId: dodOrg.id,
            jobTitle: 'Government Program Manager',
            department: 'Information Technology Services',
            employeeId: 'DOJ-GG-2024',
            workLocation: 'Washington, DC',
            affiliationType: 'Employee',
            employmentStatus: 'Active',
            securityClearanceRequired: 'Secret',
            startDate: new Date('2022-03-01'),
            isActive: true,
            isPrimary: true,
            accessLevel: 'Elevated',
            createdBy: garyUser.id,
            updatedAt: new Date(),
          }
        });
        console.log('✅ DOJ affiliation created for Gary Grove');
      }

      // ========================================
      // 4. CREATE OUTGOING CONTRACTOR - HENRY HOU
      // ========================================

      console.log('\n👤 Creating Outgoing Contractor: Henry Hou...');
      const henryPersonId = 'person-henry-hou-001';
      const henryUserId = 'user-henry-hou-001';

      let henryPerson;
      try {
        henryPerson = await tx.persons.findFirst({
          where: { primaryEmail: 'Henry.Hou@outbound.com' }
        });

        if (!henryPerson) {
          henryPerson = await tx.persons.create({
            data: {
              id: henryPersonId,
              firstName: 'Henry',
              lastName: 'Hou',
              primaryEmail: 'Henry.Hou@outbound.com',
              workPhone: '+1-703-555-0300',
              title: 'Senior Systems Engineer',
              workLocation: 'Arlington, VA',
              securityClearanceLevel: 'Secret',
              clearanceExpirationDate: new Date('2025-12-31'),
              skills: JSON.stringify(['System Architecture', 'Network Engineering', 'Documentation', 'Knowledge Transfer']),
              certifications: JSON.stringify(['CCNP', 'AWS Solutions Architect', 'CompTIA Security+']),
              professionalSummary: 'Senior systems engineer with deep expertise in government IT infrastructure and operational continuity.',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Person record created for Henry Hou');
        } else {
          console.log('✅ Person record already exists for Henry Hou');
        }
      } catch (error) {
        console.error('❌ Error creating Henry Hou person record:', error.message);
        throw error;
      }

      let henryUser;
      try {
        henryUser = await tx.user.findFirst({
          where: { username: 'Henry.Hou@outbound.com' }
        });

        if (!henryUser) {
          const hashedPassword = await bcrypt.hash('henryhou', 12);

          henryUser = await tx.user.create({
            data: {
              id: henryUserId,
              personId: henryPerson.id,
              username: 'Henry.Hou@outbound.com',
              keycloakId: `keycloak-henry-${randomUUID()}`,
              passwordHash: hashedPassword,
              accountStatus: 'Active',
              emailVerified: true,
              roles: JSON.stringify(['Outgoing_Contractor', 'User']),
              updatedAt: new Date(),
            }
          });
          console.log('✅ User record created for Henry Hou');
          console.log(`   - Username: Henry.Hou@outbound.com`);
          console.log(`   - Password: henryhou`);
        } else {
          console.log('✅ User record already exists for Henry Hou');
        }
      } catch (error) {
        console.error('❌ Error creating Henry Hou user record:', error.message);
        throw error;
      }

      // Assign roles to Henry Hou
      const outgoingRole = await tx.roles.findFirst({ where: { name: 'Outgoing_Contractor' } });

      if (outgoingRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: henryUser.id, roleId: outgoingRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: henryUser.id,
              roleId: outgoingRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned Outgoing_Contractor role to Henry Hou');
        }
      }

      if (userRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: henryUser.id, roleId: userRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: henryUser.id,
              roleId: userRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned User role to Henry Hou');
        }
      }

      // Create person-organization affiliation for Henry Hou
      const existingHenryAffiliation = await tx.person_organization_affiliations.findFirst({
        where: { personId: henryPerson.id, organizationId: outboundOrg.id }
      });

      if (!existingHenryAffiliation) {
        await tx.person_organization_affiliations.create({
          data: {
            id: randomUUID(),
            personId: henryPerson.id,
            organizationId: outboundOrg.id,
            jobTitle: 'Senior Systems Engineer',
            department: 'Technical Operations',
            employeeId: 'OUT-HH-2024',
            workLocation: 'Arlington, VA',
            affiliationType: 'Employee',
            employmentStatus: 'Active',
            securityClearanceRequired: 'Secret',
            startDate: new Date('2021-01-15'),
            endDate: new Date('2025-01-31'), // Contract ending soon
            isActive: true,
            isPrimary: true,
            accessLevel: 'Elevated',
            contractNumber: 'DOJ-IT-2021-045',
            createdBy: henryUser.id,
            updatedAt: new Date(),
          }
        });
        console.log('✅ Outbound Solutions affiliation created for Henry Hou');
      }

      // ========================================
      // 5. CREATE INCOMING CONTRACTOR - IAN ILLUM
      // ========================================

      console.log('\n👤 Creating Incoming Contractor: Ian Illum...');
      const ianPersonId = 'person-ian-illum-001';
      const ianUserId = 'user-ian-illum-001';

      let ianPerson;
      try {
        ianPerson = await tx.persons.findFirst({
          where: { primaryEmail: 'Ian.Illum@inbound.com' }
        });

        if (!ianPerson) {
          ianPerson = await tx.persons.create({
            data: {
              id: ianPersonId,
              firstName: 'Ian',
              lastName: 'Illum',
              primaryEmail: 'Ian.Illum@inbound.com',
              workPhone: '+1-571-555-0400',
              title: 'Systems Integration Specialist',
              workLocation: 'Reston, VA',
              securityClearanceLevel: 'Public_Trust',
              skills: JSON.stringify(['System Integration', 'Cloud Technologies', 'Agile Methodologies', 'Documentation']),
              certifications: JSON.stringify(['AWS Associate', 'Azure Fundamentals', 'Agile Certified Practitioner']),
              professionalSummary: 'Systems integration specialist eager to learn and contribute to government IT operations.',
              isActive: true,
              updatedAt: new Date(),
            }
          });
          console.log('✅ Person record created for Ian Illum');
        } else {
          console.log('✅ Person record already exists for Ian Illum');
        }
      } catch (error) {
        console.error('❌ Error creating Ian Illum person record:', error.message);
        throw error;
      }

      let ianUser;
      try {
        ianUser = await tx.user.findFirst({
          where: { username: 'Ian.Illum@inbound.com' }
        });

        if (!ianUser) {
          const hashedPassword = await bcrypt.hash('ianillum', 12);

          ianUser = await tx.user.create({
            data: {
              id: ianUserId,
              personId: ianPerson.id,
              username: 'Ian.Illum@inbound.com',
              keycloakId: `keycloak-ian-${randomUUID()}`,
              passwordHash: hashedPassword,
              accountStatus: 'Active',
              emailVerified: true,
              roles: JSON.stringify(['Incoming_Contractor', 'User']),
              updatedAt: new Date(),
            }
          });
          console.log('✅ User record created for Ian Illum');
          console.log(`   - Username: Ian.Illum@inbound.com`);
          console.log(`   - Password: ianillum`);
        } else {
          console.log('✅ User record already exists for Ian Illum');
        }
      } catch (error) {
        console.error('❌ Error creating Ian Illum user record:', error.message);
        throw error;
      }

      // Assign roles to Ian Illum
      const incomingRole = await tx.roles.findFirst({ where: { name: 'Incoming_Contractor' } });

      if (incomingRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: ianUser.id, roleId: incomingRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: ianUser.id,
              roleId: incomingRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned Incoming_Contractor role to Ian Illum');
        }
      }

      if (userRole) {
        const existingRole = await tx.user_roles.findFirst({
          where: { userId: ianUser.id, roleId: userRole.id }
        });
        if (!existingRole) {
          await tx.user_roles.create({
            data: {
              id: randomUUID(),
              userId: ianUser.id,
              roleId: userRole.id,
              assignedBy: garyUser.id,
              isActive: true,
            }
          });
          console.log('✅ Assigned User role to Ian Illum');
        }
      }

      // Create person-organization affiliation for Ian Illum
      const existingIanAffiliation = await tx.person_organization_affiliations.findFirst({
        where: { personId: ianPerson.id, organizationId: inboundOrg.id }
      });

      if (!existingIanAffiliation) {
        await tx.person_organization_affiliations.create({
          data: {
            id: randomUUID(),
            personId: ianPerson.id,
            organizationId: inboundOrg.id,
            jobTitle: 'Systems Integration Specialist',
            department: 'Professional Services',
            employeeId: 'IN-II-2024',
            workLocation: 'Reston, VA',
            affiliationType: 'Employee',
            employmentStatus: 'Active',
            securityClearanceRequired: 'Secret', // In process
            startDate: new Date('2024-11-01'),
            isActive: true,
            isPrimary: true,
            accessLevel: 'Standard',
            contractNumber: 'DOJ-IT-2024-089',
            createdBy: ianUser.id,
            updatedAt: new Date(),
          }
        });
        console.log('✅ Inbound Technologies affiliation created for Ian Illum');
      }

      console.log('\n🎉 Roadmap Persona seeding completed successfully!');
      console.log('\n📋 Created User Accounts:');
      console.log('\n1️⃣ Government Program Manager:');
      console.log('   - Name: Garry Grove');
      console.log('   - Username: Garry.Grove@usdoj.gov');
      console.log('   - Password: garygrove');
      console.log('   - Organization: Department of Justice');
      console.log('   - Role: Government_Program_Manager');

      console.log('\n2️⃣ Outgoing Contractor:');
      console.log('   - Name: Henry Hou');
      console.log('   - Username: Henry.Hou@outbound.com');
      console.log('   - Password: henryhou');
      console.log('   - Organization: Outbound Solutions Inc');
      console.log('   - Role: Outgoing_Contractor');

      console.log('\n3️⃣ Incoming Contractor:');
      console.log('   - Name: Ian Illum');
      console.log('   - Username: Ian.Illum@inbound.com');
      console.log('   - Password: ianillum');
      console.log('   - Organization: Inbound Technologies LLC');
      console.log('   - Role: Incoming_Contractor');

      console.log('\n✨ All users can now log into the Transition Management System!');
    });

  } catch (error) {
    console.error('❌ Error seeding roadmap personas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedRoadmapPersonas()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedRoadmapPersonas };
