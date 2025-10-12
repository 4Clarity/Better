import { PrismaClient, SecurityClearanceLevel, AffiliationType, EmploymentStatus, AccessLevel, TransitionRole, SecurityStatus, PlatformAccess, TransitionStatus, MilestoneStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive user management database seeding...');

  try {
    // Create Organizations first
    const organizations = await seedOrganizations();

    // Create Persons and Users
    const { persons, users } = await seedPersonsAndUsers();

    // Create Roles
    const roles = await seedRoles();

    // Create User Roles
    await seedUserRoles(users, roles);

    // Create Person Organization Affiliations
    await seedPersonOrganizationAffiliations(persons, organizations, users);

    // Create Transitions
    const transitions = await seedTransitions(users, organizations);

    // Create Transition Users
    await seedTransitionUsers(transitions, users);

    // Create Milestones
    await seedMilestones(transitions, users);

    console.log('✅ Comprehensive database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

async function seedOrganizations() {
  console.log('🏢 Seeding organizations...');
  
  // Government Agencies
  const dod = await prisma.organizations.upsert({
    where: { id: 'org-dod-001' },
    update: {},
    create: {
      id: 'org-dod-001',
      name: 'Department of Defense',
      type: 'Government_Agency',
      contactEmail: 'contact@dod.gov',
      securityOfficerEmail: 'security@dod.gov',
      updatedAt: new Date(),
    },
  });

  const gsa = await prisma.organizations.upsert({
    where: { id: 'org-gsa-001' },
    update: {},
    create: {
      id: 'org-gsa-001',
      name: 'General Services Administration',
      abbreviation: 'GSA',
      type: 'Government_Agency',
      contactEmail: 'contact@gsa.gov',
      securityOfficerEmail: 'security@gsa.gov',
      updatedAt: new Date(),
    },
  });

  // Prime Contractors
  const acmeCorp = await prisma.organizations.upsert({
    where: { id: 'org-acme-001' },
    update: {},
    create: {
      id: 'org-acme-001',
      name: 'ACME Technology Solutions',
      type: 'Prime_Contractor',
      contactEmail: 'contact@acmetech.com',
      securityOfficerEmail: 'security@acmetech.com',
      updatedAt: new Date(),
    },
  });

  const techCorp = await prisma.organizations.upsert({
    where: { id: 'org-tech-001' },
    update: {},
    create: {
      id: 'org-tech-001',
      name: 'TechCorp Systems',
      abbreviation: 'TECH',
      type: 'Prime_Contractor',
      contactEmail: 'contact@techcorp.com',
      securityOfficerEmail: 'security@techcorp.com',
      updatedAt: new Date(),
    },
  });

  return { dod, gsa, acmeCorp, techCorp };
}

async function seedPersonsAndUsers() {
  console.log('👥 Seeding persons and users...');
  
  // System Administrator - Richard Roach
  const richardRoach = await prisma.persons.upsert({
    where: { id: 'person-richard-001' },
    update: {},
    create: {
      id: 'person-richard-001',
      firstName: 'Richard',
      lastName: 'Roach',
      primaryEmail: 'Richard.Roach@Gmail.com',
      workPhone: '+1-555-0100',
      securityClearanceLevel: 'Top_Secret',
      clearanceExpirationDate: new Date('2027-12-31'),
      skills: ['System Administration', 'User Management', 'Security Compliance', 'Database Management'],
      certifications: ['CISSP', 'Security+', 'CISM'],
      workLocation: 'Remote',
      professionalSummary: 'Experienced system administrator with expertise in user management and security compliance.',
      updatedAt: new Date(),
    },
  });

  const richardUser = await prisma.user.upsert({
    where: { id: 'user-richard-001' },
    update: {},
    create: {
      id: 'user-richard-001',
      personId: 'person-richard-001',
      username: 'richard.roach@gmail.com',
      keycloakId: 'keycloak-richard-001',
      updatedAt: new Date(),
    },
  });

  // Government Program Manager
  const johnDoe = await prisma.persons.upsert({
    where: { id: 'person-john-001' },
    update: {},
    create: {
      id: 'person-john-001',
      firstName: 'John',
      lastName: 'Doe',
      primaryEmail: 'john.doe@dod.gov',
      workPhone: '+1-555-0101',
      securityClearanceLevel: 'Secret',
      clearanceExpirationDate: new Date('2026-12-31'),
      skills: ['Project Management', 'Government Contracting', 'Security Compliance', 'Risk Management'],
      certifications: ['PMP', 'CISSP', 'Security+'],
      workLocation: 'Washington, DC',
      professionalSummary: 'Experienced government program manager with 15+ years managing large-scale IT transitions.',
      updatedAt: new Date(),
    },
  });

  const johnUser = await prisma.user.upsert({
    where: { id: 'user-john-001' },
    update: {},
    create: {
      id: 'user-john-001',
      personId: 'person-john-001',
      username: 'john.doe@dod.gov',
      keycloakId: 'keycloak-john-001',
      updatedAt: new Date(),
    },
  });

  // Departing Contractor
  const janeSmith = await prisma.persons.upsert({
    where: { id: 'person-jane-001' },
    update: {},
    create: {
      id: 'person-jane-001',
      firstName: 'Jane',
      lastName: 'Smith',
      primaryEmail: 'jane.smith@acmetech.com',
      workPhone: '+1-555-0102',
      title: 'Senior Software Engineer',
      securityClearanceLevel: 'Confidential',
      clearanceExpirationDate: new Date('2025-06-30'),
      skills: ['Full Stack Development', 'DevOps', 'Cloud Architecture', 'System Design'],
      certifications: ['AWS Certified Solutions Architect', 'Kubernetes Administrator'],
      workLocation: 'Arlington, VA',
      professionalSummary: 'Full-stack developer with expertise in cloud-native applications and DevOps practices.',
      updatedAt: new Date(),
    },
  });

  const janeUser = await prisma.user.upsert({
    where: { id: 'user-jane-001' },
    update: {},
    create: {
      id: 'user-jane-001',
      personId: 'person-jane-001',
      username: 'jane.smith@acmetech.com',
      keycloakId: 'keycloak-jane-001',
      updatedAt: new Date(),
    },
  });

  // Incoming Contractor
  const bobJohnson = await prisma.persons.upsert({
    where: { id: 'person-bob-001' },
    update: {},
    create: {
      id: 'person-bob-001',
      firstName: 'Bob',
      lastName: 'Johnson',
      primaryEmail: 'bob.johnson@techcorp.com',
      workPhone: '+1-555-0103',
      title: 'Technical Lead',
      securityClearanceLevel: 'Secret',
      clearanceExpirationDate: new Date('2027-03-15'),
      skills: ['System Architecture', 'Database Design', 'Team Leadership', 'Enterprise Integration'],
      certifications: ['Oracle Certified Professional', 'Spring Professional'],
      workLocation: 'Reston, VA',
      professionalSummary: 'Technical lead with extensive experience in enterprise system architecture and team management.',
      updatedAt: new Date(),
    },
  });

  const bobUser = await prisma.user.upsert({
    where: { id: 'user-bob-001' },
    update: {},
    create: {
      id: 'user-bob-001',
      personId: 'person-bob-001',
      username: 'bob.johnson@techcorp.com',
      keycloakId: 'keycloak-bob-001',
      updatedAt: new Date(),
    },
  });

  // Security Officer
  const aliceWilson = await prisma.persons.upsert({
    where: { id: 'person-alice-001' },
    update: {},
    create: {
      id: 'person-alice-001',
      firstName: 'Alice',
      lastName: 'Wilson',
      primaryEmail: 'alice.wilson@gsa.gov',
      workPhone: '+1-555-0104',
      title: 'Senior Security Officer',
      securityClearanceLevel: 'Top_Secret',
      clearanceExpirationDate: new Date('2025-11-30'),
      skills: ['Security Analysis', 'Compliance', 'Risk Management', 'Incident Response'],
      certifications: ['CISSP', 'CISM', 'Security+', 'FISMA'],
      workLocation: 'Washington, DC',
      professionalSummary: 'Senior security professional specializing in government compliance and risk management.',
      updatedAt: new Date(),
    },
  });

  const aliceUser = await prisma.user.upsert({
    where: { id: 'user-alice-001' },
    update: {},
    create: {
      id: 'user-alice-001',
      personId: 'person-alice-001',
      username: 'alice.wilson@gsa.gov',
      keycloakId: 'keycloak-alice-001',
      updatedAt: new Date(),
    },
  });

  // Observer User
  const mikeBrown = await prisma.persons.upsert({
    where: { id: 'person-mike-001' },
    update: {},
    create: {
      id: 'person-mike-001',
      firstName: 'Mike',
      lastName: 'Brown',
      primaryEmail: 'mike.brown@dod.gov',
      workPhone: '+1-555-0105',
      title: 'IT Analyst',
      securityClearanceLevel: 'Public_Trust',
      skills: ['Data Analysis', 'Reporting', 'Process Improvement'],
      certifications: ['CompTIA A+', 'ITIL Foundation'],
      workLocation: 'Arlington, VA',
      professionalSummary: 'IT analyst focused on process improvement and data analysis.',
      updatedAt: new Date(),
    },
  });

  const mikeUser = await prisma.user.upsert({
    where: { id: 'user-mike-001' },
    update: {},
    create: {
      id: 'user-mike-001',
      personId: 'person-mike-001',
      username: 'mike.brown@dod.gov',
      keycloakId: 'keycloak-mike-001',
      updatedAt: new Date(),
    },
  });

  // Admin Demo User
  const danDemo = await prisma.persons.upsert({
    where: { id: 'person-dan-001' },
    update: {},
    create: {
      id: 'person-dan-001',
      firstName: 'Dan',
      lastName: 'Demo',
      primaryEmail: 'dan.demo@tip.gov',
      workPhone: '+1-555-0106',
      title: 'System Administrator & Program Manager',
      securityClearanceLevel: 'Top_Secret',
      clearanceExpirationDate: new Date('2027-12-31'),
      skills: ['System Administration', 'Program Management', 'Security Compliance', 'User Management'],
      certifications: ['CISSP', 'PMP', 'Security+', 'CISM'],
      workLocation: 'Washington, DC',
      professionalSummary: 'Experienced system administrator and government program manager with expertise in platform administration and security compliance.',
      updatedAt: new Date(),
    },
  });

  const danUser = await prisma.user.upsert({
    where: { id: 'user-dan-001' },
    update: {},
    create: {
      id: 'user-dan-001',
      personId: 'person-dan-001',
      username: 'dan.demo@tip.gov',
      keycloakId: 'keycloak-dan-001',
      passwordHash: '$2a$10$X3kAXDR8IWNHE3/SI/0EUuCdLRnPp9870BTlSFa4LGyt8JqeXqjwq', // hashed 'dandemo'
      accountStatus: 'Active',
      emailVerified: true,
      roles: JSON.stringify(['Admin', 'Government_Program_Manager']),
      updatedAt: new Date(),
    },
  });

  return {
    persons: { richardRoach, johnDoe, janeSmith, bobJohnson, aliceWilson, mikeBrown, danDemo },
    users: { richardUser, johnUser, janeUser, bobUser, aliceUser, mikeUser, danUser },
  };
}

async function seedRoles() {
  console.log('🔐 Seeding roles...');

  const adminRole = await prisma.roles.upsert({
    where: { id: 'role-admin' },
    update: {
      name: 'Admin',
      description: 'System Administrator with full access',
    },
    create: {
      id: 'role-admin',
      name: 'Admin',
      description: 'System Administrator with full access',
      permissions: JSON.stringify(['*']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const programManagerRole = await prisma.roles.upsert({
    where: { id: 'role-program-manager' },
    update: {
      name: 'Program Manager',
      description: 'Program Manager with operational management access',
    },
    create: {
      id: 'role-program-manager',
      name: 'Program Manager',
      description: 'Program Manager with operational management access',
      permissions: JSON.stringify(['view_transitions', 'manage_transitions', 'view_users', 'manage_program']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const govProgramDirectorRole = await prisma.roles.upsert({
    where: { id: 'role-gov-program-director' },
    update: {},
    create: {
      id: 'role-gov-program-director',
      name: 'Gov Program Director',
      description: 'Government Program Director with executive oversight',
      permissions: JSON.stringify(['view_all', 'executive_reports', 'portfolio_oversight']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const departingContractorRole = await prisma.roles.upsert({
    where: { id: 'role-departing-contractor' },
    update: {},
    create: {
      id: 'role-departing-contractor',
      name: 'Departing Contractor',
      description: 'Departing contractor with knowledge transfer access',
      permissions: JSON.stringify(['view_transitions', 'contribute_knowledge', 'upload_artifacts']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const incomingContractorRole = await prisma.roles.upsert({
    where: { id: 'role-incoming-contractor' },
    update: {},
    create: {
      id: 'role-incoming-contractor',
      name: 'Incoming Contractor',
      description: 'Incoming contractor with progressive access',
      permissions: JSON.stringify(['view_knowledge', 'conditional_access']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const securityOfficerRole = await prisma.roles.upsert({
    where: { id: 'role-security-officer' },
    update: {},
    create: {
      id: 'role-security-officer',
      name: 'Security Officer',
      description: 'Security Officer with compliance and access management',
      permissions: JSON.stringify(['manage_security', 'view_all', 'manage_piv', 'manage_clearances']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const observerRole = await prisma.roles.upsert({
    where: { id: 'role-observer' },
    update: {},
    create: {
      id: 'role-observer',
      name: 'Observer',
      description: 'Observer with read-only access',
      permissions: JSON.stringify(['view_transitions', 'view_reports']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const operationalSupportRole = await prisma.roles.upsert({
    where: { id: 'role-operational-support' },
    update: {},
    create: {
      id: 'role-operational-support',
      name: 'Operational Support',
      description: 'Operational Support with knowledge management focus',
      permissions: JSON.stringify(['manage_knowledge', 'view_transitions', 'support_operations']),
      isActive: true,
      updatedAt: new Date(),
    },
  });

  return {
    adminRole,
    programManagerRole,
    govProgramDirectorRole,
    departingContractorRole,
    incomingContractorRole,
    securityOfficerRole,
    observerRole,
    operationalSupportRole,
  };
}

async function seedUserRoles(users: any, roles: any) {
  console.log('👤🔐 Seeding user roles...');

  // Assign Admin and Program Manager roles to Dan Demo
  await prisma.user_roles.upsert({
    where: { id: 'user-role-dan-admin' },
    update: {},
    create: {
      id: 'user-role-dan-admin',
      userId: users.danUser.id,
      roleId: roles.adminRole.id,
      assignedBy: users.danUser.id,
      isActive: true,
    },
  });

  await prisma.user_roles.upsert({
    where: { id: 'user-role-dan-pm' },
    update: {},
    create: {
      id: 'user-role-dan-pm',
      userId: users.danUser.id,
      roleId: roles.programManagerRole.id,
      assignedBy: users.danUser.id,
      isActive: true,
    },
  });
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
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Top_Secret' as SecurityClearanceLevel,
      startDate: new Date('2018-01-01'),
      isPrimary: true,
      accessLevel: 'Administrative' as AccessLevel,
      compensationLevel: 'GS-15',
      createdBy: users.richardUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-001',
      personId: persons.johnDoe.id,
      organizationId: organizations.dod.id,
      jobTitle: 'Senior Program Manager',
      department: 'Information Technology Directorate',
      employeeId: 'DOD-001-PM',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Secret' as SecurityClearanceLevel,
      startDate: new Date('2020-01-15'),
      isPrimary: true,
      accessLevel: 'Administrative' as AccessLevel,
      compensationLevel: 'GS-14',
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-002',
      personId: persons.janeSmith.id,
      organizationId: organizations.acmeCorp.id,
      jobTitle: 'Senior Software Engineer',
      department: 'Engineering Solutions',
      employeeId: 'ACME-002-SE',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Confidential' as SecurityClearanceLevel,
      startDate: new Date('2021-03-01'),
      isPrimary: true,
      accessLevel: 'Elevated' as AccessLevel,
      contractNumber: 'DOD-IT-2024-001',
      createdBy: users.janeUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-003',
      personId: persons.bobJohnson.id,
      organizationId: organizations.techCorp.id,
      jobTitle: 'Technical Lead',
      department: 'Solutions Architecture',
      employeeId: 'TECH-003-TL',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Secret' as SecurityClearanceLevel,
      startDate: new Date('2019-08-01'),
      isPrimary: true,
      accessLevel: 'Elevated' as AccessLevel,
      createdBy: users.bobUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-004',
      personId: persons.aliceWilson.id,
      organizationId: organizations.gsa.id,
      jobTitle: 'Senior Security Officer',
      department: 'Cybersecurity Division',
      employeeId: 'GSA-004-SO',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Top_Secret' as SecurityClearanceLevel,
      startDate: new Date('2018-05-01'),
      isPrimary: true,
      accessLevel: 'Administrative' as AccessLevel,
      compensationLevel: 'GS-13',
      createdBy: users.aliceUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-005',
      personId: persons.mikeBrown.id,
      organizationId: organizations.dod.id,
      jobTitle: 'IT Analyst',
      department: 'Information Systems',
      employeeId: 'DOD-005-AN',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Public_Trust' as SecurityClearanceLevel,
      startDate: new Date('2022-06-01'),
      isPrimary: true,
      accessLevel: 'Standard' as AccessLevel,
      compensationLevel: 'GS-12',
      createdBy: users.mikeUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'affil-006',
      personId: persons.danDemo.id,
      organizationId: organizations.dod.id,
      jobTitle: 'System Administrator & Program Manager',
      department: 'Information Technology Directorate',
      employeeId: 'DOD-006-ADMIN',
      affiliationType: 'Employee' as AffiliationType,
      employmentStatus: 'Active' as EmploymentStatus,
      securityClearanceRequired: 'Top_Secret' as SecurityClearanceLevel,
      startDate: new Date('2020-01-01'),
      isPrimary: true,
      accessLevel: 'Administrative' as AccessLevel,
      compensationLevel: 'GS-15',
      createdBy: users.danUser.id,
      updatedAt: new Date(),
    },
  ];

  for (const affiliation of affiliations) {
    await prisma.person_organization_affiliations.upsert({
      where: { id: affiliation.id },
      update: {},
      create: affiliation,
    });
  }
}

// BusinessOperation and Contract tables don't exist in the current database schema
// Skipping this seeding function

async function seedTransitions(users: any, organizations: any) {
  console.log('🔄 Seeding transitions...');

  const transition1 = await prisma.transitions.upsert({
    where: { id: 'trans-001' },
    update: {},
    create: {
      id: 'trans-001',
      name: 'Enterprise Data Platform Transition',
      contractName: 'Enterprise Data Platform Support',
      contractNumber: 'DOD-IT-2024-001',
      organizationId: organizations.dod.id,
      status: 'Active' as TransitionStatus,
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-31'),
      description: 'Transition of data platform operations from ACME to new contractor',
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
  });

  const transition2 = await prisma.transitions.upsert({
    where: { id: 'trans-002' },
    update: {},
    create: {
      id: 'trans-002',
      name: 'Identity Management System Transition',
      contractName: 'Identity Management System Modernization',
      contractNumber: 'GSA-SEC-2024-002',
      organizationId: organizations.gsa.id,
      status: 'Planning' as TransitionStatus,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2025-03-31'),
      description: 'Implementation and transition to modernized identity management system',
      createdBy: users.aliceUser.id,
      updatedAt: new Date(),
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
      role: 'Program_Manager' as TransitionRole,
      securityStatus: 'Cleared' as SecurityStatus,
      platformAccess: 'Full_Access' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-01'),
      lastAccessAt: new Date('2024-08-24'),
      updatedAt: new Date(),
    },
    {
      id: 'tu-002',
      transitionId: transitions.transition1.id,
      userId: users.janeUser.id,
      role: 'Departing_Contractor' as TransitionRole,
      securityStatus: 'Cleared' as SecurityStatus,
      platformAccess: 'Standard' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-02'),
      lastAccessAt: new Date('2024-08-23'),
      accessNotes: 'Full access to current systems for knowledge transfer',
      updatedAt: new Date(),
    },
    {
      id: 'tu-003',
      transitionId: transitions.transition1.id,
      userId: users.bobUser.id,
      role: 'Incoming_Contractor' as TransitionRole,
      securityStatus: 'In_Process' as SecurityStatus,
      platformAccess: 'Read_Only' as PlatformAccess,
      invitedBy: users.johnUser.id,
      accessNotes: 'Limited access pending security clearance processing',
      updatedAt: new Date(),
    },
    {
      id: 'tu-004',
      transitionId: transitions.transition2.id,
      userId: users.aliceUser.id,
      role: 'Security_Officer' as TransitionRole,
      securityStatus: 'Cleared' as SecurityStatus,
      platformAccess: 'Full_Access' as PlatformAccess,
      invitedBy: users.aliceUser.id,
      acceptedAt: new Date('2024-08-01'),
      lastAccessAt: new Date('2024-08-24'),
      updatedAt: new Date(),
    },
    {
      id: 'tu-005',
      transitionId: transitions.transition1.id,
      userId: users.mikeUser.id,
      role: 'Observer' as TransitionRole,
      securityStatus: 'Cleared' as SecurityStatus,
      platformAccess: 'Read_Only' as PlatformAccess,
      invitedBy: users.johnUser.id,
      acceptedAt: new Date('2024-08-10'),
      lastAccessAt: new Date('2024-08-22'),
      updatedAt: new Date(),
    },
  ];

  for (const tu of transitionUsers) {
    await prisma.transition_users.upsert({
      where: { id: tu.id },
      update: {},
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
      status: 'In_Progress' as MilestoneStatus,
      priority: 'Critical' as Priority,
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'mile-002',
      transitionId: transitions.transition1.id,
      title: 'Knowledge Transfer Sessions',
      description: 'Conduct comprehensive knowledge transfer sessions between departing and incoming teams',
      dueDate: new Date('2024-11-15'),
      status: 'Not_Started' as MilestoneStatus,
      priority: 'High' as Priority,
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'mile-003',
      transitionId: transitions.transition1.id,
      title: 'System Access Verification',
      description: 'Verify that incoming team has proper access to all necessary systems and tools',
      dueDate: new Date('2024-12-01'),
      status: 'Not_Started' as MilestoneStatus,
      priority: 'High' as Priority,
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
    {
      id: 'mile-004',
      transitionId: transitions.transition1.id,
      title: 'Transition Handoff Complete',
      description: 'Complete formal handoff of all responsibilities to incoming contractor',
      dueDate: new Date('2024-12-31'),
      status: 'Not_Started' as MilestoneStatus,
      priority: 'Critical' as Priority,
      createdBy: users.johnUser.id,
      updatedAt: new Date(),
    },
  ];

  for (const milestone of milestones) {
    await prisma.milestones.upsert({
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
