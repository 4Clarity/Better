# 🎯 **COMPREHENSIVE AUTHENTICATION IMPLEMENTATION PLAN**

## 📋 **PROJECT OVERVIEW**

This document outlines the complete implementation plan for adding robust email and Keycloak authentication to the TIP Platform, including self-registration, admin approval workflows, and first-user administrator functionality.

### **Current System Analysis**
- ✅ **Solid Foundation**: JWT-based auth with comprehensive security features
- ✅ **Database Schema**: Complete user tables with proper relationships
- ✅ **Security Implementation**: Bcrypt hashing, session management, rate limiting
- ✅ **Frontend API Client**: Well-structured with token management
- ✅ **Keycloak Server**: Running and configured
- ✅ **Docker Environment**: PostgreSQL database via Docker Compose

### **Critical Gaps Identified**
1. **Incomplete Keycloak Integration**: Returns demo user instead of real user creation
2. **Missing Environment Configuration**: `KEYCLOAK_JWT_PUBLIC_KEY` not configured
3. **Database Permission Issues**: PostgreSQL permission denied errors
4. **Schema Inconsistencies**: Mixed JSON/relational role approaches
5. **No User Registration Flow**: Missing email-based user creation

### **Requirements Summary**
- 🔐 Self-registration with email verification
- 👥 Admin approval workflow for new users
- 🎯 First user becomes platform administrator
- 🔑 Keycloak SSO integration
- 📧 Email authentication with password reset
- 🐳 Docker deployment environment
- 📨 SMTP server integration for emails

---

## 🚀 **PHASE 1: Infrastructure & Docker Setup**

### **1.1 Docker Compose Enhancement**
**Priority: CRITICAL**

Add email and session services to the existing Docker Compose setup:

```yaml
# Add to docker-compose.yml
services:
  # SMTP Server for Email Verification
  mailhog:
    image: mailhog/mailhog:v1.0.1
    container_name: mailhog
    ports:
      - "1025:1025"   # SMTP port
      - "8025:8025"   # Web UI port
    networks:
      - better_network
    environment:
      - MH_STORAGE=memory
      - MH_UI_BIND_ADDR=0.0.0.0:8025
      - MH_API_BIND_ADDR=0.0.0.0:8025
      - MH_SMTP_BIND_ADDR=0.0.0.0:1025

  # Optional: Redis for session storage and rate limiting
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - better_network
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### **1.2 Environment Configuration Update**
**Priority: CRITICAL**

```bash
# Add to backend-node/.env
# Email Configuration (MailHog)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@tip-platform.gov"
SMTP_SECURE=false

# Keycloak Configuration (CRITICAL - MISSING)
KEYCLOAK_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n[RSA PUBLIC KEY FROM KEYCLOAK]\n-----END PUBLIC KEY-----"
KEYCLOAK_BASE_URL="http://keycloak:8080"
KEYCLOAK_REALM="tip-realm"
KEYCLOAK_CLIENT_ID="tip-backend"
KEYCLOAK_CLIENT_SECRET="[secure-secret-from-keycloak]"

# Application URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# User Registration Settings
ALLOW_SELF_REGISTRATION=true
ADMIN_APPROVAL_REQUIRED=true
EMAIL_VERIFICATION_REQUIRED=true
FIRST_USER_IS_ADMIN=true

# Session Storage (Optional Redis)
SESSION_STORE=redis
REDIS_URL=redis://redis:6379

# Email Templates
EMAIL_VERIFICATION_TEMPLATE_PATH=./templates/verification-email.html
ADMIN_APPROVAL_TEMPLATE_PATH=./templates/admin-approval-email.html
WELCOME_EMAIL_TEMPLATE_PATH=./templates/welcome-email.html
```

```bash
# Add to frontend/.env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=tip-realm
VITE_KEYCLOAK_CLIENT_ID=tip-frontend
VITE_BACKEND_URL=http://localhost:3000
```

### **1.3 Database Migration Strategy**
**Priority: CRITICAL**

```bash
# Connect to PostgreSQL container and fix permissions
docker-compose exec postgres psql -U postgres -d tip

# Grant proper permissions to application user
GRANT ALL PRIVILEGES ON SCHEMA public TO better_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO better_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO better_service;

# Run Prisma migrations
cd backend-node
npx prisma migrate deploy
npx prisma generate
```

---

## 🔐 **PHASE 2: User Registration & Approval System**

### **2.1 Database Schema Enhancements**
**Priority: HIGH**

Add new tables to Prisma schema for registration workflow:

```prisma
model user_registration_requests {
  id              String   @id @default(cuid())
  email           String   @unique
  firstName       String
  lastName        String
  organizationName String?
  position        String?

  // Registration workflow
  verificationToken String?  @unique
  isEmailVerified   Boolean  @default(false)
  verificationTokenExpiry DateTime?

  // Admin approval workflow
  adminApprovalStatus ApprovalStatus @default(PENDING)
  approvedBy         String?
  approvedAt         DateTime?
  rejectedReason     String?

  // Security and metadata
  requestedRoles     Json     @default("[]")
  registrationIP     String?
  userAgent          String?
  passwordHash       String   // Store hashed password

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  expiresAt       DateTime // Registration expiry (48 hours)

  // Relations
  approver        users?   @relation("RegistrationApprover", fields: [approvedBy], references: [id])

  @@map("user_registration_requests")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

// Add to users table
model users {
  // ... existing fields
  isFirstUser             Boolean @default(false)
  registrationRequestId   String?
  accountApprovalStatus   ApprovalStatus @default(APPROVED)
  emailVerifiedAt         DateTime?

  // Relations
  registrationApprovals   user_registration_requests[] @relation("RegistrationApprover")

  // ... existing relations
}
```

### **2.2 Registration Workflow Service**
**Priority: HIGH**

Create `src/modules/user-registration/user-registration.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from '../email/email.service';

const prisma = new PrismaClient();

export class UserRegistrationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Self-Registration: Create registration request
   */
  async registerUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
    position?: string;
    registrationIP?: string;
    userAgent?: string;
  }) {
    // 1. Validate email uniqueness
    const existingUser = await prisma.users.findFirst({
      where: { persons: { primaryEmail: data.email.toLowerCase() } }
    });

    if (existingUser) {
      throw new Error('Email address already registered');
    }

    const existingRequest = await prisma.user_registration_requests.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingRequest && existingRequest.adminApprovalStatus === 'PENDING') {
      throw new Error('Registration request already pending');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // 3. Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 4. Create registration request
    const registrationRequest = await prisma.user_registration_requests.upsert({
      where: { email: data.email.toLowerCase() },
      create: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName: data.organizationName,
        position: data.position,
        passwordHash,
        verificationToken,
        verificationTokenExpiry,
        registrationIP: data.registrationIP,
        userAgent: data.userAgent,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName: data.organizationName,
        position: data.position,
        passwordHash,
        verificationToken,
        verificationTokenExpiry,
        adminApprovalStatus: 'PENDING',
        isEmailVerified: false,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      }
    });

    // 5. Send verification email
    await this.emailService.sendVerificationEmail(
      data.email,
      verificationToken,
      data.firstName
    );

    return {
      id: registrationRequest.id,
      message: 'Registration request created. Please check your email for verification.',
      requiresVerification: true
    };
  }

  /**
   * Email Verification: Verify email and check for first user
   */
  async verifyEmail(token: string) {
    const request = await prisma.user_registration_requests.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() }
      }
    });

    if (!request) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if this would be the first user
    const userCount = await prisma.users.count();
    const isFirstUser = userCount === 0;

    // Mark email as verified
    await prisma.user_registration_requests.update({
      where: { id: request.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });

    if (isFirstUser) {
      // Auto-approve first user as admin
      return await this.handleFirstUserRegistration(request.id);
    } else {
      // Notify admins for approval
      await this.notifyAdminsForApproval(request);

      return {
        message: 'Email verified successfully. Your registration is pending admin approval.',
        requiresApproval: true,
        isFirstUser: false
      };
    }
  }

  /**
   * Admin Approval: Approve registration request
   */
  async approveRegistration(requestId: string, adminId: string, roles: string[] = ['user']) {
    const request = await prisma.user_registration_requests.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Registration request not found');
    }

    if (!request.isEmailVerified) {
      throw new Error('Email must be verified before approval');
    }

    if (request.adminApprovalStatus !== 'PENDING') {
      throw new Error('Registration request is not in pending status');
    }

    // Create user account in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create person record
      const person = await tx.persons.create({
        data: {
          firstName: request.firstName,
          lastName: request.lastName,
          primaryEmail: request.email,
          organizationName: request.organizationName,
          position: request.position,
        }
      });

      // 2. Create user record
      const user = await tx.users.create({
        data: {
          username: request.email,
          personId: person.id,
          passwordHash: request.passwordHash,
          accountStatus: 'ACTIVE',
          registrationRequestId: request.id,
          accountApprovalStatus: 'APPROVED',
          emailVerifiedAt: new Date(),
        }
      });

      // 3. Assign roles
      await this.assignRolesToUser(tx, user.id, roles);

      // 4. Update registration request
      await tx.user_registration_requests.update({
        where: { id: requestId },
        data: {
          adminApprovalStatus: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date()
        }
      });

      return { user, person };
    });

    // 5. Send welcome email
    await this.emailService.sendWelcomeEmail(request.email, roles.includes('admin'));

    return {
      message: 'Registration approved successfully',
      userId: result.user.id
    };
  }

  /**
   * First User Admin Logic: Auto-approve first registration
   */
  private async handleFirstUserRegistration(requestId: string) {
    const adminRoles = ['admin', 'program_manager', 'user'];
    await this.approveRegistration(requestId, 'system', adminRoles);

    return {
      message: 'Email verified and account created. You are now the platform administrator.',
      requiresApproval: false,
      isFirstUser: true,
      isAdmin: true
    };
  }

  /**
   * Notify admins of pending approval
   */
  private async notifyAdminsForApproval(request: any) {
    const admins = await prisma.users.findMany({
      where: {
        user_roles_user_roles_userIdTousers: {
          some: {
            roles: { name: 'admin' }
          }
        },
        accountStatus: 'ACTIVE'
      },
      include: { persons: true }
    });

    const adminEmails = admins.map(admin => admin.persons?.primaryEmail).filter(Boolean);

    if (adminEmails.length > 0) {
      await this.emailService.sendAdminNotification(adminEmails, request);
    }
  }

  /**
   * Assign roles to user
   */
  private async assignRolesToUser(tx: any, userId: string, roleNames: string[]) {
    for (const roleName of roleNames) {
      const role = await tx.roles.findFirst({
        where: { name: roleName }
      });

      if (role) {
        await tx.user_roles.create({
          data: {
            userId,
            roleId: role.id
          }
        });
      }
    }
  }

  /**
   * Get pending registration requests (admin only)
   */
  async getPendingRegistrations() {
    return await prisma.user_registration_requests.findMany({
      where: {
        adminApprovalStatus: 'PENDING',
        isEmailVerified: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Reject registration request
   */
  async rejectRegistration(requestId: string, adminId: string, reason: string) {
    const request = await prisma.user_registration_requests.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Registration request not found');
    }

    await prisma.user_registration_requests.update({
      where: { id: requestId },
      data: {
        adminApprovalStatus: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectedReason: reason
      }
    });

    // Send rejection email
    await this.emailService.sendRejectionEmail(request.email, reason);

    return {
      message: 'Registration rejected successfully'
    };
  }
}
```

### **2.3 Email Service Implementation**
**Priority: HIGH**

Create `src/modules/email/email.service.ts`:

```typescript
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
    });
  }

  async sendVerificationEmail(email: string, token: string, userName: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const template = await this.loadTemplate('verification-email.html');

    const html = template
      .replace('{{firstName}}', userName)
      .replace(/{{verificationUrl}}/g, verificationUrl);

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify Your Email - TIP Platform',
      html
    });
  }

  async sendAdminNotification(adminEmails: string[], newUserData: any) {
    const template = await this.loadTemplate('admin-notification.html');
    const approvalUrl = `${process.env.FRONTEND_URL}/admin/registrations`;

    const html = template
      .replace('{{firstName}}', newUserData.firstName)
      .replace('{{lastName}}', newUserData.lastName)
      .replace('{{email}}', newUserData.email)
      .replace('{{organizationName}}', newUserData.organizationName || 'Not provided')
      .replace('{{position}}', newUserData.position || 'Not provided')
      .replace('{{approvalUrl}}', approvalUrl);

    for (const adminEmail of adminEmails) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject: 'New User Registration Pending Approval - TIP Platform',
        html
      });
    }
  }

  async sendWelcomeEmail(email: string, isAdmin: boolean = false) {
    const template = await this.loadTemplate('welcome-email.html');
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    const html = template
      .replace('{{loginUrl}}', loginUrl)
      .replace('{{isAdmin}}', isAdmin.toString())
      .replace('{{adminSection}}', isAdmin ? '<p><strong>You have been granted administrator privileges.</strong> You can access the admin dashboard to manage users and system settings.</p>' : '');

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Welcome to TIP Platform${isAdmin ? ' - Administrator Access Granted' : ''}`,
      html
    });
  }

  async sendRejectionEmail(email: string, reason: string) {
    const template = await this.loadTemplate('rejection-email.html');

    const html = template
      .replace('{{reason}}', reason);

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Registration Request Update - TIP Platform',
      html
    });
  }

  private async loadTemplate(templateName: string): string {
    const templatePath = path.join(process.cwd(), 'templates', templateName);
    return await fs.readFile(templatePath, 'utf-8');
  }
}
```

---

## 🎯 **PHASE 3: Enhanced Authentication System**

### **3.1 Keycloak Integration Fixes**
**Priority: HIGH**

Update `src/modules/auth/auth.service.ts` - replace the `findOrCreateUserFromKeycloak` method:

```typescript
/**
 * Find or create user from Keycloak token data - FIXED IMPLEMENTATION
 */
private async findOrCreateUserFromKeycloak(keycloakData: any): Promise<AuthUser> {
  try {
    // 1. Look for existing user by keycloakId
    let user = await prisma.users.findFirst({
      where: { keycloakId: keycloakData.sub },
      include: {
        persons: true,
        user_roles_user_roles_userIdTousers: {
          include: { roles: true }
        }
      }
    });

    // 2. If not found, look by email
    if (!user) {
      user = await prisma.users.findFirst({
        where: {
          persons: { primaryEmail: keycloakData.email?.toLowerCase() }
        },
        include: {
          persons: true,
          user_roles_user_roles_userIdTousers: {
            include: { roles: true }
          }
        }
      });

      // If found by email, link Keycloak ID
      if (user) {
        user = await prisma.users.update({
          where: { id: user.id },
          data: { keycloakId: keycloakData.sub },
          include: {
            persons: true,
            user_roles_user_roles_userIdTousers: {
              include: { roles: true }
            }
          }
        });
      }
    }

    // 3. Create new user if not found
    if (!user) {
      user = await this.createUserFromKeycloak(keycloakData);
    } else {
      // 4. Update existing user with latest Keycloak data
      await this.updateUserFromKeycloak(user.id, keycloakData);
    }

    // 5. Return formatted user
    return this.formatAuthUser(user);
  } catch (error) {
    console.error('Keycloak user creation/lookup failed:', error);
    throw new Error(`Keycloak integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create new user from Keycloak data
 */
private async createUserFromKeycloak(keycloakData: any): Promise<any> {
  // Check if this should be the first admin user
  const userCount = await prisma.users.count();
  const isFirstUser = userCount === 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Create person record
    const person = await tx.persons.create({
      data: {
        firstName: keycloakData.given_name || 'Unknown',
        lastName: keycloakData.family_name || 'User',
        primaryEmail: keycloakData.email?.toLowerCase(),
        displayName: keycloakData.name || `${keycloakData.given_name || 'Unknown'} ${keycloakData.family_name || 'User'}`,
        profilePictureUrl: keycloakData.picture,
        phoneNumber: keycloakData.phone_number,
        organizationName: keycloakData.organization,
        position: keycloakData.position || keycloakData.job_title,
      }
    });

    // 2. Create user record
    const user = await tx.users.create({
      data: {
        keycloakId: keycloakData.sub,
        username: keycloakData.preferred_username || keycloakData.email,
        personId: person.id,
        accountStatus: 'ACTIVE',
        isFirstUser,
        emailVerifiedAt: keycloakData.email_verified ? new Date() : null,
        lastLoginAt: new Date(),
      }
    });

    // 3. Assign roles based on Keycloak claims and first user logic
    const roles = this.extractRolesFromKeycloak(keycloakData, isFirstUser);
    await this.assignRolesToUser(tx, user.id, roles);

    return {
      ...user,
      persons: person,
      user_roles_user_roles_userIdTousers: []
    };
  });
}

/**
 * Update existing user with Keycloak data
 */
private async updateUserFromKeycloak(userId: string, keycloakData: any): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update user record
    await tx.users.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        emailVerifiedAt: keycloakData.email_verified ? new Date() : undefined,
      }
    });

    // Update person record
    const user = await tx.users.findUnique({
      where: { id: userId },
      include: { persons: true }
    });

    if (user?.persons) {
      await tx.persons.update({
        where: { id: user.persons.id },
        data: {
          firstName: keycloakData.given_name || user.persons.firstName,
          lastName: keycloakData.family_name || user.persons.lastName,
          displayName: keycloakData.name || user.persons.displayName,
          profilePictureUrl: keycloakData.picture || user.persons.profilePictureUrl,
          phoneNumber: keycloakData.phone_number || user.persons.phoneNumber,
        }
      });
    }

    // Update roles if they've changed
    const newRoles = this.extractRolesFromKeycloak(keycloakData, user?.isFirstUser || false);
    await this.syncUserRoles(tx, userId, newRoles);
  });
}

/**
 * Extract roles from Keycloak token claims
 */
private extractRolesFromKeycloak(keycloakData: any, isFirstUser: boolean): string[] {
  const roles = new Set<string>();

  // Default role for all users
  roles.add('user');

  // First user gets admin privileges
  if (isFirstUser) {
    roles.add('admin');
    roles.add('program_manager');
  }

  // Extract realm roles
  if (keycloakData.realm_access?.roles) {
    keycloakData.realm_access.roles.forEach((role: string) => {
      // Map Keycloak roles to application roles
      const mappedRole = this.mapKeycloakRole(role);
      if (mappedRole) {
        roles.add(mappedRole);
      }
    });
  }

  // Extract client roles
  if (keycloakData.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles) {
    keycloakData.resource_access[process.env.KEYCLOAK_CLIENT_ID].roles.forEach((role: string) => {
      const mappedRole = this.mapKeycloakRole(role);
      if (mappedRole) {
        roles.add(mappedRole);
      }
    });
  }

  return Array.from(roles);
}

/**
 * Map Keycloak roles to application roles
 */
private mapKeycloakRole(keycloakRole: string): string | null {
  const roleMapping: Record<string, string> = {
    'tip-admin': 'admin',
    'tip-program-manager': 'program_manager',
    'tip-user': 'user',
    'admin': 'admin',
    'program_manager': 'program_manager',
    'user': 'user',
  };

  return roleMapping[keycloakRole] || null;
}

/**
 * Sync user roles with new role list
 */
private async syncUserRoles(tx: any, userId: string, newRoles: string[]): Promise<void> {
  // Get current roles
  const currentUserRoles = await tx.user_roles.findMany({
    where: { userId },
    include: { roles: true }
  });

  const currentRoleNames = currentUserRoles.map(ur => ur.roles.name);

  // Remove roles not in new list
  const rolesToRemove = currentRoleNames.filter(role => !newRoles.includes(role));
  if (rolesToRemove.length > 0) {
    await tx.user_roles.deleteMany({
      where: {
        userId,
        roles: { name: { in: rolesToRemove } }
      }
    });
  }

  // Add new roles
  const rolesToAdd = newRoles.filter(role => !currentRoleNames.includes(role));
  for (const roleName of rolesToAdd) {
    const role = await tx.roles.findFirst({ where: { name: roleName } });
    if (role) {
      await tx.user_roles.create({
        data: { userId, roleId: role.id }
      });
    }
  }
}

/**
 * Format user data for AuthUser interface
 */
private formatAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    keycloakId: user.keycloakId,
    username: user.username,
    email: user.persons?.primaryEmail || user.username,
    roles: user.user_roles_user_roles_userIdTousers?.map((ur: any) => ur.roles.name) || [],
    person: user.persons ? {
      id: user.persons.id,
      firstName: user.persons.firstName,
      lastName: user.persons.lastName,
      displayName: user.persons.displayName || `${user.persons.firstName} ${user.persons.lastName}`,
      profilePictureUrl: user.persons.profilePictureUrl,
      organizationName: user.persons.organizationName,
      position: user.persons.position,
    } : undefined,
  };
}
```

### **3.2 Authentication Routes Enhancement**
**Priority: HIGH**

Add registration routes to `src/modules/auth/auth.routes.ts`:

```typescript
import { UserRegistrationService } from '../user-registration/user-registration.service';

const registrationService = new UserRegistrationService();

// Self-registration endpoint
fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (process.env.ALLOW_SELF_REGISTRATION !== 'true') {
      return reply.code(403).send({
        error: 'Registration disabled',
        message: 'Self-registration is currently disabled'
      });
    }

    const registrationData = request.body as any;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password'];
    for (const field of requiredFields) {
      if (!registrationData[field]) {
        return reply.code(400).send({
          error: 'Missing required field',
          message: `${field} is required`
        });
      }
    }

    const result = await registrationService.registerUser({
      ...registrationData,
      registrationIP: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.code(201).send({
      message: 'Registration request submitted successfully',
      requiresVerification: true,
      registrationId: result.id
    });
  } catch (error) {
    fastify.log.error('Registration error:', error);
    return reply.code(400).send({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

// Email verification endpoint
fastify.get('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { token } = request.query as any;

    if (!token) {
      return reply.code(400).send({
        error: 'Missing token',
        message: 'Verification token is required'
      });
    }

    const result = await registrationService.verifyEmail(token);

    return reply.code(200).send({
      message: result.message,
      requiresApproval: result.requiresApproval || false,
      isFirstUser: result.isFirstUser || false,
      isAdmin: result.isAdmin || false
    });
  } catch (error) {
    fastify.log.error('Email verification error:', error);
    return reply.code(400).send({
      error: 'Email verification failed',
      message: error instanceof Error ? error.message : 'Verification failed'
    });
  }
});

// Get registration status
fastify.get('/registration-status/:email', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email } = request.params as any;

    const request_record = await prisma.user_registration_requests.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        adminApprovalStatus: true,
        createdAt: true,
        expiresAt: true
      }
    });

    if (!request_record) {
      return reply.code(404).send({
        error: 'Registration not found',
        message: 'No registration request found for this email'
      });
    }

    return reply.code(200).send({
      status: request_record.adminApprovalStatus,
      emailVerified: request_record.isEmailVerified,
      createdAt: request_record.createdAt,
      expiresAt: request_record.expiresAt,
      firstName: request_record.firstName
    });
  } catch (error) {
    fastify.log.error('Registration status error:', error);
    return reply.code(500).send({
      error: 'Status check failed',
      message: 'Failed to check registration status'
    });
  }
});

// Admin: Get pending registration requests
fastify.get('/admin/registration-requests', {
  preHandler: [
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Add authentication and admin role check middleware here
      // This is a placeholder - implement based on your auth middleware
      const user = await getUserFromRequest(request);
      if (!user || !user.roles.includes('admin')) {
        return reply.code(403).send({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }
    }
  ]
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requests = await registrationService.getPendingRegistrations();

    return reply.code(200).send({
      requests: requests.map(req => ({
        id: req.id,
        firstName: req.firstName,
        lastName: req.lastName,
        email: req.email,
        organizationName: req.organizationName,
        position: req.position,
        createdAt: req.createdAt,
        registrationIP: req.registrationIP
      }))
    });
  } catch (error) {
    fastify.log.error('Get registration requests error:', error);
    return reply.code(500).send({
      error: 'Failed to get registration requests',
      message: 'Internal server error'
    });
  }
});

// Admin: Approve registration request
fastify.post('/admin/approve-registration/:id', {
  preHandler: [
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Add authentication and admin role check middleware here
      const user = await getUserFromRequest(request);
      if (!user || !user.roles.includes('admin')) {
        return reply.code(403).send({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }
      (request as any).user = user;
    }
  ]
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as any;
    const { roles = ['user'] } = request.body as any;
    const adminUser = (request as any).user;

    const result = await registrationService.approveRegistration(id, adminUser.id, roles);

    return reply.code(200).send(result);
  } catch (error) {
    fastify.log.error('Approve registration error:', error);
    return reply.code(400).send({
      error: 'Approval failed',
      message: error instanceof Error ? error.message : 'Failed to approve registration'
    });
  }
});

// Admin: Reject registration request
fastify.post('/admin/reject-registration/:id', {
  preHandler: [
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Add authentication and admin role check middleware here
      const user = await getUserFromRequest(request);
      if (!user || !user.roles.includes('admin')) {
        return reply.code(403).send({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }
      (request as any).user = user;
    }
  ]
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as any;
    const { reason } = request.body as any;
    const adminUser = (request as any).user;

    if (!reason) {
      return reply.code(400).send({
        error: 'Missing reason',
        message: 'Rejection reason is required'
      });
    }

    const result = await registrationService.rejectRegistration(id, adminUser.id, reason);

    return reply.code(200).send(result);
  } catch (error) {
    fastify.log.error('Reject registration error:', error);
    return reply.code(400).send({
      error: 'Rejection failed',
      message: error instanceof Error ? error.message : 'Failed to reject registration'
    });
  }
});

// Helper function to get user from request (implement based on your auth system)
async function getUserFromRequest(request: FastifyRequest): Promise<any> {
  // This should extract user from JWT token or session
  // Implementation depends on your authentication middleware
  return null; // Placeholder
}
```

---

## 🎨 **PHASE 4: Frontend Registration System**

### **4.1 React Keycloak Integration**
**Priority: HIGH**

Install dependencies:
```bash
cd frontend
npm install @react-keycloak/web keycloak-js
```

Create Keycloak configuration `src/auth/keycloak.ts`:

```typescript
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'tip-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'tip-frontend',
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
```

Create unified auth context `src/contexts/UnifiedAuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { authApi, AuthUser } from '../services/authApi';

interface AuthContextType {
  // User state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Authentication methods
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithKeycloak: () => void;
  logout: () => void;

  // Registration
  register: (userData: RegistrationData) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;

  // Utils
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
  position?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const UnifiedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { keycloak, initialized } = useKeycloak();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialized) {
      initializeAuth();
    }
  }, [initialized, keycloak.authenticated]);

  const initializeAuth = async () => {
    setIsLoading(true);

    try {
      if (keycloak.authenticated && keycloak.token) {
        // User authenticated via Keycloak
        const response = await authApi.login({
          keycloakToken: keycloak.token
        });
        setUser(response.data.user);
        authApi.storeTokens(response.data.sessionToken, response.data.refreshToken);
      } else {
        // Check for existing email-based session
        const token = authApi.getStoredToken();
        if (token) {
          try {
            const userProfile = await authApi.getCurrentUser();
            setUser(userProfile.data);
          } catch (error) {
            // Token invalid, clear storage
            authApi.clearStoredTokens();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      authApi.clearStoredTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await authApi.authenticateWithPassword(email, password);
      setUser(response.data.user);
      authApi.storeTokens(response.data.sessionToken, response.data.refreshToken);
    } catch (error) {
      throw error;
    }
  };

  const loginWithKeycloak = () => {
    keycloak.login({
      redirectUri: `${window.location.origin}/auth/callback`
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      authApi.clearStoredTokens();

      if (keycloak.authenticated) {
        keycloak.logout({
          redirectUri: window.location.origin
        });
      }
    }
  };

  const register = async (userData: RegistrationData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  };

  const verifyEmail = async (token: string) => {
    const response = await fetch(`/api/auth/verify-email?token=${token}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Email verification failed');
    }

    return response.json();
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    loginWithEmail,
    loginWithKeycloak,
    logout,
    register,
    verifyEmail,
    hasRole,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an UnifiedAuthProvider');
  }
  return context;
};
```

### **4.2 Registration Components**
**Priority: HIGH**

Create registration page `src/pages/RegistrationPage.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/UnifiedAuthContext';

export const RegistrationPage: React.FC = () => {
  const [step, setStep] = useState<'form' | 'verification' | 'pending'>('form');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegistrationSuccess = (email: string) => {
    setRegistrationEmail(email);
    setStep('verification');
  };

  const handleVerificationSuccess = (result: any) => {
    if (result.isFirstUser && result.isAdmin) {
      navigate('/dashboard', {
        state: { message: 'Welcome! You are now the platform administrator.' }
      });
    } else {
      setStep('pending');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 'form' && 'Create your account'}
          {step === 'verification' && 'Check your email'}
          {step === 'pending' && 'Registration pending'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'form' && (
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
          )}
          {step === 'verification' && (
            <EmailVerificationStep
              email={registrationEmail}
              onSuccess={handleVerificationSuccess}
            />
          )}
          {step === 'pending' && (
            <ApprovalPendingStep />
          )}
        </div>
      </div>
    </div>
  );
};

const RegistrationForm: React.FC<{onSuccess: (email: string) => void}> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    position: '',
    agreedToTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        organizationName: formData.organizationName.trim() || undefined,
        position: formData.position.trim() || undefined,
      });

      onSuccess(formData.email);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Registration failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name *
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`mt-1 block w-full border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name *
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={`mt-1 block w-full border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address *
        </label>
        <input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`mt-1 block w-full border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password *
        </label>
        <input
          id="password"
          type="password"
          required
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          className={`mt-1 block w-full border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        <p className="mt-1 text-sm text-gray-500">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password *
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          className={`mt-1 block w-full border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>

      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
          Organization
        </label>
        <input
          id="organizationName"
          type="text"
          value={formData.organizationName}
          onChange={(e) => handleInputChange('organizationName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="position" className="block text-sm font-medium text-gray-700">
          Position/Title
        </label>
        <input
          id="position"
          type="text"
          value={formData.position}
          onChange={(e) => handleInputChange('position', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          id="agreedToTerms"
          type="checkbox"
          checked={formData.agreedToTerms}
          onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-900">
          I agree to the{' '}
          <Link to="/terms" className="text-blue-600 hover:text-blue-500">
            Terms and Conditions
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
            Privacy Policy
          </Link>
        </label>
      </div>
      {errors.agreedToTerms && <p className="text-sm text-red-600">{errors.agreedToTerms}</p>}

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
};

const EmailVerificationStep: React.FC<{
  email: string;
  onSuccess: (result: any) => void;
}> = ({ email, onSuccess }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const { verifyEmail } = useAuth();

  // Auto-verify if token is in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      handleVerifyToken(token);
    }
  }, []);

  const handleVerifyToken = async (token: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyEmail(token);
      onSuccess(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Check your email</h3>
      <p className="mt-2 text-sm text-gray-600">
        We've sent a verification link to:
        <br />
        <strong>{email}</strong>
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Click the link in the email to verify your account. The link will expire in 24 hours.
      </p>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isVerifying && (
        <div className="mt-4 text-sm text-gray-600">
          Verifying your email...
        </div>
      )}

      <div className="mt-6 text-sm">
        <p className="text-gray-600">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            className="text-blue-600 hover:text-blue-500 font-medium"
            onClick={() => window.location.reload()}
          >
            try again
          </button>
        </p>
      </div>
    </div>
  );
};

const ApprovalPendingStep: React.FC = () => {
  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
        <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Registration pending approval</h3>
      <p className="mt-2 text-sm text-gray-600">
        Thank you for verifying your email address. Your registration request has been submitted to our administrators for review.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        You'll receive an email notification once your account has been approved and you can log in to the platform.
      </p>

      <div className="mt-6">
        <Link
          to="/login"
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Return to login page
        </Link>
      </div>
    </div>
  );
};
```

### **4.3 Enhanced Login Page**
**Priority: HIGH**

Update login page to support both authentication methods:

```typescript
// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/UnifiedAuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithEmail, loginWithKeycloak } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await loginWithEmail(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeycloakLogin = () => {
    loginWithKeycloak();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-12 w-auto"
          src="/logo.svg"
          alt="TIP Platform"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* SSO Login Button */}
          <button
            onClick={handleKeycloakLogin}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Sign in with SSO
          </button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
          </div>

          {/* Email Login Form */}
          <form className="mt-6 space-y-6" onSubmit={handleEmailLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Create one here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 **PHASE 5: Integration & Deployment**

### **5.1 Email Templates**
**Priority: MEDIUM**

Create email templates in `backend-node/templates/`:

```html
<!-- templates/verification-email.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email - TIP Platform</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to TIP Platform</h1>
        </div>

        <div class="content">
            <p>Hi {{firstName}},</p>

            <p>Thank you for registering with TIP Platform. To complete your registration, please verify your email address by clicking the button below:</p>

            <div style="text-align: center;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">{{verificationUrl}}</p>

            <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>

            <p>After email verification, your account will be reviewed by an administrator before you can access the platform.</p>

            <p>If you didn't create an account with us, please ignore this email.</p>
        </div>

        <div class="footer">
            <p>© 2024 TIP Platform. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

```html
<!-- templates/admin-notification.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New User Registration - TIP Platform</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .user-info { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .button { background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New User Registration Pending</h1>
        </div>

        <div class="content">
            <p>Hello Administrator,</p>

            <p>A new user has registered on the TIP Platform and is awaiting approval. Please review the following details:</p>

            <div class="user-info">
                <h3>User Information</h3>
                <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Organization:</strong> {{organizationName}}</p>
                <p><strong>Position:</strong> {{position}}</p>
                <p><strong>Registration Date:</strong> {{registrationDate}}</p>
            </div>

            <div style="text-align: center;">
                <a href="{{approvalUrl}}" class="button">Review Registration</a>
            </div>

            <p>To approve or reject this registration, please log in to the admin dashboard and navigate to the user management section.</p>

            <p><strong>Note:</strong> The user has already verified their email address and is waiting for administrative approval to access the platform.</p>
        </div>

        <div class="footer">
            <p>© 2024 TIP Platform. All rights reserved.</p>
            <p>This is an automated notification from the TIP Platform user management system.</p>
        </div>
    </div>
</body>
</html>
```

```html
<!-- templates/welcome-email.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to TIP Platform</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .admin-notice { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to TIP Platform!</h1>
        </div>

        <div class="content">
            <p>Congratulations! Your TIP Platform account has been approved and is now active.</p>

            {{adminSection}}

            <p>You can now log in to the platform and start using all available features.</p>

            <div style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Log In Now</a>
            </div>

            <h3>Getting Started</h3>
            <ul>
                <li>Complete your profile information</li>
                <li>Explore the dashboard and available features</li>
                <li>Review the user guide and documentation</li>
                <li>Contact support if you need assistance</li>
            </ul>

            <p>If you have any questions or need help getting started, please don't hesitate to contact our support team.</p>

            <p>Welcome to the TIP Platform community!</p>
        </div>

        <div class="footer">
            <p>© 2024 TIP Platform. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
```

```html
<!-- templates/rejection-email.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registration Update - TIP Platform</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .reason-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Registration Update</h1>
        </div>

        <div class="content">
            <p>Thank you for your interest in the TIP Platform.</p>

            <p>After careful review, we are unable to approve your registration request at this time.</p>

            <div class="reason-box">
                <h3>Reason:</h3>
                <p>{{reason}}</p>
            </div>

            <p>If you believe this decision was made in error or if you have additional information that might change this decision, please contact our support team.</p>

            <p>Thank you for your understanding.</p>
        </div>

        <div class="footer">
            <p>© 2024 TIP Platform. All rights reserved.</p>
            <p>For questions about this decision, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
```

### **5.2 Production Deployment Configuration**
**Priority: HIGH**

```dockerfile
# Update backend-node/Dockerfile for production
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install dependencies (production only in production)
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN if [ "$NODE_ENV" = "production" ] ; then npm ci --only=production ; else npm install ; fi

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create templates directory and copy templates
RUN mkdir -p templates
COPY templates/ ./templates/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/health || exit 1

# Start command
CMD ["npm", "start"]
```

### **5.3 Docker Compose Production Configuration**
**Priority: HIGH**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: tip-postgres-prod
    environment:
      POSTGRES_DB: tip
      POSTGRES_USER: better_service
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./backend-node/database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - tip_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U better_service -d tip"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: tip-redis-prod
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data_prod:/data
    ports:
      - "6379:6379"
    networks:
      - tip_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  mailhog:
    image: mailhog/mailhog:v1.0.1
    container_name: tip-mailhog-prod
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
    networks:
      - tip_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend-node
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: tip-backend-prod
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://better_service:${POSTGRES_PASSWORD}@postgres:5432/tip?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      KEYCLOAK_JWT_PUBLIC_KEY: ${KEYCLOAK_JWT_PUBLIC_KEY}
      KEYCLOAK_BASE_URL: ${KEYCLOAK_BASE_URL}
      KEYCLOAK_REALM: ${KEYCLOAK_REALM}
      KEYCLOAK_CLIENT_ID: ${KEYCLOAK_CLIENT_ID}
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
      SMTP_FROM: noreply@tip-platform.gov
      FRONTEND_URL: ${FRONTEND_URL}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ALLOW_SELF_REGISTRATION: true
      ADMIN_APPROVAL_REQUIRED: true
      EMAIL_VERIFICATION_REQUIRED: true
      FIRST_USER_IS_ADMIN: true
    ports:
      - "3000:3000"
    networks:
      - tip_network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mailhog:
        condition: service_started
    restart: unless-stopped
    volumes:
      - ./backend-node/templates:/app/templates:ro

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
        VITE_BACKEND_URL: ${BACKEND_URL}
        VITE_KEYCLOAK_URL: ${KEYCLOAK_BASE_URL}
        VITE_KEYCLOAK_REALM: ${KEYCLOAK_REALM}
        VITE_KEYCLOAK_CLIENT_ID: tip-frontend
    container_name: tip-frontend-prod
    ports:
      - "80:80"
      - "443:443"
    networks:
      - tip_network
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data_prod:
  redis_data_prod:

networks:
  tip_network:
    driver: bridge
```

---

## 📋 **IMPLEMENTATION TIMELINE**

### **Week 1: Infrastructure Setup (Days 1-3)**
- ✅ Update docker-compose.yml with MailHog and Redis
- ✅ Fix PostgreSQL permissions and run migrations
- ✅ Configure environment variables for all services
- ✅ Test email service integration with MailHog
- ✅ Set up Keycloak public key configuration

### **Week 1: Database & Backend Core (Days 4-7)**
- ✅ Add user registration tables to Prisma schema
- ✅ Implement UserRegistrationService with all workflows
- ✅ Create EmailService with template system
- ✅ Fix Keycloak user creation/lookup in auth service
- ✅ Add all registration API endpoints

### **Week 2: Authentication & Security (Days 8-10)**
- ✅ Complete Keycloak integration fixes
- ✅ Implement role mapping and user sync
- ✅ Add admin approval workflow APIs
- ✅ Security testing and validation
- ✅ Email template creation and testing

### **Week 2: Frontend Integration (Days 11-14)**
- ✅ Install and configure React Keycloak
- ✅ Create unified authentication context
- ✅ Build registration form components
- ✅ Create email verification and approval flows
- ✅ Update login page for dual authentication

### **Week 3: Admin Interface (Days 15-17)**
- ✅ Build admin registration approval interface
- ✅ Add role assignment capabilities
- ✅ Create user management dashboard enhancements
- ✅ Implement notification systems
- ✅ Admin workflow testing

### **Week 3: Testing & Deployment (Days 18-21)**
- ✅ End-to-end testing of registration workflows
- ✅ Keycloak SSO integration testing
- ✅ Production Docker configuration
- ✅ Security audit and performance testing
- ✅ Documentation and deployment guides

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ Users can self-register with email verification
- ✅ First user automatically becomes platform administrator
- ✅ Admin approval workflow functions correctly
- ✅ Keycloak SSO integration creates/updates users properly
- ✅ Email/password authentication works independently
- ✅ Role-based access control enforced throughout

### **Technical Requirements**
- ✅ Docker deployment fully configured
- ✅ Database properly migrated and permissions set
- ✅ SMTP email service integrated and tested
- ✅ Security best practices implemented
- ✅ Error handling comprehensive
- ✅ Performance optimized for production load

### **User Experience Requirements**
- ✅ Registration process is intuitive and clear
- ✅ Email verification works reliably
- ✅ Admin approval interface is efficient
- ✅ Login process supports both authentication methods
- ✅ Error messages are helpful and actionable
- ✅ Loading states and feedback are appropriate

This comprehensive plan addresses all requirements for implementing robust email and Keycloak authentication with self-registration, admin approval, and first-user administrator functionality in a Docker environment.