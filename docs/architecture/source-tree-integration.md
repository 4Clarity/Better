# Source Tree Integration

## Existing Project Structure

```
tip-project/
├── frontend/
│   ├── src/
│   │   ├── components/         # Existing React components
│   │   ├── pages/             # Existing page components
│   │   ├── lib/               # Existing utilities
│   │   └── hooks/             # Existing custom hooks
├── backend-node/
│   ├── src/
│   │   ├── routes/            # Existing API routes
│   │   ├── models/            # Existing Prisma models
│   │   ├── services/          # Existing business logic
│   │   └── middleware/        # Existing middleware
└── documents/                 # Project documentation
```

## New File Organization

```
tip-project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                    # New authentication components
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegistrationForm.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── user-management/         # Enhanced user management components
│   │   │   │   ├── UserInviteModal.tsx
│   │   │   │   ├── UserStatusFilters.tsx
│   │   │   │   └── UserAccessControls.tsx
│   │   │   └── settings/                # New settings components
│   │   │       ├── ProfileSettings.tsx
│   │   │       └── SystemLogsToggle.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx            # New login page
│   │   │   ├── RegisterPage.tsx         # New registration page
│   │   │   └── enhanced-existing/       # Enhanced existing pages
│   │   └── hooks/
│   │       ├── useAuth.tsx              # Enhanced authentication hook
│   │       └── useUserManagement.tsx    # New user management hook
├── backend-node/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth/                    # New authentication routes
│   │   │   │   ├── login.ts
│   │   │   │   ├── logout.ts
│   │   │   │   └── register.ts
│   │   │   └── users/                   # Enhanced user management routes
│   │   │       ├── invite.ts            # Enhanced invitation functionality
│   │   │       └── counts.ts            # Accurate user counting
│   │   ├── services/
│   │   │   ├── AuthenticationService.ts # New authentication service
│   │   │   ├── UserManagementService.ts # Enhanced user management
│   │   │   ├── AuditService.ts          # New audit logging service
│   │   │   └── FeatureFlagService.ts    # New feature flag service
│   │   ├── middleware/
│   │   │   └── enhanced-existing/       # Enhanced existing middleware
│   │   └── models/
│   │       └── enhanced-schema/         # Enhanced Prisma schema
└── docs/                               # Architecture documentation
    ├── prd/                            # Sharded PRD documents
    └── architecture/                   # Sharded architecture documents
```

## Integration Guidelines

- **File Naming:** Follow existing camelCase for TypeScript files, kebab-case for component directories
- **Folder Organization:** Group related functionality in dedicated folders while maintaining existing hierarchy
- **Import/Export Patterns:** Use existing barrel export patterns and maintain consistent import organization