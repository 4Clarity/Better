# TIP Business Rules

This document catalogs the core business rules for the Transition Intelligence Platform (TIP) MVP, as extracted from the project documentation.

| Rule ID | Rule Description | Source Document(s) | Impacted Features |
|---|---|---|---|
| **SEC-001** | User access to the platform must be role-based (Program Manager, Outgoing Contractor, Incoming Contractor). | `prd.md`, `frontend_spec.md` | Core Platform Access, All Features |
| **SEC-002** | Incoming contractors must not be able to access any project data until their security status is explicitly marked as "Cleared" by a Program Manager. | `prd.md` | Onboarding Readiness Tracker, AI Q&A Bot |
| **SEC-003** | All data within the platform must be encrypted at rest and in transit. | `prd.md` | Core Infrastructure, Artifact Vault |
| **AUD-001** | Every user action, including document uploads, status changes, approvals, and rejections, must be logged in an immutable audit trail. | `prd.md` | Artifact Vault, Transition Timelines |
| **TRN-001** | A new transition is initiated by a Program Manager, who must provide the core metadata (e.g., Contract Name, Number, Key Dates). | `frontend_spec.md` | Transition Setup & Management |
| **ART-001** | Departing contractors are responsible for uploading required transition documents (artifacts) to a centralized vault. | `prd.md` | Artifact Vault |
| **ART-002** | Program Managers must review all submitted artifacts and have the ability to approve or reject them. | `prd.md` | Artifact Vault |
| **ART-003** | The status of each artifact (e.g., Pending, Submitted, Approved, Rejected) must be tracked and visible to the Program Manager. | `frontend_spec.md` | Artifact Vault, PM Dashboard |
| **ONB-001** | The system must track the onboarding readiness of all team members, including their security clearance status and platform access level. | `prd.md`, `frontend_spec.md` | Onboarding Readiness Tracker |
| **KNOW-001**| The system must be able to ingest data from specified sources (MS Teams, ServiceNow) for future analysis. | `prd.md` | Basic Documentation Harvester |
| **KNOW-002**| Incoming engineers can only access knowledge through a natural language Q&A interface that searches ingested documents. | `prd.md` | AI Q&A Bot |