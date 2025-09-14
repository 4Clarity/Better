const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateExistingTransitions() {
  console.log('Starting migration of existing transitions...');
  
  try {
    // Get all existing transitions
    const transitions = await prisma.transition.findMany({
      select: {
        id: true,
        contractId: true,
        contractName: true,
        contractNumber: true,
        transitionLevel: true,
        transitionSource: true,
        impactScope: true,
        approvalLevel: true,
      }
    });

    console.log(`Found ${transitions.length} transitions to migrate`);

    let migratedCount = 0;

    for (const transition of transitions) {
      // Skip if already migrated
      if (transition.transitionLevel && transition.transitionLevel !== 'OPERATIONAL') {
        console.log(`Transition ${transition.id} already migrated`);
        continue;
      }

      let updateData = {};

      // Determine transition level based on existing data
      if (transition.contractId) {
        // Has contractId - this is a Major transition
        updateData = {
          transitionLevel: 'MAJOR',
          transitionSource: 'CONTRACTUAL',
          impactScope: 'enterprise',
          approvalLevel: 'executive'
        };
      } else if (transition.contractName && transition.contractNumber) {
        // Has legacy contract fields - this is a Personnel transition
        updateData = {
          transitionLevel: 'PERSONNEL',
          transitionSource: 'PERSONNEL',
          impactScope: 'department',
          approvalLevel: 'management'
        };
      } else {
        // No contract info - this is an Operational change
        updateData = {
          transitionLevel: 'OPERATIONAL',
          transitionSource: 'ENHANCEMENT',
          impactScope: 'process',
          approvalLevel: 'operational'
        };
      }

      // Update the transition
      await prisma.transition.update({
        where: { id: transition.id },
        data: updateData
      });

      migratedCount++;
      console.log(`Migrated transition ${transition.id} to ${updateData.transitionLevel}`);
    }

    console.log(`Successfully migrated ${migratedCount} transitions`);

    // Print summary
    const summary = await prisma.transition.groupBy({
      by: ['transitionLevel'],
      _count: {
        transitionLevel: true
      }
    });

    console.log('\nMigration Summary:');
    summary.forEach(group => {
      console.log(`${group.transitionLevel}: ${group._count.transitionLevel} transitions`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingTransitions();