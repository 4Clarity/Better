# Roles & Feature Access Matrix

**Version:** 1.1
**Author:** Product Owner - Sarah
**Date:** 2025-10-07
**Status:** Specification Document
**Last Updated:** 2025-10-07 - Added Operational Support role

---

## Document Purpose

This specification defines the comprehensive role-based access control matrix for the Transition Intelligence Platform (TIP). It establishes:

- **User Role Definitions** - Clear description of each role's purpose and responsibilities
- **Feature Access Control** - Granular permissions for UI visibility, functional capabilities, and data access
- **User Journey Narratives** - Context-driven workflows that describe what each role accomplishes
- **API & Data Permissions** - Backend access controls that enforce role boundaries
- **Onboarding/Offboarding Flows** - Platform setup and user lifecycle management

This document serves as the authoritative source for implementing role-based access control across:
- Frontend UI element visibility
- API endpoint authorization
- Data-level row/column permissions
- Functional capability access
- Workflow and navigation patterns

---

## Table of Contents

1. [User Role Definitions](#1-user-role-definitions)
2. [Feature Access Matrix](#2-feature-access-matrix)
3. [User Journey Narratives](#3-user-journey-narratives)
4. [UI Visibility Control](#4-ui-visibility-control)
5. [API Access Control](#5-api-access-control)
6. [Data-Level Permissions](#6-data-level-permissions)
7. [Platform Setup & Onboarding Flow](#7-platform-setup--onboarding-flow)
8. [Offboarding Flow](#8-offboarding-flow)
9. [Implementation Guidelines](#9-implementation-guidelines)

---

## 1. User Role Definitions

### 1.1 Admin

**Role Purpose:** System administration, platform configuration, and global oversight

**Key Responsibilities:**
- Complete platform configuration and settings management
- User management across all roles and organizations
- System health monitoring and troubleshooting
- Security policy enforcement and audit oversight
- Platform-wide data access for support and debugging
- Knowledge management system configuration

**Authority Level:** Full system access with override capabilities

**Typical Personas:** System administrators, IT support staff, platform operators

---

### 1.2 Government Program Director

**Role Purpose:** Executive portfolio oversight, resource allocation, and strategic planning across multiple products/programs

**Key Responsibilities:**
- Multi-product/program portfolio management
- Cross-program analytics and risk aggregation
- Resource allocation and budget oversight
- Product assignment to Program Managers
- Executive reporting and strategic decision-making
- High-level compliance and performance monitoring

**Authority Level:** Executive oversight with delegation capabilities

**Typical Personas:** Senior government leadership, portfolio executives, agency directors

---

### 1.3 Program Manager

**Role Purpose:** Operational management of assigned products, transitions, and teams

**Key Responsibilities:**
- Transition creation, oversight, and completion
- Team management and task assignment
- Artifact review and approval
- Compliance monitoring and reporting
- Knowledge source configuration
- Security clearance verification (for assigned teams)

**Authority Level:** Full control over assigned products/transitions

**Typical Personas:** Government contracting officers, program managers, project leads

---

### 1.4 Departing Contractor

**Role Purpose:** Knowledge transfer, artifact submission, and operational handoff

**Key Responsibilities:**
- Transition artifact upload and documentation
- Knowledge documentation and curation
- Task completion for assigned transition activities
- Process documentation and best practices capture
- Handoff coordination with incoming team
- Communication and status updates

**Authority Level:** Contributor access limited to assigned transitions

**Typical Personas:** Outgoing contractor leads, departing team members, knowledge holders

---

### 1.5 Incoming Contractor

**Role Purpose:** Knowledge acquisition, skill development, and operational readiness

**Key Responsibilities:**
- Onboarding activity completion
- Knowledge consumption and learning
- Competency assessment participation
- Security clearance processing
- Question/answer engagement with knowledge base
- Task assignments as readiness progresses

**Authority Level:** Read-focused access with graduated write permissions based on clearance/readiness

**Typical Personas:** New contractor team members, incoming engineers, onboarding personnel

---

### 1.6 Security Officer

**Role Purpose:** Security compliance, access control, and audit monitoring

**Key Responsibilities:**
- PIV status verification and tracking
- Security clearance validation
- Access control configuration and exception management
- Document security classification oversight
- Compliance audit and monitoring
- Security incident investigation

**Authority Level:** Security oversight with elevated audit access

**Typical Personas:** Security compliance officers, clearance adjudicators, audit personnel

---

### 1.7 Observer

**Role Purpose:** Read-only monitoring and stakeholder visibility

**Key Responsibilities:**
- View-only access to assigned transitions/products
- Progress monitoring and status review
- Report viewing (no generation)
- Limited communication (read-only or restricted)
- Compliance oversight (view-only)

**Authority Level:** Read-only access limited to assigned scope

**Typical Personas:** Stakeholders, auditors, oversight personnel, executive observers

---

### 1.8 Operational Support

**Role Purpose:** Ongoing platform-level knowledge management and operational maintenance for active products

**Key Responsibilities:**
- Knowledge base curation and maintenance
- Content organization and categorization
- Document quality assurance and updates
- Knowledge source configuration support
- Operational documentation updates
- Cross-product knowledge consistency
- Support knowledge discovery and search optimization
- Assist with knowledge approval workflows

**Authority Level:** Platform-level knowledge management with broad product access but limited administrative control

**Typical Personas:** Knowledge managers, content curators, technical writers, operational support contractors

**Scope:**
- Works across multiple products in operational (post-transition) mode
- Focuses on living knowledge system maintenance
- Does not have transition management authority
- Cannot modify security classifications or access controls

---

## 2. Feature Access Matrix

### Legend
- ✓ **Full Access** - Complete read/write functionality
- ⚠️ **Limited** - Restricted access with conditions (see notes)
- 👁️ **Read-Only** - View access without modification rights
- ⛔ **No Access** - Feature hidden and inaccessible
- 🔐 **Conditional** - Access based on clearance, PIV status, or other criteria

---

### 2.1 Dashboard & Executive Views

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Main Dashboard** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| **Executive Dashboard** | ✓ | ✓ | 👁️ | ⛔ | ⛔ | 👁️ | ⛔ | ⛔ |
| **Portfolio Overview** | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | 👁️ | ⛔ | 👁️ |
| **Cross-Program Analytics** | ✓ | ✓ | ⛔ | ⛔ | ⛔ | 👁️ | ⛔ | ⛔ |
| **Custom Dashboard Config** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⚠️ | ⛔ | ✓ |

**Notes:**
- **Incoming Contractor Dashboard**: Blocked until security clearance is "Cleared"
- **Program Manager Portfolio**: Only sees assigned products/programs
- **Security Officer Dashboard**: Custom security compliance dashboard
- **Operational Support**: Dashboard shows knowledge management tasks and content health metrics

---

### 2.2 Business Operations

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Transitions - View All** | ✓ | ✓ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⚠️ | 👁️ |
| **Transitions - Create** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Transitions - Edit** | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ⚠️ | ⛔ | ⛔ |
| **Transitions - Archive** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Products & Programs - View** | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ✓ | ⚠️ | ✓ |
| **Products & Programs - Manage** | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Product Assignment** | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Tasks & Milestones - View** | ✓ | ✓ | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ | ⚠️ |
| **Tasks & Milestones - Create** | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ⚠️ | ⛔ | ⚠️ |
| **Tasks & Milestones - Edit** | ✓ | ✓ | ✓ | ⚠️ | ⚠️ | ⚠️ | ⛔ | ⚠️ |

**Notes:**
- **View All Transitions**: Users see only assigned transitions unless role has global view
- **Program Manager**: Can only manage assigned products/programs
- **Departing Contractor**: Can edit tasks assigned to them only
- **Incoming Contractor**: Can view/edit tasks assigned to them after clearance
- **Operational Support**: Can view all products, create/edit knowledge management tasks only

---

### 2.3 Knowledge Management

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Weekly Curation** | ✓ | 👁️ | ✓ | ⚠️ | 🔐 | ✓ | 👁️ | ✓ |
| **Product Documents - Upload** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| **Product Documents - View** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| **Communication Files - Upload** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| **Communication Files - View** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| **Facts Curation** | ✓ | ⚠️ | ✓ | ✓ | ⛔ | ✓ | ⛔ | ✓ |
| **Approval Queue - Manage** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |
| **Approval Queue - View** | ✓ | ✓ | ✓ | 👁️ | 👁️ | ✓ | 👁️ | ✓ |
| **Knowledge Search** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | ✓ |
| **Knowledge Configuration** | ✓ | ⛔ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |

**Notes:**
- **Incoming Contractor Knowledge Access**:
  - With PIV Card + Clearance: Full access to cleared documents
  - PIV Exception: Limited to non-sensitive operational documents only
- **Knowledge Search**: Results filtered by security classification and user clearance
- **Knowledge Configuration**: Program Manager can configure for assigned products only
- **Operational Support**:
  - Primary role for knowledge curation across all products
  - Can manage approval queue for content quality (cannot approve security classifications)
  - Can configure knowledge sources with PM oversight

---

### 2.4 Artifact Vault

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Artifact Upload** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| **Artifact Download** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | 🔐 |
| **Artifact Review** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |
| **Artifact Approve/Reject** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Artifact Delete** | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ✓ | ⛔ | ⚠️ |
| **Security Classification** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Notes:**
- **Incoming Contractor**: Can only upload/download artifacts matching their clearance level
- **Departing Contractor Delete**: Can only delete own uploads before approval
- **Security Classification**: Only Security Officer has full classification authority
- **Operational Support Review**: Can review for quality, not security classification
- **Operational Support Download**: Filtered by security classification
- **Operational Support Delete**: Can only delete own uploads

---

### 2.5 Security & Access Management

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **PIV Status Dashboard** | ✓ | 👁️ | ✓ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| **Clearance Verification** | ✓ | ⚠️ | ⚠️ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| **Access Control Matrix** | ✓ | 👁️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Security Audit Trails** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Exception Management** | ✓ | ⚠️ | ⚠️ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| **Security Incident Response** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Notes:**
- **PIV Status**: Program Managers can view status for assigned team members only
- **Clearance Verification**: Program Director and Manager can verify for assigned personnel
- **Exception Management**: Program roles can request exceptions; only Security Officer approves
- **Incoming Contractor**: Can view own PIV status and exception status
- **Operational Support**: No security management access

---

### 2.6 Administration

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **User Management** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Role Assignment** | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **System Configuration** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⚠️ | ⛔ | ⛔ |
| **Audit Logs - View** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Audit Logs - Export** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Platform Setup** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Integration Management** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |

**Notes:**
- **User Management**: Program Director/Manager can invite/manage users for assigned products only
- **Role Assignment**: Security Officer can assign security-related roles only
- **Audit Logs**: Scoped to user's assigned products/transitions
- **Operational Support**: No administrative access

---

### 2.7 Platform Setup & Onboarding (New Section)

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Initial Platform Setup** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Organization Configuration** | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⚠️ | ⛔ | ⛔ |
| **Product Creation** | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Transition Initialization** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **User Onboarding - Initiate** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **User Onboarding - Complete** | ✓ | ⛔ | ⛔ | ✓ | ✓ | ⛔ | ⛔ | ⛔ |
| **Security Clearance Setup** | ✓ | ⛔ | ⛔ | ⛔ | ⚠️ | ✓ | ⛔ | ⛔ |
| **Knowledge Base Initialization** | ✓ | ⛔ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |

**Notes:**
- **Product Creation**: Program Manager can create sub-products within assigned portfolio
- **User Onboarding Initiate**: Can invite users to assigned products only
- **User Onboarding Complete**: Users complete their own onboarding tasks
- **Security Clearance Setup**: Incoming Contractor can submit documents; Security Officer verifies
- **Operational Support**: No platform setup or onboarding access

---

### 2.8 Offboarding (New Section)

| Feature | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Initiate Offboarding** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Offboarding Checklist** | ✓ | 👁️ | ✓ | ✓ | ⛔ | ✓ | ⛔ | ⛔ |
| **Knowledge Transfer Tasks** | ✓ | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Access Revocation** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Artifact Handoff** | ✓ | ✓ | ✓ | ✓ | ⛔ | ✓ | ⛔ | ⛔ |
| **Exit Interview** | ✓ | ⚠️ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Post-Offboarding Audit** | ✓ | 👁️ | 👁️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Notes:**
- **Initiate Offboarding**: Can only be initiated for users within assigned scope
- **Departing Contractor**: Must complete all offboarding tasks before final access revocation
- **Access Revocation**: Only Security Officer and Admin can revoke access
- **Exit Interview**: Program Manager conducts for assigned team members
- **Operational Support**: No offboarding management access

---

## 3. User Journey Narratives

### 3.1 Admin - Platform Stewardship Journey

**Primary Goal:** Ensure platform availability, security, and optimal performance for all users

**Journey Overview:**

**Phase 1: Platform Initialization (Days 1-7)**
```
Initial Setup → Configure Organizations → Set Security Policies →
Create Admin Users → Configure Integrations → Knowledge System Setup →
Validate System Health → User Training Preparation
```

**Daily Operations Flow:**
```
Morning Health Check → Review Audit Logs → Monitor System Performance →
Address Support Tickets → User Management Tasks →
Security Compliance Review → Evening Backup Verification
```

**Incident Response Flow:**
```
Alert Reception → Impact Assessment → Triage and Prioritization →
Investigation → Resolution Implementation → Communication →
Post-Incident Documentation → Preventive Measures
```

**Key Accomplishments:**
- Platform runs at 99.9% uptime with proactive monitoring
- Users onboarded smoothly with proper access controls
- Security incidents detected and resolved within SLA
- System configuration optimized for performance and compliance
- Comprehensive audit trails maintained for all activities

---

### 3.2 Government Program Director - Executive Oversight Journey

**Primary Goal:** Optimize portfolio performance, allocate resources effectively, and ensure strategic alignment

**Journey Overview:**

**Phase 1: Portfolio Assessment (Week 1)**
```
Portfolio Dashboard Review → Identify High-Risk Programs →
Resource Allocation Analysis → Cross-Program Metrics Review →
Stakeholder Alignment Meetings → Strategic Priority Setting
```

**Weekly Portfolio Management:**
```
Monday Executive Briefing → Portfolio Health Metrics Review →
Risk Escalation Assessment → Resource Reallocation Decisions →
Program Manager Check-ins → Strategic Planning Sessions →
Friday Performance Summary
```

**Quarterly Strategic Planning:**
```
Portfolio Performance Analysis → Capability Gap Identification →
Budget Planning and Allocation → Program Assignment Optimization →
Long-term Strategic Roadmap → Stakeholder Presentations
```

**Key Accomplishments:**
- Comprehensive visibility across all products and programs
- Data-driven resource allocation maximizing ROI
- Early risk identification with proactive mitigation
- Effective Program Manager assignments aligned with capabilities
- Strategic portfolio roadmap aligned with agency goals

---

### 3.3 Program Manager - Operational Excellence Journey

**Primary Goal:** Successfully manage assigned transitions, ensure compliance, and enable team success

**Journey Overview:**

**Phase 1: Transition Initiation (Week 1)**
```
Transition Setup → Define Scope and Timeline → Team Assembly →
Artifact Requirements Definition → Security Clearance Verification →
Kickoff Meeting → Initial Risk Assessment
```

**Phase 2: Active Management (Weeks 2-8)**
```
Daily Status Monitoring → Task Assignment and Tracking →
Artifact Review and Approval → Risk Mitigation →
Team Communication → Compliance Verification →
Weekly Progress Reporting → Stakeholder Updates
```

**Phase 3: Transition Completion (Week 9-12)**
```
Final Artifact Validation → Knowledge Transfer Verification →
Incoming Team Readiness Assessment → Compliance Audit →
Transition Sign-off → Lessons Learned Documentation →
Archive and Closeout
```

**Key Accomplishments:**
- All transitions completed on time and within scope
- 100% compliance with security and regulatory requirements
- Complete knowledge transfer with validated readiness
- Comprehensive audit trail for all activities
- Continuous improvement through lessons learned

---

### 3.4 Departing Contractor - Knowledge Transfer Excellence Journey

**Primary Goal:** Execute comprehensive knowledge transfer ensuring continuity and minimal operational disruption

**Journey Overview:**

**Phase 1: Preparation (Weeks 1-2)**
```
Transition Notification → Access Transition Dashboard →
Review Required Artifacts → Identify Knowledge Gaps →
Organize Documentation → Plan Handoff Activities →
Schedule Knowledge Sessions
```

**Phase 2: Active Knowledge Transfer (Weeks 3-8)**
```
Document Upload and Curation → Process Documentation →
Artifact Submission and Revision → Knowledge Base Contribution →
Hands-on Training Sessions → Q&A Support →
Status Updates and Communication → Address Feedback
```

**Phase 3: Handoff Validation (Weeks 9-10)**
```
Knowledge Validation Sessions → Address Remaining Gaps →
Final Artifact Approval → Handoff Certification →
Post-Transition Support Commitment → Exit Interview →
Access Revocation
```

**Key Accomplishments:**
- All required artifacts submitted, approved, and archived
- Comprehensive process documentation created
- Incoming team validated as operationally ready
- Smooth transition with minimal operational disruption
- Positive exit interview and potential future engagement

---

### 3.5 Incoming Contractor - Operational Readiness Journey

**Primary Goal:** Achieve operational readiness through security clearance, knowledge acquisition, and competency validation

**Journey Overview:**

**Phase 1: Security and Access (Weeks 1-4)**
```
Onboarding Invitation → Account Creation → Security Clearance Initiation →
PIV Card Application → Initial System Access (Limited) →
Security Training → Compliance Acknowledgment
```

**Phase 2A: PIV Exception Path (If Applicable - Weeks 1-8)**
```
PIV Exception Notification → Limited Access Granted →
Non-Sensitive Knowledge Access → Basic Training Modules →
Team Introductions → Skills Assessment (Basic) →
PIV Card Upgrade Tracking → Graduated Access Expansion
```

**Phase 2B: Full Clearance Path (Weeks 4-12)**
```
Clearance Granted → Full System Access → Knowledge Base Deep Dive →
AI Q&A Engagement → Artifact Review → Hands-on Learning →
Competency Assessments → Task Assignments →
Proficiency Validation → Operational Certification
```

**Phase 3: Operational Contribution (Ongoing)**
```
Daily Task Execution → Knowledge Application →
Continuous Learning → Team Collaboration →
Performance Feedback → Skills Development →
Full Operational Integration
```

**Key Accomplishments:**
- Security clearance obtained (or PIV exception managed)
- Comprehensive knowledge base understanding achieved
- Competency assessments passed with proficiency
- Operational tasks executed successfully
- Smooth integration into team workflows

---

### 3.6 Security Officer - Compliance Assurance Journey

**Primary Goal:** Enforce security policies, manage access control, and ensure audit compliance

**Journey Overview:**

**Phase 1: User Security Lifecycle (Ongoing)**
```
Clearance Verification Request → Background Check Coordination →
PIV Status Validation → Access Level Determination →
Exception Evaluation → Access Grant Decision →
Continuous Monitoring → Periodic Re-verification
```

**Phase 2: Document Security Management (Ongoing)**
```
Document Classification Review → Security Tagging Validation →
Access Control Configuration → Sensitive Document Audit →
Classification Disputes Resolution → Compliance Reporting
```

**Phase 3: Incident Response and Audit (As Needed)**
```
Security Alert Review → Incident Investigation →
Access Violation Analysis → Corrective Action Implementation →
Audit Trail Validation → Compliance Reporting →
Policy Enforcement → Preventive Recommendations
```

**Daily Operations:**
```
Morning Security Dashboard Review → PIV Status Updates →
Exception Request Processing → Audit Log Analysis →
Access Control Adjustments → Security Policy Enforcement →
Evening Compliance Summary
```

**Key Accomplishments:**
- 100% clearance verification for sensitive access
- Zero unauthorized access incidents
- Complete audit trail compliance
- Timely PIV exception processing
- Proactive security risk identification and mitigation

---

### 3.7 Observer - Stakeholder Monitoring Journey

**Primary Goal:** Maintain visibility into assigned transitions and programs for oversight and reporting

**Journey Overview:**

**Weekly Monitoring Routine:**
```
Dashboard Access → Review Assigned Transitions →
Monitor Progress Metrics → View Status Reports →
Identify Risks or Issues → Communicate Findings →
Document Observations
```

**Quarterly Oversight Review:**
```
Transition Performance Analysis → Compliance Status Review →
Risk Assessment → Trend Identification →
Stakeholder Briefing Preparation → Recommendations Development
```

**Key Accomplishments:**
- Continuous visibility into assigned programs
- Early identification of risks and issues
- Informed stakeholder reporting and communication
- Evidence-based recommendations for improvements
- Compliance oversight and validation

---

### 3.8 Operational Support - Knowledge Stewardship Journey

**Primary Goal:** Maintain and optimize the living knowledge base across all operational products

**Journey Overview:**

**Phase 1: Knowledge Base Assessment (Week 1)**
```
Access All Products → Review Knowledge Health Metrics →
Identify Content Gaps → Assess Documentation Quality →
Prioritize Curation Tasks → Create Maintenance Plan
```

**Phase 2: Daily Knowledge Management (Ongoing)**
```
Morning Dashboard Review → Knowledge Quality Alerts →
Document Upload and Organization → Content Categorization →
Metadata Enhancement → Duplicate Detection →
Format Standardization → Cross-Reference Linking →
Approval Queue Processing → Search Optimization
```

**Phase 3: Weekly Content Curation**
```
Weekly Curation Session → Review New Content Submissions →
Quality Assurance Checks → Categorization Refinement →
Knowledge Gap Identification → Source Configuration Updates →
Fact Extraction and Organization → Content Recommendations
```

**Phase 4: Monthly Knowledge Optimization**
```
Search Analytics Review → Identify Low-Value Content →
Archive Outdated Documentation → Update Evergreen Content →
Improve Content Discoverability → Knowledge Taxonomy Review →
Collaboration with Program Managers → Report Generation
```

**Content Quality Workflow:**
```
New Document Submitted → Automated Quality Checks →
Manual Review for Completeness → Metadata Validation →
Security Classification Verification (by Security Officer) →
Content Organization → Cross-Product Consistency Check →
Publish to Knowledge Base → Monitor Usage Analytics
```

**Cross-Product Knowledge Management:**
```
Identify Common Patterns → Extract Reusable Templates →
Create Knowledge Snippets → Establish Best Practices →
Share Across Products → Knowledge Transfer Facilitation →
Continuous Improvement Recommendations
```

**Key Accomplishments:**
- Comprehensive knowledge base maintained across all products
- High-quality, well-organized, and discoverable content
- Consistent knowledge structure and categorization
- Proactive identification and resolution of content gaps
- Optimized search and discovery experience for all users
- Cross-product knowledge sharing and best practices
- Continuous improvement of knowledge management processes

**Typical Daily Tasks:**
- Process 20-30 document uploads with metadata enhancement
- Curate 10-15 facts from communication files
- Review and organize approval queue submissions
- Update 5-10 outdated documentation entries
- Configure knowledge sources for 2-3 products
- Respond to knowledge quality issues and user feedback
- Generate weekly knowledge health reports

**Success Metrics:**
- Knowledge base completeness score > 90%
- Average document findability time < 30 seconds
- User satisfaction with search results > 85%
- Knowledge gap closure rate > 80% per quarter
- Cross-product knowledge reuse rate > 60%

---

## 4. UI Visibility Control

### 4.1 Navigation Panel Visibility Matrix

Based on current navigation structure in `Layout.tsx`:

| Navigation Item | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Dashboard** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ✓ | ✓ |
| **Executive Dashboard** | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Business Operations** | ✓ | ✓ | ✓ | ⚠️ | ⚠️ | ✓ | 👁️ | ⚠️ |
| └─ Transitions | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | 👁️ |
| └─ Products & Programs | ✓ | ✓ | ✓ | ⛔ | ⛔ | 👁️ | 👁️ | ✓ |
| └─ Tasks & Milestones | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ⚠️ |
| **Knowledge** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| └─ Weekly Curation | ✓ | ⛔ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| └─ Product Documents | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| └─ Communication Files | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ✓ |
| └─ Facts Curation | ✓ | ⛔ | ✓ | ✓ | ⛔ | ✓ | ⛔ | ✓ |
| └─ Approval Queue | ✓ | ✓ | ✓ | 👁️ | 👁️ | ✓ | 👁️ | ✓ |
| └─ Knowledge Search | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | ✓ |
| **Artifact Vault** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 👁️ | ⚠️ |
| **Security & Access** | ✓ | 👁️ | ✓ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| └─ Knowledge Configuration | ✓ | ⛔ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |
| └─ PIV Status Dashboard | ✓ | 👁️ | ✓ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| └─ Clearance Verification | ✓ | ⚠️ | ⚠️ | ⛔ | 👁️ | ✓ | ⛔ | ⛔ |
| └─ Access Control Matrix | ✓ | 👁️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Administration** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| └─ User Management | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| └─ System Configuration | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⚠️ | ⛔ | ⛔ |

**Conditional Access Rules:**
- 🔐 **Incoming Contractor**: Blocked until `securityStatus === "Cleared"` OR `pivStatus === "PIV_EXCEPTION"` (limited access)
- ⚠️ **Scoped Access**: Only shows items within assigned products/transitions
- 👁️ **Read-Only Mode**: Navigation item visible but all actions are view-only

**Operational Support Notes:**
- Business Operations: View mode for reference
- Transitions: Read-only visibility
- Tasks & Milestones: Knowledge tasks only
- Artifact Vault: Upload/download only
- Knowledge Configuration: Limited access with PM oversight

---

### 4.2 Page-Level Element Visibility

**Dashboard Page:**
- **Admin**: System health widgets, user activity, alerts, audit summary
- **Gov Program Director**: Portfolio health, cross-program metrics, resource allocation, executive KPIs
- **Program Manager**: Assigned transitions, task summary, approval queue, risk alerts
- **Departing Contractor**: My tasks, upload status, handoff progress, timeline
- **Incoming Contractor (Cleared)**: Onboarding progress, assessments, knowledge recommendations, tasks
- **Incoming Contractor (PIV Exception)**: Limited onboarding, PIV upgrade tracker, basic knowledge access
- **Security Officer**: Security compliance dashboard, PIV status summary, access violations, audit alerts
- **Observer**: Assigned transitions summary, progress metrics, status reports

**Transition Detail Page:**
- **Create/Edit Buttons**: Admin, Gov Program Director, Program Manager only
- **Artifact Approval Section**: Admin, Gov Program Director, Program Manager, Security Officer only
- **Upload Artifact Button**: All except Observer (subject to clearance filtering)
- **Delete Transition**: Admin, Gov Program Director, assigned Program Manager only
- **Team Management Section**: Admin, Gov Program Director, Program Manager, Security Officer

**Knowledge Base Pages:**
- **Curation Tools**: Admin, Program Manager, Departing Contractor, Security Officer
- **Approval Queue Management**: Admin, Gov Program Director, Program Manager, Security Officer
- **Configuration Section**: Admin, assigned Program Manager, Security Officer
- **Search Results**: Filtered by clearance level and security classification

---

### 4.3 Action Button Visibility

| Action Button | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|---------------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| **Create Transition** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Edit Transition** | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ⚠️ | ⛔ | ⛔ |
| **Delete Transition** | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Assign Product** | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Upload Artifact** | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| **Approve Artifact** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Reject Artifact** | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Invite User** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Revoke Access** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Verify Clearance** | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Grant PIV Exception** | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| **Export Report** | ✓ | ✓ | ✓ | ⚠️ | ⚠️ | ✓ | ⛔ | ⚠️ |

**Operational Support Notes:**
- Export Report: Knowledge reports only

---

## 5. API Access Control

### 5.1 API Endpoint Authorization Matrix

All API endpoints must validate role-based permissions via middleware. The following matrix defines authorization rules:

#### Authentication & User Management APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/users` | GET | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/users` | POST | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/users/:id` | PATCH | ✓ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⛔ | ⚠️ |
| `/api/users/:id` | DELETE | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/auth/clearance` | POST | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Authorization Rules:**
- ⚠️ **Users API**: Can only access users within assigned products/organizations
- ⚠️ **PATCH Users**: Users can update their own profile; managers can update assigned users
- ⚠️ **Clearance API**: Can only verify clearance for assigned team members
- ⚠️ **Operational Support PATCH**: Own profile only

---

#### Transition Management APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/transitions` | GET | ✓ | ✓ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⚠️ | 👁️ |
| `/api/transitions` | POST | ✓ | ✓ | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/api/transitions/:id` | GET | ✓ | ✓ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⚠️ | 👁️ |
| `/api/transitions/:id` | PATCH | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⚠️ | ⛔ | ⛔ |
| `/api/transitions/:id` | DELETE | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/api/transitions/:id/archive` | POST | ✓ | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |

**Authorization Rules:**
- ⚠️ **GET Transitions**: Users see only assigned transitions
- ⚠️ **PATCH/DELETE**: Only assigned Program Manager can modify
- Incoming Contractor GET access requires `securityStatus === "Cleared"` or `pivStatus === "PIV_EXCEPTION"`
- 👁️ **Operational Support**: Read-only access for reference

---

#### Knowledge Management APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/knowledge/search` | POST | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | ✓ |
| `/api/knowledge/documents` | GET | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | ✓ |
| `/api/knowledge/documents` | POST | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| `/api/knowledge/documents/:id` | DELETE | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ✓ | ⛔ | ✓ |
| `/api/knowledge/approve/:id` | POST | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/knowledge/configuration` | GET | ✓ | ⛔ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |
| `/api/knowledge/configuration` | POST | ✓ | ⛔ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⚠️ |

**Authorization Rules:**
- 🔐 **Knowledge Search**: Results filtered by `securityClassification` vs user `clearanceLevel`
- 🔐 **Documents GET**: PIV Exception users see only `securityClassification === "Unclassified"` documents
- ⚠️ **Configuration**: Program Manager can configure only assigned products
- ⚠️ **Document DELETE**: Departing Contractor can delete own uploads only
- **Operational Support**: Full access to all knowledge endpoints except approve

---

#### Artifact Vault APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/artifacts` | GET | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | 🔐 |
| `/api/artifacts` | POST | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | ⛔ | ✓ |
| `/api/artifacts/:id/download` | GET | ✓ | ✓ | ✓ | ✓ | 🔐 | ✓ | 🔐 | 🔐 |
| `/api/artifacts/:id/approve` | POST | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/artifacts/:id/reject` | POST | ✓ | ✓ | ✓ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/artifacts/:id` | DELETE | ✓ | ✓ | ✓ | ⚠️ | ⛔ | ✓ | ⛔ | ⚠️ |

**Authorization Rules:**
- 🔐 **Artifact Access**: Filtered by security classification matching user clearance level
- 🔐 **PIV Exception**: Can only access artifacts with `requiresPIV === false`
- ⚠️ **DELETE**: Departing Contractor can delete own artifacts before approval only
- 🔐 **Operational Support GET/Download**: Filtered by security classification
- ⚠️ **Operational Support DELETE**: Own uploads only

---

#### Security & Access APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/security/piv-status` | GET | ✓ | ⚠️ | ⚠️ | ⛔ | ⚠️ | ✓ | ⛔ | ⛔ |
| `/api/security/piv-status/:userId` | PATCH | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/security/clearance/:userId` | POST | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/security/exception/:userId` | POST | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/security/exception/:userId/approve` | POST | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/security/audit-logs` | GET | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Authorization Rules:**
- ⚠️ **PIV Status GET**: Can view for assigned team members only; Incoming Contractor can view own status
- ⚠️ **Clearance/Exception POST**: Can request for assigned users; only Security Officer approves
- ⚠️ **Audit Logs**: Scoped to assigned products/transitions
- **Operational Support**: No security API access

---

#### Administration APIs

| Endpoint | Method | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer | Operational Support |
|----------|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|---------------------|
| `/api/admin/system-config` | GET | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⚠️ | ⛔ | ⛔ |
| `/api/admin/system-config` | POST | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/api/admin/audit-export` | POST | ✓ | ⚠️ | ⚠️ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |
| `/api/admin/users/bulk-action` | POST | ✓ | ⚠️ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ | ⛔ |

**Authorization Rules:**
- ⚠️ **System Config GET**: Security Officer has read-only access to security-related configs
- ⚠️ **Audit Export**: Scoped to assigned products/transitions
- ⚠️ **Bulk Actions**: Limited to assigned users only
- **Operational Support**: No administrative API access

---

### 5.2 API Middleware Authorization Logic

**Implementation Pattern:**

```typescript
// Example middleware for role-based endpoint authorization
const authorizeEndpoint = (allowedRoles: string[], scopeCheck?: ScopeCheckFunction) => {
  return async (req, res, next) => {
    const { user } = req; // from auth middleware

    // Check role permission
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check scope (e.g., assigned products/transitions)
    if (scopeCheck && !await scopeCheck(user, req.params, req.body)) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    // Check clearance for sensitive endpoints
    if (req.endpoint.requiresClearance && user.securityStatus !== 'Cleared') {
      return res.status(403).json({ error: 'Security clearance required' });
    }

    next();
  };
};

// Usage
router.get('/api/transitions/:id',
  authorizeEndpoint(
    ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],
    checkTransitionScope
  ),
  getTransitionById
);
```

---

## 6. Data-Level Permissions

### 6.1 Row-Level Security (RLS)

**Principle:** Users should only access data rows they are authorized to see based on role and assignment.

#### Transition Table RLS

```sql
-- Admin: See all transitions
-- Gov Program Director: See all transitions
-- Program Manager: See transitions where user is assigned PM or product is assigned to user
-- Departing Contractor: See transitions where user is assigned as departing team member
-- Incoming Contractor: See transitions where user is assigned as incoming team member (+ clearance check)
-- Security Officer: See all transitions for audit purposes
-- Observer: See transitions where user is assigned as observer

CREATE POLICY transition_access ON transitions
FOR SELECT USING (
  -- Admin and Security Officer see all
  (current_user_role IN ('Admin', 'Security Officer', 'Gov Program Director'))
  OR
  -- Program Manager sees assigned products
  (current_user_role = 'Program Manager' AND product_id IN (SELECT product_id FROM user_product_assignments WHERE user_id = current_user_id))
  OR
  -- Contractors see their assigned transitions
  (current_user_role IN ('Departing Contractor', 'Incoming Contractor') AND id IN (SELECT transition_id FROM transition_team_members WHERE user_id = current_user_id))
  OR
  -- Observers see assigned transitions
  (current_user_role = 'Observer' AND id IN (SELECT transition_id FROM transition_observers WHERE user_id = current_user_id))
);
```

#### Artifact Table RLS

```sql
-- Additional filter: security classification must match user clearance level
CREATE POLICY artifact_access ON artifacts
FOR SELECT USING (
  -- Role-based transition access (same as above)
  (transition_access_check(transition_id, current_user_id, current_user_role))
  AND
  -- Clearance-based security filter
  (
    security_classification = 'Unclassified'
    OR
    (current_user_clearance_level >= classification_level(security_classification))
    OR
    (current_user_role IN ('Admin', 'Security Officer'))
  )
  AND
  -- PIV Exception users only see non-PIV-required documents
  (
    current_user_piv_status = 'PIV_CARD'
    OR
    (current_user_piv_status = 'PIV_EXCEPTION' AND requires_piv = false)
    OR
    (current_user_role IN ('Admin', 'Security Officer'))
  )
);
```

#### Knowledge Document Table RLS

```sql
-- Knowledge documents filtered by product assignment, security classification, and PIV status
CREATE POLICY knowledge_document_access ON knowledge_documents
FOR SELECT USING (
  -- Product assignment check
  (
    product_id IN (SELECT product_id FROM user_product_assignments WHERE user_id = current_user_id)
    OR
    current_user_role IN ('Admin', 'Security Officer', 'Gov Program Director')
  )
  AND
  -- Security classification check
  (
    security_classification = 'Unclassified'
    OR
    (current_user_clearance_level >= classification_level(security_classification))
    OR
    (current_user_role IN ('Admin', 'Security Officer'))
  )
  AND
  -- PIV requirement check
  (
    current_user_piv_status = 'PIV_CARD'
    OR
    (current_user_piv_status = 'PIV_EXCEPTION' AND requires_piv = false)
    OR
    (current_user_role IN ('Admin', 'Security Officer'))
  )
);
```

---

### 6.2 Column-Level Security

Certain sensitive columns should be restricted based on role:

#### User Table Column Access

| Column | Admin | Gov Program Director | Program Manager | Departing Contractor | Incoming Contractor | Security Officer | Observer |
|--------|-------|---------------------|-----------------|---------------------|---------------------|------------------|----------|
| `id` | ✓ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| `email` | ✓ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⛔ |
| `role` | ✓ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| `securityStatus` | ✓ | ⚠️ | ⚠️ | ⛔ | ⚠️ | ✓ | ⛔ |
| `clearanceLevel` | ✓ | ⚠️ | ⚠️ | ⛔ | ⚠️ | ✓ | ⛔ |
| `pivStatus` | ✓ | ⚠️ | ⚠️ | ⛔ | ⚠️ | ✓ | ⛔ |
| `ssn` (if stored) | ✓ | ⛔ | ⛔ | ⛔ | ⛔ | ✓ | ⛔ |
| `personalNotes` | ✓ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⛔ | ⛔ |

**Rules:**
- ⚠️ Scoped to assigned users only
- ⚠️ Incoming Contractor can view own security/PIV status
- ⚠️ Departing Contractor can view own personal info only

---

### 6.3 Query-Level Filtering

All database queries must apply role-based filters:

**Example: Get Transitions Query**

```typescript
async function getTransitions(userId: string, userRole: string) {
  let query = db.transition.findMany();

  if (userRole === 'Admin' || userRole === 'Security Officer' || userRole === 'Gov Program Director') {
    // No additional filtering - see all
  } else if (userRole === 'Program Manager') {
    query = query.where({
      product: {
        assignments: {
          some: { userId, role: 'Program Manager' }
        }
      }
    });
  } else if (userRole === 'Departing Contractor' || userRole === 'Incoming Contractor' || userRole === 'Observer') {
    query = query.where({
      teamMembers: {
        some: { userId }
      }
    });
  }

  return await query;
}
```

---

## 7. Platform Setup & Onboarding Flow

### 7.1 Initial Platform Setup (Admin Only)

**Phase 1: System Initialization**

**Step 1: Environment Configuration**
```
Admin Login → System Health Check → Database Initialization →
Integration Configuration (Keycloak, MinIO, n8n) →
Security Policy Setup → Audit Logging Activation
```

**Step 2: Organization Setup**
```
Create Root Organization → Define Organization Hierarchy →
Set Organization Metadata → Configure Default Settings →
Establish Security Policies
```

**Step 3: Initial User Creation**
```
Create Admin Users → Create Gov Program Director →
Create Security Officer → Set Initial Passwords →
Enable MFA Requirements → Validate Access
```

**Step 4: Knowledge Management Initialization**
```
Configure MinIO Buckets → Set Upload Limits →
Define Document Categories → Configure Security Classifications →
Initialize Knowledge Base Schema
```

---

### 7.2 Product/Program Setup

**Responsible Roles:** Admin, Gov Program Director, Program Manager (assigned)

**Step 1: Product Creation**
```
Navigate to Products & Programs → Create New Product →
Enter Product Metadata (Name, Description, Org) →
Set Security Requirements → Define Access Policies → Save Product
```

**Step 2: Product Assignment**
```
Select Product → Assign Program Manager →
Set Delegation Permissions → Notify Program Manager →
Validate Assignment
```

**Step 3: Product Configuration**
```
Configure Knowledge Sources → Set Artifact Requirements →
Define Transition Templates → Establish Compliance Rules →
Configure Notifications
```

---

### 7.3 User Onboarding Flow

#### 7.3.1 Admin/Security Officer Initiated Onboarding

**Step 1: User Invitation**
```
Navigate to User Management → Click "Invite User" →
Enter User Details (Name, Email, Role) →
Assign to Product/Transition → Set Initial Permissions →
Send Invitation Email
```

**Step 2: User Account Creation**
```
User Receives Invitation Email → Click Activation Link →
Create Password (MFA Setup) → Accept Terms of Service →
Account Activated
```

**Step 3: Role-Specific Setup**

**For Admin:**
```
Complete Profile → Security Training → System Overview →
Access Admin Dashboard → Validate Permissions
```

**For Gov Program Director:**
```
Complete Profile → Portfolio Assignment → Executive Dashboard Tour →
Product Review → Strategic Briefing
```

**For Program Manager:**
```
Complete Profile → Product Assignment Review →
Transition Management Training → Dashboard Orientation →
Team Introduction
```

**For Departing Contractor:**
```
Complete Profile → Transition Assignment →
Review Required Artifacts → Upload Access Granted →
Handoff Timeline Review
```

**For Incoming Contractor (with PIV Card):**
```
Complete Profile → Submit PIV Card Info →
Security Clearance Verification Request →
[WAIT: Security Officer Verification] →
Clearance Approved → Full Dashboard Access →
Knowledge Base Orientation → Assessment Assignment
```

**For Incoming Contractor (PIV Exception Path):**
```
Complete Profile → PIV Exception Request →
Submit Justification → Security Officer Review →
[WAIT: Security Officer Decision] →
Limited Access Granted → PIV Exception Dashboard →
Non-Sensitive Knowledge Access → PIV Card Upgrade Tracker
```

**For Security Officer:**
```
Complete Profile → Security Dashboard Orientation →
PIV Verification Training → Clearance Process Review →
Audit Tool Access → Compliance Briefing
```

**For Observer:**
```
Complete Profile → Assigned Transition/Product Review →
Read-Only Dashboard Access → Reporting Tools Orientation →
Stakeholder Briefing
```

---

#### 7.3.2 Security Clearance Verification (Security Officer)

**Step 1: Clearance Verification Request Received**
```
Security Officer Dashboard → Pending Clearance Requests →
Select User → Review Submitted Documents →
Validate PIV Card (if applicable) →
Cross-Reference Background Check
```

**Step 2: Clearance Decision**
```
Approve Clearance (Set Clearance Level) →
Reject Clearance (Provide Reason) →
Request Additional Information →
Notify User and Program Manager
```

**Step 3: Access Activation**
```
Clearance Approved → Update User Record →
Activate Full Dashboard → Grant Knowledge Access →
Assign Onboarding Tasks → Send Welcome Notification
```

---

#### 7.3.3 PIV Exception Workflow

**Step 1: User Requests PIV Exception**
```
User Dashboard (Limited Access) → Request PIV Exception →
Enter Justification → Submit Request →
Notification Sent to Security Officer
```

**Step 2: Security Officer Review**
```
Security Dashboard → PIV Exception Requests →
Review User Profile → Evaluate Justification →
Assess Risk →
Approve Exception (Set Expiration, Scope) OR Reject Request
```

**Step 3: Exception Activation**
```
Exception Approved → Update User Permissions →
Grant Limited Knowledge Access (Unclassified Only) →
Set Expiration Date → Monitor Usage →
Periodic Re-evaluation
```

**Step 4: PIV Card Upgrade Process**
```
User Submits PIV Card Application → Track Application Status →
PIV Card Received → Submit to Security Officer for Verification →
Security Officer Validates PIV Card → Upgrade User Status →
Expand Access Permissions → Remove Exception Restrictions
```

---

### 7.4 Transition Initialization

**Responsible Roles:** Admin, Gov Program Director, Program Manager

**Step 1: Create New Transition**
```
Navigate to Transitions → Click "Create Transition" →
Enter Transition Details (Name, Type, Timeline) →
Select Associated Product → Define Transition Scope
```

**Step 2: Assign Teams**
```
Assign Departing Team Lead → Assign Incoming Team Lead →
Add Departing Team Members → Add Incoming Team Members →
Assign Observer(s) → Set Security Requirements → Notify All Participants
```

**Step 3: Define Requirements**
```
Select Artifact Templates → Define Milestones →
Assign Tasks → Set Deadlines →
Configure Approval Workflow → Establish Communication Channels
```

**Step 4: Activate Transition**
```
Review Configuration → Validate Team Assignments →
Activate Transition → Send Kickoff Notifications →
Schedule Kickoff Meeting → Monitor Initial Progress
```

---

## 8. Offboarding Flow

### 8.1 Offboarding Initiation

**Responsible Roles:** Admin, Gov Program Director, Program Manager, Security Officer

**Step 1: Initiate Offboarding**
```
Navigate to User Management → Select User → Click "Initiate Offboarding" →
Select Offboarding Reason (Transition Complete, Contract End, Resignation, etc.) →
Set Offboarding Date → Assign Offboarding Coordinator →
Generate Offboarding Checklist
```

**Step 2: Notify User and Stakeholders**
```
System Sends Offboarding Notification to User →
Notify Program Manager → Notify Security Officer →
Notify Incoming Team (if applicable) →
Schedule Exit Interview
```

---

### 8.2 Offboarding Checklist (User Responsibilities)

**For Departing Contractor:**

**Phase 1: Knowledge Transfer (Weeks 1-4)**
```
☐ Upload All Required Artifacts →
☐ Complete Process Documentation →
☐ Finalize Knowledge Base Contributions →
☐ Address All Artifact Feedback →
☐ Submit Final Artifact Package for Approval
```

**Phase 2: Handoff Activities (Weeks 3-6)**
```
☐ Conduct Knowledge Transfer Sessions →
☐ Answer Incoming Team Questions →
☐ Validate Knowledge Completeness →
☐ Complete Handoff Certification →
☐ Provide Post-Transition Support Contact
```

**Phase 3: Exit Activities (Week 7)**
```
☐ Complete Exit Interview →
☐ Return Physical Assets (if applicable) →
☐ Confirm Final Artifact Approval →
☐ Acknowledge Access Revocation Notice →
☐ Provide Feedback on Transition Process
```

---

### 8.3 Offboarding Checklist (Admin/Security Officer Responsibilities)

**Phase 1: Access Review (1 Week Before Offboarding Date)**
```
☐ Review User's Current Access Permissions →
☐ Identify Data/Artifacts Requiring Handoff →
☐ Verify Knowledge Transfer Completion →
☐ Validate Exit Interview Scheduling
```

**Phase 2: Access Transition (Offboarding Date)**
```
☐ Revoke System Login Access →
☐ Disable API Keys and Tokens →
☐ Remove from Active Transitions →
☐ Transfer Ownership of Documents/Tasks →
☐ Archive User Activity Logs
```

**Phase 3: Post-Offboarding Audit (Within 1 Week After)**
```
☐ Verify Access Revocation Complete →
☐ Audit User's Final Activities →
☐ Confirm Knowledge Transfer Adequacy →
☐ Generate Offboarding Report →
☐ Update Compliance Records
```

---

### 8.4 Role-Specific Offboarding Variations

**Admin Offboarding:**
- Transfer system ownership to another Admin
- Document critical system configurations
- Provide administrator knowledge transfer
- Revoke all elevated privileges
- Comprehensive security audit

**Gov Program Director Offboarding:**
- Reassign product portfolio to successor
- Transfer strategic planning documents
- Conduct executive handoff briefing
- Update stakeholder contact information
- Archive executive decision logs

**Program Manager Offboarding:**
- Reassign active transitions to new PM
- Transfer approval authorities
- Handoff team management responsibilities
- Document ongoing risks and issues
- Complete project status documentation

**Security Officer Offboarding:**
- Transfer pending clearance verifications
- Handoff active security incidents
- Document security policies and procedures
- Provide security audit access transfer
- Update security contact information

---

### 8.5 Emergency Offboarding

**Trigger Scenarios:** Immediate termination, security breach, compliance violation

**Immediate Actions (within 1 hour):**
```
Security Officer Notification →
Immediate Account Suspension →
Revoke All Access (API, UI, Integrations) →
Freeze User Data →
Initiate Security Audit →
Notify Program Manager and Director
```

**Follow-Up Actions (within 24 hours):**
```
Conduct Security Investigation →
Review User Activity Logs →
Assess Data Breach Risk →
Notify Legal/Compliance (if required) →
Document Incident →
Plan Knowledge Recovery
```

**Long-Term Actions (within 1 week):**
```
Complete Knowledge Recovery →
Reassign Critical Tasks →
Archive User Records →
Update Security Policies →
Lessons Learned Documentation
```

---

## 9. Implementation Guidelines

### 9.1 Frontend Implementation

**React Component Authorization:**

```typescript
// Example: Role-based component rendering
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';

function TransitionDetailPage() {
  const { user } = useAuth();

  const canEditTransition = hasPermission(user, 'transition:edit', transitionId);
  const canApproveArtifacts = hasPermission(user, 'artifact:approve', transitionId);

  return (
    <div>
      {canEditTransition && <EditTransitionButton />}
      {canApproveArtifacts && <ArtifactApprovalQueue />}
      <TransitionDetails />
    </div>
  );
}
```

**Permission Utility Functions:**

```typescript
// utils/permissions.ts
export function hasPermission(user: User, permission: string, resourceId?: string): boolean {
  // Admin has all permissions
  if (user.role === 'Admin') return true;

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions.includes(permission)) return false;

  // Check scope-based permissions (e.g., assigned products)
  if (resourceId && requiresScope(permission)) {
    return hasResourceScope(user, permission, resourceId);
  }

  return true;
}

export function hasResourceScope(user: User, permission: string, resourceId: string): boolean {
  // Implement scope checking logic
  // Example: Check if user is assigned to the product/transition
  return user.assignedResources.includes(resourceId);
}

export function filterNavigationByRole(user: User): NavigationItem[] {
  // Filter navigation items based on role
  const allNavigation = getFullNavigationStructure();
  return allNavigation.filter(item => {
    return hasPermission(user, `navigation:${item.id}`);
  });
}
```

**Conditional Clearance/PIV Checks:**

```typescript
// Example: Knowledge search with security filtering
async function searchKnowledge(query: string, user: User) {
  const results = await api.knowledge.search(query);

  // Filter results by clearance level
  return results.filter(doc => {
    // Unclassified documents visible to all
    if (doc.securityClassification === 'Unclassified') return true;

    // Admin and Security Officer bypass checks
    if (user.role === 'Admin' || user.role === 'Security Officer') return true;

    // Check clearance level
    if (user.clearanceLevel < doc.classificationLevel) return false;

    // Check PIV requirement
    if (doc.requiresPIV && user.pivStatus !== 'PIV_CARD') return false;

    return true;
  });
}
```

---

### 9.2 Backend Implementation

**Role-Based Middleware:**

```typescript
// middleware/auth.ts
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireClearance = (minLevel: number) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin and Security Officer bypass
    if (req.user.role === 'Admin' || req.user.role === 'Security Officer') {
      return next();
    }

    if (req.user.clearanceLevel < minLevel) {
      return res.status(403).json({ error: 'Insufficient security clearance' });
    }

    next();
  };
};

export const requirePIV = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin and Security Officer bypass
    if (req.user.role === 'Admin' || req.user.role === 'Security Officer') {
      return next();
    }

    if (req.user.pivStatus !== 'PIV_CARD') {
      return res.status(403).json({ error: 'PIV Card required' });
    }

    next();
  };
};

// Usage in routes
router.post('/api/artifacts',
  requireRole(['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer']),
  requireClearance(2), // Example: Clearance level 2 required
  uploadArtifact
);
```

**Database Query Filtering:**

```typescript
// services/transition.service.ts
async function getTransitions(user: User) {
  let whereClause = {};

  if (user.role === 'Admin' || user.role === 'Security Officer' || user.role === 'Gov Program Director') {
    // No filtering - return all
  } else if (user.role === 'Program Manager') {
    whereClause = {
      product: {
        assignments: {
          some: {
            userId: user.id,
            role: 'Program Manager'
          }
        }
      }
    };
  } else if (user.role === 'Departing Contractor' || user.role === 'Incoming Contractor' || user.role === 'Observer') {
    whereClause = {
      teamMembers: {
        some: {
          userId: user.id
        }
      }
    };
  }

  return await prisma.transition.findMany({
    where: whereClause,
    include: {
      product: true,
      teamMembers: true,
      artifacts: true
    }
  });
}
```

**Security Classification Filtering:**

```typescript
// services/knowledge.service.ts
async function searchDocuments(query: string, user: User) {
  let whereClause: any = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } }
    ]
  };

  // Apply security filtering
  if (user.role !== 'Admin' && user.role !== 'Security Officer') {
    whereClause.AND = [
      {
        OR: [
          { securityClassification: 'Unclassified' },
          { classificationLevel: { lte: user.clearanceLevel } }
        ]
      }
    ];

    // PIV filtering
    if (user.pivStatus !== 'PIV_CARD') {
      whereClause.AND.push({ requiresPIV: false });
    }
  }

  // Apply product scope filtering
  if (user.role === 'Program Manager') {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({
      productId: { in: user.assignedProductIds }
    });
  }

  return await prisma.knowledgeDocument.findMany({
    where: whereClause,
    include: {
      product: true,
      uploadedBy: { select: { id: true, name: true } }
    }
  });
}
```

---

### 9.3 Database Schema Enhancements

**User Table Enhancements:**

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Observer';
ALTER TABLE users ADD COLUMN security_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE users ADD COLUMN clearance_level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN piv_status VARCHAR(50) DEFAULT 'No_PIV';
ALTER TABLE users ADD COLUMN piv_exception_expiration TIMESTAMP;
ALTER TABLE users ADD COLUMN onboarding_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE users ADD COLUMN offboarding_status VARCHAR(50);
ALTER TABLE users ADD COLUMN offboarding_date TIMESTAMP;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_security_status ON users(security_status);
CREATE INDEX idx_users_piv_status ON users(piv_status);
```

**Product Assignment Table:**

```sql
CREATE TABLE user_product_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'Program Manager', 'Observer', etc.
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, product_id, role)
);

CREATE INDEX idx_product_assignments_user ON user_product_assignments(user_id);
CREATE INDEX idx_product_assignments_product ON user_product_assignments(product_id);
```

**Document Security Table Enhancements:**

```sql
ALTER TABLE knowledge_documents ADD COLUMN security_classification VARCHAR(50) DEFAULT 'Unclassified';
ALTER TABLE knowledge_documents ADD COLUMN classification_level INTEGER DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN requires_piv BOOLEAN DEFAULT false;

ALTER TABLE artifacts ADD COLUMN security_classification VARCHAR(50) DEFAULT 'Unclassified';
ALTER TABLE artifacts ADD COLUMN classification_level INTEGER DEFAULT 0;
ALTER TABLE artifacts ADD COLUMN requires_piv BOOLEAN DEFAULT false;

CREATE INDEX idx_knowledge_security_classification ON knowledge_documents(security_classification);
CREATE INDEX idx_artifacts_security_classification ON artifacts(security_classification);
```

**Audit Log Table:**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  changes JSONB, -- Store before/after state
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

### 9.4 Testing Requirements

**Unit Tests:**
- Test permission utility functions for all role combinations
- Test scope checking logic (assigned products, transitions)
- Test security classification filtering
- Test PIV status validation

**Integration Tests:**
- Test API endpoint authorization for all roles
- Test data filtering in database queries
- Test navigation rendering based on roles
- Test onboarding/offboarding workflows

**E2E Tests:**
- Test complete user journeys for each role
- Test security clearance and PIV exception flows
- Test artifact upload with security classification
- Test knowledge search with filtered results
- Test admin user management workflows

**Security Tests:**
- Test unauthorized access attempts
- Test privilege escalation attempts
- Test data leakage across security classifications
- Test audit log integrity

---

### 9.5 Documentation Requirements

**For Developers:**
- Role definitions and permission mappings
- API authorization patterns and middleware usage
- Database query filtering examples
- Frontend permission checking utilities

**For Administrators:**
- User role assignment procedures
- Security clearance verification process
- PIV exception approval guidelines
- Offboarding checklist and procedures

**For End Users:**
- Role-specific user guides
- Onboarding instructions by role
- Knowledge base access guidelines
- Security classification understanding

---

## Appendix A: Role Permission Summary

### Admin
- **Full system access** with override capabilities
- All CRUD operations on all resources
- User management, system configuration, audit access
- Bypass security clearance and PIV checks

### Government Program Director
- **Executive portfolio oversight**
- Multi-product visibility and analytics
- Product assignment authority
- Resource allocation and strategic planning
- Limited user management (assigned products)

### Program Manager
- **Operational management** of assigned products/transitions
- Full control within assigned scope
- Team management, artifact approval
- Knowledge configuration for assigned products
- Limited user management (assigned teams)

### Departing Contractor
- **Knowledge transfer contributor**
- Artifact upload and documentation
- Task execution for assigned transitions
- Knowledge base contribution
- Self-service profile management

### Incoming Contractor
- **Knowledge consumer with graduated access**
- Clearance-dependent dashboard access
- PIV-aware knowledge search
- Assessment participation
- Task execution after readiness validation

### Security Officer
- **Security compliance enforcer**
- Clearance verification authority
- PIV status management
- Security classification oversight
- Audit trail access and incident response

### Observer
- **Read-only stakeholder**
- View assigned transitions/products
- Monitor progress and status
- Limited reporting access
- No modification rights

### Operational Support
- **Knowledge management specialist**
- Platform-level knowledge curation and maintenance
- Content organization across multiple products
- Document quality assurance and updates
- Knowledge source configuration support
- No transition management or security administration
- No access to security classifications or access controls

---

## Appendix B: Security Classification Levels

| Level | Classification | Clearance Required | PIV Required | Example Content |
|-------|----------------|-------------------|--------------|-----------------|
| 0 | Unclassified | None | No | Public documentation, general procedures |
| 1 | Internal Use Only | Basic | No | Internal processes, non-sensitive operational docs |
| 2 | Confidential | Secret | Yes | Sensitive operational data, PII |
| 3 | Secret | Secret | Yes | Classified operational information |
| 4 | Top Secret | Top Secret | Yes | Highly classified sensitive information |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-07 | Product Owner - Sarah | Initial specification creation with 7 roles |
| 1.1 | 2025-10-07 | Product Owner - Sarah | Added Operational Support role (role 1.8) with complete feature access matrix, user journey narrative, UI visibility controls, and API access definitions |

---

**END OF SPECIFICATION**
