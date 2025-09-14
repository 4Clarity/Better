# TIP Platform Authentication Services

This document describes the EmailService and UserRegistrationService implementation for the TIP Platform authentication system.

## EmailService

The EmailService handles all email communications for the authentication flow using nodemailer and MailHog.

### Features

- **Email Verification**: Sends verification emails with secure tokens
- **Admin Notifications**: Notifies administrators of pending registrations
- **Welcome Emails**: Sends welcome messages to approved users
- **Rejection Emails**: Notifies users of rejected registrations
- **Template System**: Uses HTML email templates with fallbacks
- **MailHog Integration**: Works with MailHog for development/testing

### Usage

```typescript
import { EmailService } from './email.service';

const emailService = new EmailService();

// Send verification email
await emailService.sendVerificationEmail(
  'user@example.com',
  'verification-token',
  'John'
);

// Send admin notification
await emailService.sendAdminNotification(
  ['admin@example.com'],
  userData
);

// Test email connection
const isConnected = await emailService.testConnection();
```

### Environment Variables

```bash
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@tip-platform.gov"
SMTP_SECURE=false
FRONTEND_URL=http://localhost:5173
```

## UserRegistrationService

The UserRegistrationService implements the complete user registration workflow with email verification and admin approval.

### Features

- **Self-Registration**: Users can register with email/password
- **Email Verification**: Email verification with secure tokens (24-hour expiry)
- **First User Admin**: First user automatically becomes admin
- **Admin Approval Workflow**: Admins approve/reject new registrations
- **Password Security**: bcrypt hashing with 12 rounds, strength validation
- **Data Validation**: Comprehensive input validation
- **Role Assignment**: Automatic role assignment during approval
- **Request Management**: Track and manage registration requests

### Registration Flow

1. **User Registration**: User submits registration form
2. **Email Verification**: User clicks email verification link
3. **Admin Approval** (if not first user): Admin approves/rejects registration
4. **Account Creation**: User account created in database
5. **Welcome Email**: Welcome email sent to user

### Usage

```typescript
import { UserRegistrationService } from './user-registration.service';

const registrationService = new UserRegistrationService();

// Register new user
const result = await registrationService.registerUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'SecurePassword123!',
  organizationName: 'Example Corp',
  position: 'Developer'
});

// Verify email
const verification = await registrationService.verifyEmail('token');

// Admin approve registration
await registrationService.approveRegistration(
  'request-id',
  'admin-id',
  ['user', 'program_manager']
);

// Get pending requests (admin only)
const pendingRequests = await registrationService.getPendingRegistrations();
```

### Database Tables

The service uses the `user_registration_requests` table:

```sql
CREATE TABLE user_registration_requests (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  firstName VARCHAR NOT NULL,
  lastName VARCHAR NOT NULL,
  organizationName VARCHAR,
  position VARCHAR,
  verificationToken VARCHAR UNIQUE,
  isEmailVerified BOOLEAN DEFAULT FALSE,
  verificationTokenExpiry TIMESTAMP,
  adminApprovalStatus approval_status DEFAULT 'PENDING',
  approvedBy VARCHAR,
  approvedAt TIMESTAMP,
  rejectedReason TEXT,
  passwordHash VARCHAR NOT NULL,
  registrationIP VARCHAR,
  userAgent VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP,
  expiresAt TIMESTAMP
);
```

## Security Features

### Password Security
- Minimum 8 characters, maximum 128 characters
- Requires 3 of: lowercase, uppercase, numbers, special characters
- Blocks common weak passwords
- bcrypt hashing with 12 rounds

### Token Security
- Cryptographically secure random tokens (256-bit)
- Time-limited tokens (24-hour expiry for verification)
- Unique tokens per request

### Input Validation
- Email format validation
- Required field validation
- Length limits on all fields
- Protection against injection attacks

### Rate Limiting & Abuse Prevention
- Request expiry (48 hours)
- Automatic cleanup of expired requests
- IP address tracking for audit

## Error Handling

All services implement comprehensive error handling:

```typescript
try {
  await registrationService.registerUser(userData);
} catch (error) {
  // Handle specific errors:
  // - Email already registered
  // - Validation failed
  // - Email sending failed
  console.error('Registration failed:', error.message);
}
```

## Testing

Both services include comprehensive unit tests:

```bash
npm test src/services/__tests__/email.service.test.ts
npm test src/services/__tests__/user-registration.service.test.ts
```

## Environment Setup

### Development with MailHog

1. **Start MailHog**:
   ```bash
   docker-compose up mailhog
   ```

2. **Access MailHog UI**: http://localhost:8025

3. **Set Environment Variables**:
   ```bash
   SMTP_HOST=mailhog
   SMTP_PORT=1025
   SMTP_FROM=noreply@tip-platform.gov
   ```

### Production Setup

For production, replace MailHog with your SMTP provider:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=true
```

## Integration with Authentication System

These services integrate with the existing AuthenticationService:

1. **Registration** → UserRegistrationService
2. **Email Verification** → UserRegistrationService
3. **User Creation** → Prisma database operations
4. **Login** → AuthenticationService
5. **Role Management** → Existing role system

The services follow the existing patterns in the auth.service.ts for consistency and compatibility.