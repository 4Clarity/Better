import { PrismaClient, TransitionStatus, MilestoneStatus, PriorityLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create Users
    const users = await seedUsers();
    
    // Create Transitions
    const transitions = await seedTransitions(users);
    
    // Create Milestones
    await seedMilestones(transitions, users);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

async function seedSystemSettings() {
  console.log('📝 Seeding system settings...');
  
  const settings = [
    {
      key: 'platform.name',
      value: 'Transition Intelligence Platform',
      description: 'Platform display name',
      category: 'General',
      isPublic: true,
    },
    {
      key: 'platform.version',
      value: '1.0.0',
      description: 'Current platform version',
      category: 'General',
      isPublic: true,
    },
    {
      key: 'features.vectorSearch',
      value: true,
      description: 'Enable vector-based semantic search',
      category: 'Features',
      isPublic: false,
    },
    {
      key: 'features.aiAssistant',
      value: true,
      description: 'Enable AI-powered question answering',
      category: 'Features',
      isPublic: false,
    },
    {
      key: 'security.clearanceLevels',
      value: ['None', 'Public Trust', 'Confidential', 'Secret', 'Top Secret', 'TS/SCI'],
      description: 'Available security clearance levels',
      category: 'Security',
      isPublic: false,
    },
    {
      key: 'notifications.defaultChannels',
      value: ['email', 'inApp'],
      description: 'Default notification channels for new users',
      category: 'Notifications',
      isPublic: false,
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }
}

async function seedOrganizations() {
  console.log('🏢 Seeding organizations...');
  
  // Government Agencies
  const dod = await prisma.organization.upsert({
    where: { id: 'org-dod-001' },
    update: {},
    create: {
      id: 'org-dod-001',
      name: 'Department of Defense',
      abbreviation: 'DOD',
      type: 'GOVERNMENT_AGENCY',
      contactEmail: 'contact@dod.gov',
      securityOfficerEmail: 'security@dod.gov',
    },
  });

  const gsa = await prisma.organization.upsert({
    where: { id: 'org-gsa-001' },
    update: {},
    create: {
      id: 'org-gsa-001',
      name: 'General Services Administration',
      abbreviation: 'GSA',
      type: 'GOVERNMENT_AGENCY',
      contactEmail: 'contact@gsa.gov',
      securityOfficerEmail: 'security@gsa.gov',
    },
  });

  // Prime Contractors
  const acmeCorp = await prisma.organization.upsert({
    where: { id: 'org-acme-001' },
    update: {},
    create: {
      id: 'org-acme-001',
      name: 'ACME Technology Solutions',
      abbreviation: 'ACME',
      type: 'PRIME_CONTRACTOR',
      contactEmail: 'contact@acmetech.com',
      securityOfficerEmail: 'security@acmetech.com',
    },
  });

  const techCorp = await prisma.organization.upsert({
    where: { id: 'org-tech-001' },
    update: {},
    create: {
      id: 'org-tech-001',
      name: 'TechCorp Systems',
      abbreviation: 'TECH',
      type: 'PRIME_CONTRACTOR',
      contactEmail: 'contact@techcorp.com',
      securityOfficerEmail: 'security@techcorp.com',
    },
  });

  return { dod, gsa, acmeCorp, techCorp };
}

async function seedPersonsAndUsers() {
  console.log('👥 Seeding persons and users...');
  
  // Sample Persons
  const johnDoe = await prisma.person.upsert({
    where: { id: 'person-john-001' },
    update: {},
    create: {
      id: 'person-john-001',
      firstName: 'John',
      lastName: 'Doe',
      primaryEmail: 'john.doe@dod.gov',
      workPhone: '+1-555-0101',
      title: 'Program Manager',
      securityClearanceLevel: 'SECRET',
      skills: ['Project Management', 'Government Contracting', 'Security Compliance'],
      workLocation: 'Washington, DC',
    },
  });

  const janeSmith = await prisma.person.upsert({
    where: { id: 'person-jane-001' },
    update: {},
    create: {
      id: 'person-jane-001',
      firstName: 'Jane',
      lastName: 'Smith',
      primaryEmail: 'jane.smith@acmetech.com',
      workPhone: '+1-555-0102',
      title: 'Senior Software Engineer',
      securityClearanceLevel: 'CONFIDENTIAL',
      skills: ['Full Stack Development', 'DevOps', 'Cloud Architecture'],
      workLocation: 'Arlington, VA',
    },
  });

  const bobJohnson = await prisma.person.upsert({
    where: { id: 'person-bob-001' },
    update: {},
    create: {
      id: 'person-bob-001',
      firstName: 'Bob',
      lastName: 'Johnson',
      primaryEmail: 'bob.johnson@techcorp.com',
      workPhone: '+1-555-0103',
      title: 'Technical Lead',
      securityClearanceLevel: 'SECRET',
      skills: ['System Architecture', 'Database Design', 'Team Leadership'],
      workLocation: 'Reston, VA',
    },
  });

  const aliceWilson = await prisma.person.upsert({
    where: { id: 'person-alice-001' },
    update: {},
    create: {
      id: 'person-alice-001',
      firstName: 'Alice',
      lastName: 'Wilson',
      primaryEmail: 'alice.wilson@gsa.gov',
      workPhone: '+1-555-0104',
      title: 'Security Officer',
      securityClearanceLevel: 'TOP_SECRET',
      skills: ['Security Analysis', 'Compliance', 'Risk Management'],
      workLocation: 'Washington, DC',
    },
  });

  // Sample Users
  const johnUser = await prisma.user.upsert({
    where: { id: 'user-john-001' },
    update: {},
    create: {
      id: 'user-john-001',
      personId: 'person-john-001',
      username: 'john.doe',
      keycloakId: 'kc-john-001',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['PROGRAM_MANAGER'],
    },
  });

  const janeUser = await prisma.user.upsert({
    where: { id: 'user-jane-001' },
    update: {},
    create: {
      id: 'user-jane-001',
      personId: 'person-jane-001',
      username: 'jane.smith',
      keycloakId: 'kc-jane-001',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['CONTRACTOR'],
    },
  });

  const bobUser = await prisma.user.upsert({
    where: { id: 'user-bob-001' },
    update: {},
    create: {
      id: 'user-bob-001',
      personId: 'person-bob-001',
      username: 'bob.johnson',
      keycloakId: 'kc-bob-001',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['CONTRACTOR'],
    },
  });

  const aliceUser = await prisma.user.upsert({
    where: { id: 'user-alice-001' },
    update: {},
    create: {
      id: 'user-alice-001',
      personId: 'person-alice-001',
      username: 'alice.wilson',
      keycloakId: 'kc-alice-001',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['SECURITY_OFFICER'],
    },
  });

  return {
    persons: { johnDoe, janeSmith, bobJohnson, aliceWilson },
    users: { johnUser, janeUser, bobUser, aliceUser },
  };
}

async function seedPersonOrganizationAffiliations(persons: any, organizations: any, users: any) {
  console.log('🔗 Seeding person organization affiliations...');
  
  const affiliations = [
    {
      id: 'affil-001',
      personId: persons.johnDoe.id,
      organizationId: organizations.dod.id,
      jobTitle: 'Senior Program Manager',
      department: 'Information Technology',
      affiliationType: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      startDate: new Date('2020-01-15'),
      isPrimary: true,
      createdBy: users.johnUser.id,
    },
    {
      id: 'affil-002',
      personId: persons.janeSmith.id,
      organizationId: organizations.acmeCorp.id,
      jobTitle: 'Senior Software Engineer',
      department: 'Engineering',
      affiliationType: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      startDate: new Date('2021-03-01'),
      isPrimary: true,
      createdBy: users.janeUser.id,
    },
    {
      id: 'affil-003',
      personId: persons.bobJohnson.id,
      organizationId: organizations.techCorp.id,
      jobTitle: 'Technical Lead',
      department: 'Solutions Architecture',
      affiliationType: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      startDate: new Date('2019-08-01'),
      isPrimary: true,
      createdBy: users.bobUser.id,
    },
    {
      id: 'affil-004',
      personId: persons.aliceWilson.id,
      organizationId: organizations.gsa.id,
      jobTitle: 'Senior Security Officer',
      department: 'Cybersecurity',
      affiliationType: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      startDate: new Date('2018-05-01'),
      isPrimary: true,
      createdBy: users.aliceUser.id,
    },
  ];

  for (const affiliation of affiliations) {
    await prisma.personOrganizationAffiliation.upsert({
      where: { id: affiliation.id },
      update: affiliation,
      create: affiliation,
    });
  }
}

async function seedTransitions(organizations: any, users: any) {
  console.log('🔄 Seeding transitions...');
  
  const transition1 = await prisma.transition.upsert({
    where: { id: 'trans-001' },
    update: {},
    create: {
      id: 'trans-001',
      name: 'Enterprise Data Platform Migration',
      contractName: 'DOD Enterprise Data Platform',
      contractNumber: 'DOD-IT-2024-001',
      organizationId: organizations.dod.id,
      status: 'ACTIVE',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-12-31'),
      description: 'Migration of legacy data systems to modern cloud-based platform',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      budget: 2500000.00,
      trainingRequired: true,
      certificationRequired: true,
      clearanceRequired: 'SECRET',
      createdBy: users.johnUser.id,
    },
  });

  const transition2 = await prisma.transition.upsert({
    where: { id: 'trans-002' },
    update: {},
    create: {
      id: 'trans-002',
      name: 'Identity Management System Upgrade',
      contractName: 'GSA Identity Management Modernization',
      contractNumber: 'GSA-SEC-2024-002',
      organizationId: organizations.gsa.id,
      status: 'PLANNING',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-03-31'),
      description: 'Upgrade of legacy identity management systems',
      priority: 'CRITICAL',
      riskLevel: 'HIGH',
      budget: 1800000.00,
      trainingRequired: true,
      certificationRequired: true,
      clearanceRequired: 'CONFIDENTIAL',
      createdBy: users.aliceUser.id,
    },
  });

  return { transition1, transition2 };
}

async function seedTransitionUsers(transitions: any, users: any) {
  console.log('👤 Seeding transition users...');
  
  const transitionUsers = [
    {
      id: 'tu-001',
      transitionId: transitions.transition1.id,
      userId: users.johnUser.id,
      role: 'PROGRAM_MANAGER',
      securityStatus: 'CLEARED',
      platformAccess: 'FULL_ACCESS',
      invitedBy: users.johnUser.id,
    },
    {
      id: 'tu-002',
      transitionId: transitions.transition1.id,
      userId: users.janeUser.id,
      role: 'DEPARTING_CONTRACTOR',
      securityStatus: 'CLEARED',
      platformAccess: 'STANDARD',
      invitedBy: users.johnUser.id,
    },
    {
      id: 'tu-003',
      transitionId: transitions.transition1.id,
      userId: users.bobUser.id,
      role: 'INCOMING_CONTRACTOR',
      securityStatus: 'IN_PROCESS',
      platformAccess: 'READ_only',
      invitedBy: users.johnUser.id,
    },
    {
      id: 'tu-004',
      transitionId: transitions.transition2.id,
      userId: users.aliceUser.id,
      role: 'SECURITY_OFFICER',
      securityStatus: 'CLEARED',
      platformAccess: 'FULL_ACCESS',
      invitedBy: users.aliceUser.id,
    },
  ];

  for (const tu of transitionUsers) {
    await prisma.transitionUser.upsert({
      where: { id: tu.id },
      update: tu,
      create: tu,
    });
  }
}

async function seedMilestones(transitions: any, users: any) {
  console.log('🎯 Seeding milestones...');
  
  const milestone1 = await prisma.milestone.upsert({
    where: { id: 'mile-001' },
    update: {},
    create: {
      id: 'mile-001',
      transitionId: transitions.transition1.id,
      title: 'System Analysis Complete',
      description: 'Complete analysis of current system architecture and data flows',
      dueDate: new Date('2024-08-15'),
      status: 'COMPLETED',
      priority: 'HIGH',
      assignedTo: users.janeUser.id,
      percentComplete: 100,
      createdBy: users.johnUser.id,
    },
  });

  const milestone2 = await prisma.milestone.upsert({
    where: { id: 'mile-002' },
    update: {},
    create: {
      id: 'mile-002',
      transitionId: transitions.transition1.id,
      title: 'Knowledge Transfer Sessions',
      description: 'Conduct comprehensive knowledge transfer sessions with incoming team',
      dueDate: new Date('2024-10-30'),
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      assignedTo: users.bobUser.id,
      percentComplete: 45,
      createdBy: users.johnUser.id,
    },
  });

  const milestone3 = await prisma.milestone.upsert({
    where: { id: 'mile-003' },
    update: {},
    create: {
      id: 'mile-003',
      transitionId: transitions.transition1.id,
      title: 'Security Clearance Processing',
      description: 'Complete security clearance processing for incoming team members',
      dueDate: new Date('2024-11-15'),
      status: 'NOT_STARTED',
      priority: 'HIGH',
      assignedTo: users.aliceUser.id,
      percentComplete: 0,
      createdBy: users.johnUser.id,
    },
  });

  return { milestone1, milestone2, milestone3 };
}

async function seedTasks(transitions: any, milestones: any, users: any) {
  console.log('📋 Seeding tasks...');
  
  const tasks = [
    {
      id: 'task-001',
      transitionId: transitions.transition1.id,
      milestoneId: milestones.milestone1.id,
      title: 'Document Current Database Schema',
      description: 'Create comprehensive documentation of existing database structure',
      status: 'COMPLETED',
      priority: 'HIGH',
      assignedTo: users.janeUser.id,
      assignedBy: users.johnUser.id,
      dueDate: new Date('2024-08-10'),
      completedDate: new Date('2024-08-08'),
      estimatedHours: 16.0,
      actualHours: 14.5,
      percentComplete: 100,
      createdBy: users.johnUser.id,
    },
    {
      id: 'task-002',
      transitionId: transitions.transition1.id,
      milestoneId: milestones.milestone2.id,
      title: 'Prepare Training Materials',
      description: 'Develop comprehensive training materials for new team members',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: users.bobUser.id,
      assignedBy: users.johnUser.id,
      dueDate: new Date('2024-10-15'),
      estimatedHours: 32.0,
      actualHours: 18.0,
      percentComplete: 60,
      createdBy: users.johnUser.id,
    },
    {
      id: 'task-003',
      transitionId: transitions.transition1.id,
      milestoneId: milestones.milestone2.id,
      title: 'Conduct System Architecture Review',
      description: 'Review system architecture with incoming technical lead',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      assignedTo: users.bobUser.id,
      assignedBy: users.johnUser.id,
      dueDate: new Date('2024-10-20'),
      estimatedHours: 8.0,
      percentComplete: 0,
      createdBy: users.johnUser.id,
    },
    {
      id: 'task-004',
      transitionId: transitions.transition1.id,
      milestoneId: milestones.milestone3.id,
      title: 'Submit Security Clearance Applications',
      description: 'Process and submit security clearance applications for incoming contractors',
      status: 'NOT_STARTED',
      priority: 'CRITICAL',
      assignedTo: users.aliceUser.id,
      assignedBy: users.johnUser.id,
      dueDate: new Date('2024-09-30'),
      estimatedHours: 12.0,
      percentComplete: 0,
      createdBy: users.johnUser.id,
    },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: task,
      create: task,
    });
  }
}

async function seedArtifacts(transitions: any, users: any) {
  console.log('📄 Seeding artifacts...');
  
  const artifacts = [
    {
      id: 'art-001',
      transitionId: transitions.transition1.id,
      name: 'System Architecture Documentation',
      description: 'Comprehensive documentation of current system architecture',
      type: 'DOCUMENTATION',
      mimeType: 'application/pdf',
      filePath: '/artifacts/transition-001/system-architecture.pdf',
      fileSize: BigInt(2048576), // 2MB
      checksum: 'abc123def456789',
      version: 1,
      status: 'APPROVED',
      isRequired: true,
      submittedBy: users.janeUser.id,
      submittedAt: new Date('2024-08-08'),
      reviewedBy: users.johnUser.id,
      reviewedAt: new Date('2024-08-10'),
      approvalComments: 'Comprehensive and well-documented. Approved for knowledge base.',
      securityClassification: 'CONFIDENTIAL',
    },
    {
      id: 'art-002',
      transitionId: transitions.transition1.id,
      name: 'Database Schema Export',
      description: 'Complete database schema with table structures and relationships',
      type: 'DATABASE_EXPORT',
      mimeType: 'application/sql',
      filePath: '/artifacts/transition-001/database-schema.sql',
      fileSize: BigInt(512000), // 500KB
      checksum: 'def456ghi789abc',
      version: 1,
      status: 'UNDER_REVIEW',
      isRequired: true,
      submittedBy: users.janeUser.id,
      submittedAt: new Date('2024-08-12'),
      securityClassification: 'CONFIDENTIAL',
    },
    {
      id: 'art-003',
      transitionId: transitions.transition1.id,
      name: 'API Documentation',
      description: 'RESTful API documentation with endpoints and examples',
      type: 'DOCUMENTATION',
      mimeType: 'text/markdown',
      filePath: '/artifacts/transition-001/api-documentation.md',
      fileSize: BigInt(256000), // 250KB
      checksum: 'ghi789jkl012mno',
      version: 1,
      status: 'DRAFT',
      isRequired: true,
      submittedBy: users.janeUser.id,
      securityClassification: 'UNCLASSIFIED',
    },
  ];

  for (const artifact of artifacts) {
    await prisma.artifact.upsert({
      where: { id: artifact.id },
      update: artifact,
      create: artifact,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });