# Roadmap Persona User Credentials

This document contains the login credentials for the three transition management system persona users created for testing and demonstration.

## Created User Accounts

### 1️⃣ Government Program Manager - Garry Grove

**Login Details:**
- **Username:** `Garry.Grove@usdoj.gov`
- **Password:** `garygrove`
- **Name:** Garry Grove
- **Organization:** Department of Justice (DOJ)
- **Role:** Government_Program_Manager
- **Security Clearance:** Secret
- **Job Title:** Government Program Manager
- **Location:** Washington, DC

**Permissions:**
- View all transitions
- Create and manage transitions
- Manage stakeholders
- Approve artifacts
- Generate roadmaps
- Manage knowledge curation

**Persona Description:**
Experienced government program manager specializing in contract transitions and knowledge continuity. Responsible for oversight, stakeholder coordination, and ensuring smooth operational handovers.

---

### 2️⃣ Outgoing Contractor - Henry Hou

**Login Details:**
- **Username:** `Henry.Hou@outbound.com`
- **Password:** `henryhou`
- **Name:** Henry Hou
- **Organization:** Outbound Solutions Inc
- **Role:** Outgoing_Contractor
- **Security Clearance:** Secret
- **Job Title:** Senior Systems Engineer
- **Location:** Arlington, VA
- **Contract End Date:** January 31, 2025

**Permissions:**
- View assigned transitions
- Upload artifacts
- Document knowledge
- Create knowledge articles
- View transition tasks

**Persona Description:**
Senior systems engineer with deep expertise in government IT infrastructure and operational continuity. Currently transitioning off contract, responsible for thorough knowledge transfer and documentation.

---

### 3️⃣ Incoming Contractor - Ian Illum

**Login Details:**
- **Username:** `Ian.Illum@inbound.com`
- **Password:** `ianillum`
- **Name:** Ian Illum
- **Organization:** Inbound Technologies LLC
- **Role:** Incoming_Contractor
- **Security Clearance:** Public Trust (Secret clearance in progress)
- **Job Title:** Systems Integration Specialist
- **Location:** Reston, VA
- **Contract Start Date:** November 1, 2024

**Permissions:**
- View assigned transitions
- View knowledge base
- Query AI assistant
- View learning roadmap
- Complete training modules

**Persona Description:**
Systems integration specialist eager to learn and contribute to government IT operations. New to the contract, following a personalized learning path to gain operational capability.

---

## Testing the Roadmap UI

These users represent the three key personas in the Transition Management System wireframe:

1. **Garry Grove (Gov PM)** - Uses the Government PM interface to:
   - Monitor all active transitions
   - Review knowledge curation queue
   - Generate transition roadmaps
   - Assign personnel and manage stakeholders

2. **Henry Hou (Outgoing)** - Uses the Outgoing Contractor interface to:
   - Complete task transition checklists
   - Upload work documentation
   - Create knowledge articles
   - Verify handover completion

3. **Ian Illum (Incoming)** - Uses the Incoming Contractor interface to:
   - Follow personalized learning roadmap
   - Master required operational elements
   - Query AI knowledge assistant
   - Access contextual learning resources

---

## Quick Login Test

To verify the accounts work:

```bash
# Option 1: Use the frontend login at http://tip.localhost
# Enter username and password for any of the three users

# Option 2: Test via API (if auth bypass is enabled)
curl -X POST http://api.tip.localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Garry.Grove@usdoj.gov",
    "password": "garygrove"
  }'
```

---

## Related Documentation

- **Wireframe:** `/Assement/Roadmap/transition_wireframe.html`
- **Frontend Spec:** `/Assement/Roadmap/roadmap-ui-frontend-spec.md`
- **Seed Script:** `/backend-node/scripts/seed-roadmap-personas.js`

---

## Database Information

**Organizations Created:**
- Department of Justice (DOJ) - Government Agency
- Outbound Solutions Inc - Prime Contractor (departing)
- Inbound Technologies LLC - Prime Contractor (incoming)

**Roles Created:**
- Government_Program_Manager
- Outgoing_Contractor
- Incoming_Contractor
- User (base role for all users)

---

**Created:** October 13, 2025
**Script:** `seed-roadmap-personas.js`
**Status:** ✅ Successfully seeded
