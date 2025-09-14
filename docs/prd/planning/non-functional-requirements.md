# Non-Functional Requirements (NFRs)

**Summary:** This document consolidates the critical non-functional requirements for the Transition Intelligence Platform (TIP) MVP. These requirements define the essential quality attributes of the system, including security, auditability, and usability.

---

## 1. Security

- **Requirement:** The platform must enforce strict Role-Based Access Control (RBAC).
- **Source:** [`prd.md`](documents/prd.md:50)
- **Business Rule:** `SEC-001` - User access to the platform must be role-based (Program Manager, Outgoing Contractor, Incoming Contractor).

- **Requirement:** Incoming contractors must not be able to access any data until their status in the `Onboarding Readiness Tracker` is "Cleared."
- **Source:** [`prd.md`](documents/prd.md:50)
- **Business Rule:** `SEC-002` - Incoming contractors must not be able to access any project data until their security status is explicitly marked as "Cleared" by a Program Manager.

- **Requirement:** All data must be encrypted at rest and in transit.
- **Source:** [`prd.md`](documents/prd.md:50)
- **Business Rule:** `SEC-003` - All data within the platform must be encrypted at rest and in transit.

---

## 2. Auditability

- **Requirement:** Every action (document upload, approval, status change) must be logged in an immutable audit trail.
- **Source:** [`prd.md`](documents/prd.md:51)
- **Business Rule:** `AUD-001` - Every user action, including document uploads, status changes, approvals, and rejections, must be logged in an immutable audit trail.

---

## 3. Usability & Accessibility

- **Requirement:** The interface must be intuitive, requiring minimal training for all user personas.
- **Source:** [`prd.md`](documents/prd.md:52)
- **UX Principle:** "Zero-Training Onboarding" - The interface must be clean and self-explanatory. Every action should be intuitive. ([`frontend_spec.md`](documents/frontend_spec.md:11))

- **Requirement:** The front-end must be developed to meet WCAG 2.1 AA standards.
- **Description:** This includes ensuring usability for people with disabilities through keyboard navigation, screen reader compatibility, and sufficient color contrast.
- **Source:** [`frontend_spec.md`](documents/frontend_spec.md:84)

---

## 4. Technical & Architectural

- **Requirement:** The solution must be built using the enterprise-approved, self-hosted, open-source technology stack.
- **Description:** This includes React, Fastify (Node.js), FastAPI (Python), PostgreSQL, MinIO, Redis, and Keycloak for authentication.
- **Source:** [`tech_stack.md`](documents/tech_stack.md), [`systems_catalog.md`](documents/systems_catalog.md)

- **Requirement:** All authentication must be handled by the enterprise's self-hosted Keycloak instance.
- **Source:** [`systems_catalog.md`](documents/systems_catalog.md:42)

- **Requirement:** All code must pass static analysis checks (ESLint/Prettier, ruff/bandit, semgrep).
- **Source:** [`systems_catalog.md`](documents/systems_catalog.md:44)