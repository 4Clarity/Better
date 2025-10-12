# Security & Access Assessment

## Current State
Comprehensive user management and access control system.

**Key Features:**
- **User Management:**
  - User list with status filtering (Active, Pending, Suspended, Deactivated)
  - User cards showing role, contact info, security clearance, PIV status
  - User invite workflow with detailed form:
    - Personal information (name, job title)
    - Contact information (email, phone, location)
    - Security information (clearance level)
    - User account (username, password generation)
    - Role assignment (multiple roles)
    - Organization affiliation
- **Transition User Management:**
  - Manage user access per active transition
  - Team member count and pending access requests
  - Transition-scoped user assignment
- **Access Management Tab** (mentioned but not shown)
- **Security Dashboard Tab** (mentioned but not shown)

## User Role Perspective

### System Admin (Primary User)
- **Needs:**
  - Create and manage user accounts
  - Assign roles and permissions
  - Monitor security compliance
  - Audit user access and activity
  - Manage security clearances and PIV status
- **Current strengths:** Comprehensive user creation form, status management
- **Gaps:** No bulk user operations, limited audit trail visibility

### Program Manager
- **Needs:**
  - Request access for team members
  - View team access levels
  - Temporary access for contractors during transitions
- **Current strengths:** Transition-scoped user management
- **Gaps:** No self-service team management

### Project Director
- **Needs:**
  - Overview of all users and access levels
  - Compliance reporting
  - Access certification/recertification
- **Gaps:** No compliance dashboard or reporting

### Contractors
- **Needs:**
  - Request access to specific transitions/knowledge
  - Understand their access level
  - Self-service profile updates
- **Gaps:** No user-facing profile or access request interface

## Flow Classification

**Primary Flow:** Configuration/Setup (Initial user provisioning)

**Secondary Flows:**
1. **Operational:** Adding users to transitions, managing team access
2. **Steady-State:** Monitoring access, compliance checks, access reviews

## Recommendations

### Streamlining Opportunities

1. **Separate Admin from User Functions:**

   **Security Admin Section (System Admin only):**
   - All Users management
   - Invite new users
   - Deactivate/suspend accounts
   - Security Dashboard
   - Access Management (global)

   **Team Management (Program Manager):**
   - Add users to my transitions
   - Request access for team members
   - View team access levels
   - Simplified, scoped to their programs

   **My Profile (All Users):**
   - View my information
   - Update contact details
   - See my access levels and transitions
   - Request additional access

2. **Simplify User Invitation:**
   - Current form is very long
   - Recommend wizard approach:
     - Step 1: Basic Info (name, email, role)
     - Step 2: Security Info (clearance, PIV)
     - Step 3: Organization & Access
   - Allow "invite and configure later" for quick adds
   - Bulk invite capability (CSV upload)

3. **Role-Based Access Control (RBAC):**
   - Current roles shown: Program Manager, Program Director, Departing Contractor, Incoming Contractor, Security Officer, Observer
   - Clarify permissions for each role
   - Show what access each role grants
   - Allow custom roles or permission sets

4. **Transition Access Workflow:**
   - When new transition created, auto-suggest team members
   - One-click add from contract team
   - Temporary access (auto-expire when transition completes)
   - Access request and approval workflow

5. **Security Compliance Features:**
   - Security clearance expiration tracking
   - PIV status monitoring
   - Access certification (periodic review)
   - Least privilege enforcement
   - Unused account detection

### Integration Touchpoints

1. **With Transitions:**
   - Transition team membership managed here
   - Access to transition details and knowledge based on team assignment
   - Auto-notification when added to transition

2. **With Knowledge Platform:**
   - Knowledge access tied to transition/contract team membership
   - Clearance level gates access to sensitive knowledge
   - Audit trail of knowledge access

3. **With Keycloak (Auth System):**
   - User accounts created here sync to Keycloak
   - Role assignments propagate to authentication system
   - SSO integration for government users

4. **With Contracts/Operations:**
   - Contract team members define base access
   - Business operation stakeholders get automatic access
   - Clear hierarchy of access inheritance

### Enhanced Features

1. **User Onboarding Workflow:**
   - User invited → receives email → sets password → completes profile
   - Guided tour of application
   - Auto-assignment to relevant transitions based on role/contract
   - Welcome package with getting started materials

2. **Access Request & Approval:**
   - Users can request access to specific transitions or knowledge
   - Approval workflow (Program Manager approves)
   - Time-limited access grants
   - Justification and audit trail

3. **Security Dashboard (Admin):**
   - Active users count
   - Pending access requests
   - Expiring clearances
   - Recent security events
   - Compliance metrics

4. **Audit & Reporting:**
   - User activity log
   - Access grant/revoke history
   - Login history and anomaly detection
   - Export user access reports for compliance

## UI Focus Areas
- Simplify user invitation (wizard, progressive disclosure)
- Add "My Profile" for all users
- Create Program Manager view for team management (not full admin)
- Implement Security Dashboard with metrics and alerts
- Add access request workflow UI
- Bulk user operations (invite, activate, deactivate)
- Better visual indication of user status and security clearance
- Mobile-friendly user directory and profile viewing
- Integration with Keycloak for seamless auth

## Key Recommendations Summary
1. Separate System Admin functions from Program Manager team management
2. Simplify user creation with wizard approach
3. Implement self-service access requests
4. Add compliance monitoring and reporting
5. Auto-grant access based on transition/contract team membership
