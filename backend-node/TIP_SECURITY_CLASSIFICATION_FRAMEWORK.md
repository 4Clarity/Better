# TIP Security & Classification Framework

## Overview

This document defines the comprehensive security and classification framework for the enhanced TIP platform, providing PIV status tracking, document security classification, automated access control, and comprehensive audit trails.

## PIV Status Tracking & Management

### PIV Status Categories

#### 1. Full PIV/CAC Status
**Definition**: Valid Personal Identity Verification card or Common Access Card
**Verification Method**: Smart card + PIN authentication
**Validity Period**: Based on card expiration (typically 3-6 years)
**Access Level**: Full (within role/clearance constraints)

**Tracking Requirements:**
- Card serial number and issuing authority
- Expiration date with automated renewal notifications
- Last successful authentication timestamp
- Failed authentication attempt counter
- Certificate validity status
- Revocation status check (real-time)

**Implementation Details:**
```json
{
  "pivStatus": "FULL_PIV",
  "cardSerialNumber": "1234567890123456",
  "issuingAuthority": "DoD",
  "expirationDate": "2026-12-31",
  "lastAuthentication": "2024-08-23T10:30:00Z",
  "failedAttempts": 0,
  "certificateStatus": "VALID",
  "revocationChecked": "2024-08-23T10:30:00Z"
}
```

#### 2. PIV Exception - Documented
**Definition**: Formal exception granted due to specific circumstances
**Verification Method**: Multi-factor authentication + documented justification
**Validity Period**: Defined exception period (typically 30-90 days)
**Access Level**: Filtered (sensitive content restricted)

**Tracking Requirements:**
- Exception authorization document
- Exception reason and justification
- Authorizing official information
- Exception period start/end dates
- Review and renewal requirements
- Supervisor attestation

**Implementation Details:**
```json
{
  "pivStatus": "PIV_EXCEPTION_DOCUMENTED",
  "exceptionId": "EXC-2024-001234",
  "authorizingOfficial": "John.Smith@agency.gov",
  "exceptionReason": "CARD_PRODUCTION_DELAY",
  "startDate": "2024-08-01",
  "endDate": "2024-10-01",
  "renewalRequired": true,
  "supervisorAttestation": "Jane.Doe@agency.gov"
}
```

#### 3. PIV Exception - Temporary Emergency
**Definition**: Emergency access granted for operational continuity
**Verification Method**: Enhanced MFA + supervisor approval
**Validity Period**: Short-term (typically 24-72 hours)
**Access Level**: Minimal (essential functions only)

**Tracking Requirements:**
- Emergency justification
- Supervisor approval timestamp
- Maximum access period
- Required review intervals
- Mandatory supervisor check-ins
- Automatic expiration enforcement

**Implementation Details:**
```json
{
  "pivStatus": "PIV_EXCEPTION_EMERGENCY",
  "emergencyId": "EMG-2024-005678",
  "supervisorApproval": "Jane.Doe@agency.gov",
  "approvalTimestamp": "2024-08-23T08:00:00Z",
  "expirationTimestamp": "2024-08-25T08:00:00Z",
  "justification": "SYSTEM_OUTAGE_CRITICAL_OPERATION",
  "checkInRequired": "2024-08-23T20:00:00Z",
  "autoExpire": true
}
```

#### 4. Pending PIV
**Definition**: Individual awaiting PIV card issuance or renewal
**Verification Method**: Alternative credentials + sponsor vouching
**Validity Period**: Processing period (typically 30-60 days)
**Access Level**: Training and basic functions only

**Tracking Requirements:**
- PIV application status
- Sponsor information and vouching
- Processing timeline expectations
- Interim access justification
- Required training completion
- Escalation triggers for delays

### PIV Status Automation

#### Real-Time Status Verification
```javascript
class PIVStatusVerifier {
  async verifyStatus(userId) {
    const user = await this.getUser(userId);
    const pivData = user.pivInformation;
    
    // Check certificate revocation status
    const revocationStatus = await this.checkRevocation(pivData.cardSerialNumber);
    
    // Verify expiration
    const isExpired = new Date() > new Date(pivData.expirationDate);
    
    // Check failed authentication limits
    const isLocked = pivData.failedAttempts >= this.MAX_FAILED_ATTEMPTS;
    
    return {
      isValid: !isExpired && !isLocked && revocationStatus.isValid,
      status: this.calculateStatus(pivData, isExpired, isLocked, revocationStatus),
      restrictions: this.calculateRestrictions(user.role, pivData.pivStatus),
      nextVerification: this.calculateNextVerification(pivData.pivStatus)
    };
  }
}
```

## Document Security Classification System

### Classification Levels

#### Level 0: Public/Unclassified
**Access Control**: Open to all authenticated users
**Marking Requirements**: "Unclassified" or no marking required
**Handling**: Standard IT practices
**Retention**: Standard business retention
**PIV Requirements**: Any valid authentication

**Metadata Structure:**
```json
{
  "classificationLevel": "UNCLASSIFIED",
  "caveatCodes": [],
  "declassificationDate": null,
  "classificationAuthority": null,
  "handlingInstructions": "STANDARD"
}
```

#### Level 1: Sensitive But Unclassified (SBU)
**Access Control**: Role-based restrictions apply
**Marking Requirements**: "Sensitive But Unclassified" banner
**Handling**: Controlled access protocols
**Retention**: Enhanced retention requirements
**PIV Requirements**: Valid PIV or documented exception

**Metadata Structure:**
```json
{
  "classificationLevel": "SBU",
  "caveatCodes": ["FOUO"],
  "sensitivityReasons": ["PERSONAL_INFORMATION"],
  "accessControls": ["ROLE_BASED"],
  "handlingInstructions": "CONTROLLED_ACCESS"
}
```

#### Level 2: Confidential
**Access Control**: Clearance verification required
**Marking Requirements**: "CONFIDENTIAL" banner and markings
**Handling**: Classified information protocols
**Retention**: Classified retention schedules
**PIV Requirements**: Full PIV + clearance verification

**Metadata Structure:**
```json
{
  "classificationLevel": "CONFIDENTIAL",
  "caveatCodes": [],
  "classificationDate": "2024-08-23",
  "classificationAuthority": "John.Smith@agency.gov",
  "declassificationDate": "2034-08-23",
  "accessControls": ["CLEARANCE_REQUIRED"],
  "handlingInstructions": "CLASSIFIED_PROTOCOLS"
}
```

#### Level 3: Secret
**Access Control**: Secret clearance + need-to-know
**Marking Requirements**: "SECRET" banner and portion markings
**Handling**: Secret handling procedures
**Retention**: Classified retention with enhanced controls
**PIV Requirements**: Full PIV + Secret clearance

#### Level 4: Top Secret
**Access Control**: Top Secret clearance + strict need-to-know
**Marking Requirements**: "TOP SECRET" banner and comprehensive markings
**Handling**: Top Secret handling procedures
**Retention**: Maximum security retention
**PIV Requirements**: Full PIV + Top Secret clearance

#### Level 5: Top Secret/SCI
**Access Control**: TS/SCI clearance + compartment access
**Marking Requirements**: "TOP SECRET//SCI" with compartment markings
**Handling**: Special Compartmented Information protocols
**Retention**: Compartmented retention procedures
**PIV Requirements**: Full PIV + TS/SCI clearance + compartment authorization

### Dynamic Classification Engine

```javascript
class DocumentClassificationEngine {
  classifyDocument(document, user) {
    const analysis = this.analyzeContent(document);
    const userClearance = this.getUserClearance(user);
    const pivStatus = this.getPIVStatus(user);
    
    // Determine base classification
    let classification = this.determineClassification(analysis);
    
    // Apply PIV-based restrictions
    if (pivStatus !== 'FULL_PIV') {
      classification = this.applyPIVRestrictions(classification, pivStatus);
    }
    
    // Apply role-based modifications
    classification = this.applyRoleRestrictions(classification, user.role);
    
    // Apply need-to-know principles
    classification = this.applyNeedToKnow(classification, user, document);
    
    return {
      effectiveClassification: classification,
      accessDecision: this.makeAccessDecision(classification, userClearance, pivStatus),
      restrictions: this.calculateRestrictions(classification, user),
      auditRequirements: this.determineAuditRequirements(classification)
    };
  }
}
```

## Automated Access Control System

### Access Control Decision Engine

#### Multi-Factor Access Evaluation
The system evaluates access using multiple factors:

1. **User Authentication Status**
   - PIV status and validity
   - Session authentication level
   - Recent authentication timestamp
   - Authentication method used

2. **User Authorization Profile**
   - Role and authority level
   - Security clearance level and validity
   - Product/project assignments
   - Special authorizations

3. **Document/Resource Classification**
   - Security classification level
   - Special handling requirements
   - Access control markings
   - Need-to-know determinations

4. **Contextual Factors**
   - Access location and network
   - Time of access
   - Recent user behavior patterns
   - System security posture

#### Access Decision Matrix

```javascript
class AccessControlEngine {
  makeAccessDecision(user, resource, context) {
    const factors = {
      pivStatus: this.evaluatePIVStatus(user),
      clearanceStatus: this.evaluateClearanceStatus(user),
      roleAuthorization: this.evaluateRoleAuthorization(user, resource),
      resourceClassification: this.evaluateResourceClassification(resource),
      contextualFactors: this.evaluateContextualFactors(context)
    };
    
    // Apply access control rules in priority order
    const decision = this.applyAccessRules(factors);
    
    // Log decision for audit
    this.logAccessDecision(user, resource, decision, factors);
    
    return decision;
  }
  
  applyAccessRules(factors) {
    // Rule 1: Explicit deny always wins
    if (factors.explicitDeny) return { access: 'DENIED', reason: 'EXPLICIT_DENY' };
    
    // Rule 2: PIV Exception restrictions
    if (factors.pivStatus === 'PIV_EXCEPTION' && factors.resourceClassification >= 'SENSITIVE') {
      return { access: 'DENIED', reason: 'PIV_EXCEPTION_RESTRICTION' };
    }
    
    // Rule 3: Clearance level insufficient
    if (factors.clearanceLevel < factors.requiredClearance) {
      return { access: 'DENIED', reason: 'INSUFFICIENT_CLEARANCE' };
    }
    
    // Rule 4: Role authorization check
    if (!factors.roleAuthorization) {
      return { access: 'DENIED', reason: 'INSUFFICIENT_ROLE_AUTHORIZATION' };
    }
    
    // Rule 5: Need-to-know verification
    if (factors.needToKnow === false) {
      return { access: 'DENIED', reason: 'NEED_TO_KNOW_NOT_ESTABLISHED' };
    }
    
    // Default: Grant access with appropriate restrictions
    return { 
      access: 'GRANTED', 
      restrictions: this.calculateRestrictions(factors),
      monitoring: this.determineMonitoringLevel(factors)
    };
  }
}
```

### Real-Time Access Enforcement

#### Session-Based Controls
- **Dynamic Re-evaluation**: Access decisions re-evaluated periodically during sessions
- **Status Change Reactions**: Immediate access revocation on PIV/clearance status changes
- **Context Monitoring**: Continuous monitoring of access context changes
- **Anomaly Detection**: Automatic flagging of unusual access patterns

#### Content Filtering
```javascript
class ContentFilteringEngine {
  filterContent(content, user, accessDecision) {
    if (accessDecision.access === 'DENIED') {
      return { filtered: true, content: null, reason: accessDecision.reason };
    }
    
    let filteredContent = content;
    
    // Apply PIV-based filtering
    if (user.pivStatus !== 'FULL_PIV') {
      filteredContent = this.applyPIVFiltering(filteredContent, user.pivStatus);
    }
    
    // Apply classification-based filtering
    filteredContent = this.applyClassificationFiltering(
      filteredContent, 
      user.clearanceLevel
    );
    
    // Apply role-based filtering
    filteredContent = this.applyRoleFiltering(filteredContent, user.role);
    
    // Apply need-to-know filtering
    filteredContent = this.applyNeedToKnowFiltering(
      filteredContent, 
      user.assignments
    );
    
    return {
      filtered: content !== filteredContent,
      content: filteredContent,
      filteringApplied: this.getAppliedFilters()
    };
  }
}
```

## Comprehensive Audit Trail System

### Audit Event Categories

#### Authentication Events
- Login attempts (success/failure)
- PIV card authentication
- Multi-factor authentication steps
- Session establishment and termination
- Authentication method changes

#### Authorization Events
- Access control decisions
- Permission grants and denials
- Role changes and assignments
- Clearance status updates
- PIV status modifications

#### Data Access Events
- Document views, downloads, prints
- Search queries and results
- Database queries and responses
- API calls and responses
- Content filtering applications

#### Administrative Events
- User account modifications
- Security policy changes
- System configuration updates
- Audit log access
- Emergency access grants

### Audit Log Structure

```json
{
  "eventId": "evt_1692781800_001234",
  "timestamp": "2024-08-23T10:30:00.123Z",
  "eventType": "DOCUMENT_ACCESS",
  "eventCategory": "DATA_ACCESS",
  "severity": "INFO",
  "user": {
    "userId": "user_12345",
    "username": "john.doe@agency.gov",
    "pivStatus": "FULL_PIV",
    "clearanceLevel": "SECRET",
    "role": "PROGRAM_MANAGER"
  },
  "resource": {
    "resourceId": "doc_67890",
    "resourceType": "DOCUMENT",
    "classification": "CONFIDENTIAL",
    "owner": "jane.smith@agency.gov"
  },
  "action": {
    "operation": "VIEW",
    "outcome": "SUCCESS",
    "accessDecision": "GRANTED",
    "restrictions": ["NO_PRINT", "SESSION_TIMEOUT_30MIN"]
  },
  "context": {
    "sessionId": "sess_1692781800_5678",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "location": "HEADQUARTERS",
    "networkSegment": "SECURE_NETWORK"
  },
  "metadata": {
    "processingTime": "0.045s",
    "riskScore": 2,
    "anomalyFlags": [],
    "correlationId": "corr_1692781800_9012"
  }
}
```

### Audit Analytics and Monitoring

#### Real-Time Monitoring
```javascript
class AuditMonitoringEngine {
  processAuditEvent(event) {
    // Real-time risk scoring
    const riskScore = this.calculateRiskScore(event);
    
    // Anomaly detection
    const anomalies = this.detectAnomalies(event);
    
    // Pattern correlation
    const patterns = this.correlatePatterns(event);
    
    // Automatic alerting
    if (riskScore > this.ALERT_THRESHOLD) {
      this.generateSecurityAlert(event, riskScore, anomalies);
    }
    
    // Update user behavior profile
    this.updateUserProfile(event.user.userId, event);
    
    // Store for compliance reporting
    this.storeForCompliance(event);
  }
  
  detectAnomalies(event) {
    const anomalies = [];
    
    // Check for unusual access patterns
    if (this.isUnusualTimeAccess(event)) {
      anomalies.push('UNUSUAL_TIME_ACCESS');
    }
    
    // Check for unusual location
    if (this.isUnusualLocationAccess(event)) {
      anomalies.push('UNUSUAL_LOCATION_ACCESS');
    }
    
    // Check for bulk access patterns
    if (this.isBulkAccessPattern(event)) {
      anomalies.push('BULK_ACCESS_PATTERN');
    }
    
    // Check for privilege escalation attempts
    if (this.isPrivilegeEscalationAttempt(event)) {
      anomalies.push('PRIVILEGE_ESCALATION_ATTEMPT');
    }
    
    return anomalies;
  }
}
```

#### Compliance Reporting

**Automated Compliance Reports:**
- Daily security events summary
- Weekly access pattern analysis
- Monthly PIV compliance status
- Quarterly clearance verification report
- Annual security audit preparation

**Report Structure:**
```json
{
  "reportId": "compliance_2024_08_weekly",
  "reportType": "WEEKLY_ACCESS_ANALYSIS",
  "period": {
    "startDate": "2024-08-17",
    "endDate": "2024-08-23"
  },
  "summary": {
    "totalEvents": 15847,
    "securityEvents": 23,
    "accessViolations": 0,
    "pivExceptions": 5,
    "clearanceIssues": 2
  },
  "details": {
    "pivStatusBreakdown": {
      "FULL_PIV": 95.2,
      "PIV_EXCEPTION": 4.5,
      "PENDING_PIV": 0.3
    },
    "accessPatterns": {
      "normalAccess": 99.1,
      "unusualAccess": 0.9,
      "deniedAccess": 0.3
    },
    "riskIndicators": [
      {
        "indicator": "AFTER_HOURS_ACCESS",
        "count": 45,
        "riskLevel": "LOW"
      }
    ]
  }
}
```

## Security Integration Points

### External Security Systems

#### PIV/CAC Infrastructure Integration
- **FICAM Compliance**: Federal Identity, Credential, and Access Management
- **Certificate Validation**: Real-time certificate status checking
- **Revocation Checking**: OCSP and CRL validation
- **Federation Support**: Cross-agency authentication support

#### Clearance Database Integration
- **JPAS Integration**: Joint Personnel Adjudication System
- **Automated Verification**: Regular clearance status updates
- **Investigation Tracking**: Security investigation status monitoring
- **Reciprocity Support**: Cross-agency clearance recognition

#### Security Information Systems
- **SIEM Integration**: Security Information and Event Management
- **Threat Intelligence**: Integration with threat intelligence feeds
- **Incident Response**: Automated incident response triggering
- **Vulnerability Management**: Integration with vulnerability scanners

### Implementation Architecture

#### Security Service Layer
```javascript
class SecurityServiceLayer {
  constructor() {
    this.pivService = new PIVValidationService();
    this.clearanceService = new ClearanceVerificationService();
    this.classificationService = new DocumentClassificationService();
    this.accessControlService = new AccessControlService();
    this.auditService = new AuditTrailService();
  }
  
  async authorizeAccess(user, resource, context) {
    // Validate PIV status
    const pivValidation = await this.pivService.validate(user.pivToken);
    if (!pivValidation.isValid) {
      return this.denyAccess('PIV_INVALID', pivValidation.reason);
    }
    
    // Verify clearance
    const clearanceStatus = await this.clearanceService.verify(user.clearanceId);
    if (!clearanceStatus.isValid) {
      return this.denyAccess('CLEARANCE_INVALID', clearanceStatus.reason);
    }
    
    // Classify resource
    const classification = await this.classificationService.classify(resource);
    
    // Make access control decision
    const accessDecision = await this.accessControlService.decide(
      user, resource, classification, context
    );
    
    // Log the decision
    await this.auditService.log({
      user, resource, classification, accessDecision, context
    });
    
    return accessDecision;
  }
}
```

This comprehensive security and classification framework provides the foundation for secure, compliant, and auditable operations while supporting the diverse needs of government and contractor users with varying security statuses and clearance levels.