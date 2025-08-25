import { PrismaClient, SecurityClearanceLevel, InvitationStatus, AccountStatus, PIVStatus, OrganizationType, AffiliationType, EmploymentStatus, AccessLevel, TransitionRole, SecurityStatus, PlatformAccess, TransitionStatus, MilestoneStatus, PriorityLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive user management database seeding...');

  try {
    // Create Organizations first
    const organizations = await seedOrganizations();
    
    // Create Persons and Users
    const { persons, users } = await seedPersonsAndUsers();
    
    // Create Person Organization Affiliations
    await seedPersonOrganizationAffiliations(persons, organizations, users);
    
    // Create Business Operations and Contracts
    const { businessOperations, contracts } = await seedBusinessOperationsAndContracts(organizations, users);
    
    // Create Transitions
    const transitions = await seedTransitions(organizations, contracts, users);
    
    // Create Transition Users
    await seedTransitionUsers(transitions, users);
    
    // Create Milestones
    const milestones = await seedMilestones(transitions, users);
    
    console.log('✅ Comprehensive database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
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
  
  // System Administrator - Richard Roach
  const richardRoach = await prisma.person.upsert({
    where: { id: 'person-richard-001' },
    update: {},
    create: {
      id: 'person-richard-001',
      firstName: 'Richard',
      lastName: 'Roach',
      primaryEmail: 'Richard.Roach@Gmail.com',
      workPhone: '+1-555-0100',
      title: 'System Administrator',
      securityClearanceLevel: 'TOP_SECRET',
      clearanceExpirationDate: new Date('2027-12-31'),
      pivStatus: 'PIV_VERIFIED',
      skills: ['System Administration', 'User Management', 'Security Compliance', 'Database Management'],
      certifications: ['CISSP', 'Security+', 'CISM'],
      workLocation: 'Remote',
      professionalSummary: 'Experienced system administrator with expertise in user management and security compliance.',
    },
  });

  const richardUser = await prisma.user.upsert({
    where: { id: 'user-richard-001' },
    update: {},
    create: {
      id: 'user-richard-001',
      personId: 'person-richard-001',
      username: 'richard.roach',
      keycloakId: 'kc-richard-001',
      invitationStatus: 'INVITATION_ACCEPTED',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['System Administrator', 'Security Officer', 'Government Program Director'],
      lastLoginAt: new Date(),
      sessionTimeout: 60, // 60 minutes for admin
    },
  });

  // Government Program Manager
  const johnDoe = await prisma.person.upsert({
    where: { id: 'person-john-001' },
    update: {},
    create: {
      id: 'person-john-001',
      firstName: 'John',
      lastName: 'Doe',
      primaryEmail: 'john.doe@dod.gov',
      workPhone: '+1-555-0101',
      title: 'Senior Program Manager',
      securityClearanceLevel: 'SECRET',
      clearanceExpirationDate: new Date('2026-12-31'),
      pivStatus: 'PIV_VERIFIED',
      skills: ['Project Management', 'Government Contracting', 'Security Compliance', 'Risk Management'],
      certifications: ['PMP', 'CISSP', 'Security+'],
      workLocation: 'Washington, DC',
      professionalSummary: 'Experienced government program manager with 15+ years managing large-scale IT transitions.',
    },
  });

  const johnUser = await prisma.user.upsert({
    where: { id: 'user-john-001' },
    update: {},
    create: {
      id: 'user-john-001',
      personId: 'person-john-001',
      username: 'john.doe',
      keycloakId: 'kc-john-001',
      invitationStatus: 'INVITATION_ACCEPTED',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['Government Program Manager'],
      lastLoginAt: new Date('2024-08-24'),
    },
  });

  // Departing Contractor
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
      clearanceExpirationDate: new Date('2025-06-30'),
      pivStatus: 'PIV_VERIFIED',
      skills: ['Full Stack Development', 'DevOps', 'Cloud Architecture', 'System Design'],
      certifications: ['AWS Certified Solutions Architect', 'Kubernetes Administrator'],
      workLocation: 'Arlington, VA',
      professionalSummary: 'Full-stack developer with expertise in cloud-native applications and DevOps practices.',
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
      invitationStatus: 'INVITATION_ACCEPTED',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['Departing Contractor'],
      lastLoginAt: new Date('2024-08-23'),
    },
  });

  // Incoming Contractor
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
      clearanceExpirationDate: new Date('2027-03-15'),
      pivStatus: 'PIV_EXCEPTION_INTERIM',
      skills: ['System Architecture', 'Database Design', 'Team Leadership', 'Enterprise Integration'],
      certifications: ['Oracle Certified Professional', 'Spring Professional'],
      workLocation: 'Reston, VA',
      professionalSummary: 'Technical lead with extensive experience in enterprise system architecture and team management.',
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
      invitationStatus: 'INVITATION_SENT',
      accountStatus: 'PENDING',
      emailVerified: false,
      roles: ['Incoming Contractor'],
      invitationToken: 'inv-token-bob-001',
      invitationExpiresAt: new Date('2024-09-15'),
      invitedBy: 'user-john-001',
      invitedAt: new Date('2024-08-15'),
    },
  });

  // Security Officer
  const aliceWilson = await prisma.person.upsert({
    where: { id: 'person-alice-001' },
    update: {},
    create: {
      id: 'person-alice-001',
      firstName: 'Alice',
      lastName: 'Wilson',
      primaryEmail: 'alice.wilson@gsa.gov',
      workPhone: '+1-555-0104',
      title: 'Senior Security Officer',
      securityClearanceLevel: 'TOP_SECRET',
      clearanceExpirationDate: new Date('2025-11-30'),
      pivStatus: 'PIV_VERIFIED',
      skills: ['Security Analysis', 'Compliance', 'Risk Management', 'Incident Response'],
      certifications: ['CISSP', 'CISM', 'Security+', 'FISMA'],
      workLocation: 'Washington, DC',
      professionalSummary: 'Senior security professional specializing in government compliance and risk management.',
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
      invitationStatus: 'INVITATION_ACCEPTED',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['Security Officer'],
      twoFactorEnabled: true,
      twoFactorMethod: 'TOTP',
      lastLoginAt: new Date('2024-08-24'),
    },
  });

  // Observer User
  const mikeBrown = await prisma.person.upsert({
    where: { id: 'person-mike-001' },
    update: {},
    create: {
      id: 'person-mike-001',
      firstName: 'Mike',
      lastName: 'Brown',
      primaryEmail: 'mike.brown@dod.gov',
      workPhone: '+1-555-0105',
      title: 'IT Analyst',
      securityClearanceLevel: 'PUBLIC_TRUST',
      pivStatus: 'PIV_VERIFIED',
      skills: ['Data Analysis', 'Reporting', 'Process Improvement'],
      certifications: ['CompTIA A+', 'ITIL Foundation'],
      workLocation: 'Arlington, VA',
      professionalSummary: 'IT analyst focused on process improvement and data analysis.',
    },
  });

  const mikeUser = await prisma.user.upsert({
    where: { id: 'user-mike-001' },
    update: {},
    create: {
      id: 'user-mike-001',
      personId: 'person-mike-001',
      username: 'mike.brown',
      keycloakId: 'kc-mike-001',
      invitationStatus: 'INVITATION_ACCEPTED',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      roles: ['Observer'],
      lastLoginAt: new Date('2024-08-22'),
    },
  });

  return {
    persons: { richardRoach, johnDoe, janeSmith, bobJohnson, aliceWilson, mikeBrown },
    users: { richardUser, johnUser, janeUser, bobUser, aliceUser, mikeUser },
  };
}

async function seedPersonOrganizationAffiliations(persons: any, organizations: any, users: any) {
  console.log('🔗 Seeding person organization affiliations...');
  
  const affiliations = [
    {
      id: 'affil-000',
      personId: persons.richardRoach.id,
      organizationId: organizations.dod.id,
      jobTitle: 'System Administrator',
      department: 'Information Technology Directorate',
      employeeId: 'DOD-000-SA',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'TOP_SECRET' as SecurityClearanceLevel,
      startDate: new Date('2018-01-01'),
      isPrimary: true,
      accessLevel: 'ADMINISTRATIVE' as AccessLevel,
      compensationLevel: 'GS-15',
      createdBy: users.richardUser.id,
    },
    {
      id: 'affil-001',
      personId: persons.johnDoe.id,
      organizationId: organizations.dod.id,
      jobTitle: 'Senior Program Manager',
      department: 'Information Technology Directorate',
      employeeId: 'DOD-001-PM',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'SECRET' as SecurityClearanceLevel,
      startDate: new Date('2020-01-15'),
      isPrimary: true,
      accessLevel: 'ADMINISTRATIVE' as AccessLevel,
      compensationLevel: 'GS-14',
      createdBy: users.johnUser.id,
    },
    {
      id: 'affil-002',
      personId: persons.janeSmith.id,
      organizationId: organizations.acmeCorp.id,
      jobTitle: 'Senior Software Engineer',
      department: 'Engineering Solutions',
      employeeId: 'ACME-002-SE',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'CONFIDENTIAL' as SecurityClearanceLevel,
      startDate: new Date('2021-03-01'),
      isPrimary: true,
      accessLevel: 'ELEVATED' as AccessLevel,
      contractNumber: 'DOD-IT-2024-001',
      createdBy: users.janeUser.id,
    },
    {
      id: 'affil-003',
      personId: persons.bobJohnson.id,
      organizationId: organizations.techCorp.id,
      jobTitle: 'Technical Lead',
      department: 'Solutions Architecture',
      employeeId: 'TECH-003-TL',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'SECRET' as SecurityClearanceLevel,
      startDate: new Date('2019-08-01'),
      isPrimary: true,
      accessLevel: 'ELEVATED' as AccessLevel,
      createdBy: users.bobUser.id,
    },
    {
      id: 'affil-004',
      personId: persons.aliceWilson.id,
      organizationId: organizations.gsa.id,
      jobTitle: 'Senior Security Officer',
      department: 'Cybersecurity Division',
      employeeId: 'GSA-004-SO',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'TOP_SECRET' as SecurityClearanceLevel,
      startDate: new Date('2018-05-01'),
      isPrimary: true,
      accessLevel: 'ADMINISTRATIVE' as AccessLevel,
      compensationLevel: 'GS-13',
      createdBy: users.aliceUser.id,
    },
    {
      id: 'affil-005',
      personId: persons.mikeBrown.id,
      organizationId: organizations.dod.id,
      jobTitle: 'IT Analyst',
      department: 'Information Systems',
      employeeId: 'DOD-005-AN',
      affiliationType: 'EMPLOYEE' as AffiliationType,
      employmentStatus: 'ACTIVE' as EmploymentStatus,
      securityClearanceRequired: 'PUBLIC_TRUST' as SecurityClearanceLevel,
      startDate: new Date('2022-06-01'),
      isPrimary: true,
      accessLevel: 'STANDARD' as AccessLevel,
      compensationLevel: 'GS-12',
      createdBy: users.mikeUser.id,
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

async function seedBusinessOperationsAndContracts(organizations: any, users: any) {
  console.log('🏭 Seeding business operations and contracts...');

  // Create Business Operations
  const dataplatformOp = await prisma.businessOperation.upsert({
    where: { id: 'biz-op-001' },
    update: {},
    create: {
      id: 'biz-op-001',
      name: 'Enterprise Data Platform Operations',
      businessFunction: 'Data Management',
      technicalDomain: 'Cloud Infrastructure',
      description: 'Management and operation of enterprise data platform supporting analytics and reporting',
      scope: 'Government-wide data integration and analytics platform',
      objectives: 'Provide scalable, secure, and compliant data services for government agencies',
      performanceMetrics: {
        uptime: '99.9%',
        responseTime: '<500ms',
        dataProcessingCapacity: '10TB/day',
        userSatisfaction: '>4.5/5'
      },
      supportPeriodStart: new Date('2024-01-01'),
      supportPeriodEnd: new Date('2026-12-31'),
      currentContractEnd: new Date('2024-12-31'),
      governmentPMId: users.johnUser.id,
      directorId: users.johnUser.id, // For now, same person
    },
  });

  const idManagementOp = await prisma.businessOperation.upsert({
    where: { id: 'biz-op-002' },
    update: {},
    create: {
      id: 'biz-op-002',
      name: 'Identity Management System Operations',
      businessFunction: 'Identity and Access Management',
      technicalDomain: 'Cybersecurity',
      description: 'Operation of enterprise identity management and access control systems',
      scope: 'Multi-agency identity federation and access management',
      objectives: 'Provide secure, compliant, and user-friendly identity services',
      performanceMetrics: {
        uptime: '99.95%',
        authenticationTime: '<2s',
        securityIncidents: '0 critical',
        complianceScore: '100%'
      },
      supportPeriodStart: new Date('2024-01-01'),
      supportPeriodEnd: new Date('2025-12-31'),
      currentContractEnd: new Date('2025-03-31'),
      governmentPMId: users.aliceUser.id,
      directorId: users.aliceUser.id,
    },
  });

  // Create Contracts
  const dataplatformContract = await prisma.contract.upsert({
    where: { id: 'contract-001' },
    update: {},
    create: {
      id: 'contract-001',
      businessOperationId: dataplatformOp.id,
      contractName: 'Enterprise Data Platform Support',
      contractNumber: 'DOD-IT-2024-001',
      contractorName: 'ACME Technology Solutions',
      contractorPMId: users.janeUser.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      canBeExtended: true,
      status: 'ACTIVE',
    },
  });

  const idManagementContract = await prisma.contract.upsert({
    where: { id: 'contract-002' },
    update: {},
    create: {
      id: 'contract-002',
      businessOperationId: idManagementOp.id,
      contractName: 'Identity Management System Modernization',
      contractNumber: 'GSA-SEC-2024-002',
      contractorName: 'TechCorp Systems',
      contractorPMId: users.bobUser.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-03-31'),
      canBeExtended: false,
      status: 'PLANNING',
    },
  });

  return {
    businessOperations: { dataplatformOp, idManagementOp },
    contracts: { dataplatformContract, idManagementContract }
  };
}

async function seedTransitions(organizations: any, contracts: any, users: any) {
  console.log('🔄 Seeding transitions...');
  
  const transition1 = await prisma.transition.upsert({
    where: { id: 'trans-001' },
    update: {},
    create: {
      id: 'trans-001',
      name: 'Enterprise Data Platform Transition',
      contractName: 'Enterprise Data Platform Support',
      contractNumber: 'DOD-IT-2024-001',
      contractId: contracts.dataplatformContract.id,
      organizationId: organizations.dod.id,
      status: 'ON_TRACK' as TransitionStatus,
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-31'),
      duration: 'NINETY_DAYS',
      description: 'Transition of data platform operations from ACME to new contractor',
      requiresContinuousService: true,
      createdBy: users.johnUser.id,
    },
  });

  const transition2 = await prisma.transition.upsert({
    where: { id: 'trans-002' },
    update: {},
    create: {
      id: 'trans-002',
      name: 'Identity Management System Transition',
      contractName: 'Identity Management System Modernization',
      contractNumber: 'GSA-SEC-2024-002',
      contractId: contracts.idManagementContract.id,
      organizationId: organizations.gsa.id,
      status: 'NOT_STARTED' as TransitionStatus,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2025-03-31'),
      duration: 'NINETY_DAYS',
      description: 'Implementation and transition to modernized identity management system',
      requiresContinuousService: true,
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
      role: 'PROGRAM_MANAGER' as TransitionRole,
      securityStatus: 'CLEARED' as SecurityStatus,
      platformAccess: 'FULL_ACCESS' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-01'),
      lastAccessAt: new Date('2024-08-24'),
    },
    {
      id: 'tu-002',
      transitionId: transitions.transition1.id,
      userId: users.janeUser.id,
      role: 'DEPARTING_CONTRACTOR' as TransitionRole,
      securityStatus: 'CLEARED' as SecurityStatus,
      platformAccess: 'STANDARD' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-02'),
      lastAccessAt: new Date('2024-08-23'),
      accessNotes: 'Full access to current systems for knowledge transfer',
    },
    {
      id: 'tu-003',
      transitionId: transitions.transition1.id,
      userId: users.bobUser.id,
      role: 'INCOMING_CONTRACTOR' as TransitionRole,
      securityStatus: 'IN_PROCESS' as SecurityStatus,
      platformAccess: 'READ_ONLY' as PlatformAccess,
      invitedBy: users.johnUser.id,
      accessNotes: 'Limited access pending security clearance processing',
    },
    {
      id: 'tu-004',
      transitionId: transitions.transition2.id,
      userId: users.aliceUser.id,
      role: 'SECURITY_OFFICER' as TransitionRole,
      securityStatus: 'CLEARED' as SecurityStatus,
      platformAccess: 'FULL_ACCESS' as PlatformAccess,
      invitedBy: users.aliceUser.id,
      acceptedAt: new Date('2024-08-01'),
      lastAccessAt: new Date('2024-08-24'),
    },
    {
      id: 'tu-005',
      transitionId: transitions.transition1.id,
      userId: users.mikeUser.id,
      role: 'OBSERVER' as TransitionRole,
      securityStatus: 'CLEARED' as SecurityStatus,
      platformAccess: 'READ_ONLY' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-10'),
      lastAccessAt: new Date('2024-08-22'),
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
  
  const milestones = [
    {
      id: 'mile-001',
      transitionId: transitions.transition1.id,
      title: 'Security Clearance Processing Complete',
      description: 'Complete security clearance processing for all incoming team members',
      dueDate: new Date('2024-09-30'),
      status: 'IN_PROGRESS' as MilestoneStatus,
      priority: 'CRITICAL' as PriorityLevel,
    },
    {
      id: 'mile-002',
      transitionId: transitions.transition1.id,
      title: 'Knowledge Transfer Sessions',
      description: 'Conduct comprehensive knowledge transfer sessions between departing and incoming teams',
      dueDate: new Date('2024-11-15'),
      status: 'PENDING' as MilestoneStatus,
      priority: 'HIGH' as PriorityLevel,
    },
    {
      id: 'mile-003',
      transitionId: transitions.transition1.id,
      title: 'System Access Verification',
      description: 'Verify that incoming team has proper access to all necessary systems and tools',
      dueDate: new Date('2024-12-01'),
      status: 'PENDING' as MilestoneStatus,
      priority: 'HIGH' as PriorityLevel,
    },
    {
      id: 'mile-004',
      transitionId: transitions.transition1.id,
      title: 'Transition Handoff Complete',
      description: 'Complete formal handoff of all responsibilities to incoming contractor',
      dueDate: new Date('2024-12-31'),
      status: 'PENDING' as MilestoneStatus,
      priority: 'CRITICAL' as PriorityLevel,
    },
  ];

  for (const milestone of milestones) {
    await prisma.milestone.upsert({
      where: { id: milestone.id },
      update: milestone,
      create: milestone,
    });
  }

  return milestones;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });