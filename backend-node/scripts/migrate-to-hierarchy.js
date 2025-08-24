const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToHierarchy() {
  console.log('Starting migration to Business Operation hierarchy...');

  try {
    // Step 1: Create default Business Operation for existing transitions
    const defaultBusinessOp = await prisma.businessOperation.create({
      data: {
        name: 'Legacy Operations',
        businessFunction: 'General Operations',
        technicalDomain: 'Mixed Services',
        description: 'Container for existing transitions during migration',
        scope: 'All existing contract transitions',
        objectives: 'Maintain continuity during system migration',
        performanceMetrics: {
          operational: ['Transition completion rate'],
          quality: ['Stakeholder satisfaction'],
          compliance: ['Timeline adherence']
        },
        supportPeriodStart: new Date('2024-01-01'),
        supportPeriodEnd: new Date('2025-12-31'),
        currentContractEnd: new Date('2025-06-30'),
        governmentPMId: 'default-pm-id', // Will need actual user ID
        directorId: 'default-director-id', // Will need actual user ID
      }
    });

    console.log('Created default Business Operation:', defaultBusinessOp.id);

    // Step 2: Get existing transitions
    const existingTransitions = await prisma.transition.findMany({
      select: {
        id: true,
        contractName: true,
        contractNumber: true,
        startDate: true,
        endDate: true,
      }
    });

    console.log(`Found ${existingTransitions.length} existing transitions`);

    // Step 3: Create contracts for each unique contract
    const uniqueContracts = new Map();
    
    for (const transition of existingTransitions) {
      if (transition.contractName && transition.contractNumber) {
        const contractKey = `${transition.contractName}-${transition.contractNumber}`;
        
        if (!uniqueContracts.has(contractKey)) {
          uniqueContracts.set(contractKey, {
            contractName: transition.contractName,
            contractNumber: transition.contractNumber,
            startDate: transition.startDate,
            endDate: transition.endDate,
          });
        }
      }
    }

    console.log(`Creating ${uniqueContracts.size} unique contracts...`);

    const contractMap = new Map();

    for (const [contractKey, contractData] of uniqueContracts) {
      try {
        const contract = await prisma.contract.create({
          data: {
            businessOperationId: defaultBusinessOp.id,
            contractName: contractData.contractName,
            contractNumber: contractData.contractNumber,
            contractorName: 'TBD - Legacy Migration',
            startDate: contractData.startDate,
            endDate: contractData.endDate,
            status: 'ACTIVE',
          }
        });

        contractMap.set(contractKey, contract.id);
        console.log(`Created contract: ${contract.contractName} (${contract.contractNumber})`);
      } catch (error) {
        console.error(`Failed to create contract ${contractKey}:`, error.message);
      }
    }

    // Step 4: Update transitions with contract relationships
    let updatedCount = 0;

    for (const transition of existingTransitions) {
      if (transition.contractName && transition.contractNumber) {
        const contractKey = `${transition.contractName}-${transition.contractNumber}`;
        const contractId = contractMap.get(contractKey);

        if (contractId) {
          try {
            await prisma.transition.update({
              where: { id: transition.id },
              data: {
                contractId: contractId,
                name: `${transition.contractName} Transition`,
                description: 'Migrated from legacy system',
                duration: 'THIRTY_DAYS',
                requiresContinuousService: true,
              }
            });
            updatedCount++;
          } catch (error) {
            console.error(`Failed to update transition ${transition.id}:`, error.message);
          }
        }
      }
    }

    console.log(`Updated ${updatedCount} transitions with contract relationships`);

    // Step 5: Create default users if they don't exist
    await createDefaultUsers();

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createDefaultUsers() {
  try {
    // Check if users already exist
    const existingUsers = await prisma.user.findMany({
      select: { id: true, email: true }
    });

    if (existingUsers.length === 0) {
      console.log('Creating default users...');

      const defaultPM = await prisma.user.create({
        data: {
          email: 'pm@example.com',
          firstName: 'Program',
          lastName: 'Manager',
          role: 'program_manager',
        }
      });

      const defaultDirector = await prisma.user.create({
        data: {
          email: 'director@example.com',
          firstName: 'Operations',
          lastName: 'Director',
          role: 'director',
        }
      });

      // Update the default business operation with real user IDs
      await prisma.businessOperation.updateMany({
        where: {
          name: 'Legacy Operations'
        },
        data: {
          governmentPMId: defaultPM.id,
          directorId: defaultDirector.id,
        }
      });

      console.log('Created default users and updated business operation');
    } else {
      console.log('Users already exist, skipping user creation');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

// Run the migration
if (require.main === module) {
  migrateToHierarchy()
    .catch(console.error)
    .finally(() => process.exit(0));
}

module.exports = { migrateToHierarchy };