# Knowledge Management UI Specification

**Version:** 1.0  
**Author:** Mary, Business Analyst  
**Date:** 2025-09-17  
**Status:** Approved  

## 1. Overview

This document provides the technical specification for the Knowledge Management UI, based on the interactive wireframe found in `docs/product/Knowledge-Management-wireframe`. The purpose of this feature is to provide a centralized interface for curating, managing, and searching organizational knowledge extracted from various sources.

This specification will guide developers in refactoring the wireframe into a production-ready feature that is fully integrated with the existing Transition Intelligence Platform (TIP) architecture, component library, and style guide.

## 2. User Personas and Roles

Based on the `information-architecture.md`, this feature will be primarily used by the following personas:

*   **Government Program Manager (Brenda):** To oversee the knowledge base and ensure its accuracy.
*   **Incoming Contractor Engineer (Maria):** To search and consume knowledge.
*   **Departing Contractor Lead (David):** To contribute knowledge by uploading documents and communications.
*   **Knowledge Curators/Admins:** A new or existing role responsible for the day-to-day management, curation, and approval of facts.

## 3. Information Architecture

The Knowledge Management feature should be integrated into the main TIP application under the **Operational Knowledge Platform** section of the primary navigation, as defined in the `information-architecture.md`.

The proposed sitemap is as follows:

```
...
├── Operational Knowledge Platform
│   ├── Living Knowledge Base
│   ├── **Knowledge Curation Dashboard** (This feature)
│   │   ├── Weekly Curation
│   │   ├── Product Documents
│   │   ├── Communication Files
│   │   ├── Facts Curation
│   │   ├── Approval Queue
│   │   ├── Knowledge Search
│   │   └── Configuration
│   ├── AI-Powered Search & Discovery
...
```

## 4. Component Specifications

The following sections detail each component from the wireframe and provide guidance for refactoring and integration.

### 4.1. Main Application (`App.tsx`)

*   **Purpose:** The main container for the Knowledge Management UI, managing the layout and navigation between sections.
*   **Refactoring Guidance:**
    *   The main layout with the sidebar and content area should be integrated into the main application layout.
    *   The routing logic should be updated to use the application's existing routing solution.
    *   The `navigationItems` array should be made configurable, potentially based on user roles and permissions.

### 4.2. Sidebar (`sidebar.tsx`)

*   **Purpose:** Provides the primary navigation for the Knowledge Management sections.
*   **Refactoring Guidance:**
    *   The sidebar should be refactored to use the main application's existing sidebar component, if available.
    *   Styling should be updated to match the `style-guide.md` and `shadcn-theme.md`.
    *   The navigation items should be dynamically rendered based on user permissions.

### 4.3. Weekly Curation (`weekly-curation.tsx`)

*   **Purpose:** A dashboard providing a weekly overview of knowledge curation activities.
*   **Refactoring Guidance:**
    *   All data should be fetched from the backend via API calls.
    *   The UI components (Cards, Badges, Progress bars) should be replaced with the standard components from the project's `shadcn/ui` library.
    *   Styling should adhere to the `style-guide.md`.

### 4.4. Document Upload (`document-upload.tsx`)

*   **Purpose:** Allows users to upload documents for knowledge extraction.
*   **Refactoring Guidance:**
    *   The file upload mechanism should be integrated with the backend to store files in the MinIO object storage, as per `tech-stack.md`.
    *   The backend should handle the document processing and fact extraction.
    *   The UI should provide real-time feedback on the upload and processing status.
    *   Use the standard `shadcn/ui` components for UI elements.

### 4.5. Communication Files (`communication-files.tsx`)

*   **Purpose:** Allows users to add and manage communication records (emails, chat logs, etc.).
*   **Refactoring Guidance:**
    *   The form for adding new communications should be connected to a backend service to store the data in the PostgreSQL database.
    *   The list of communications should be fetched from the backend.
    *   The "Process for Facts" and "Extract Facts" buttons should trigger backend processes.

### 4.6. Facts Curation (`facts-curation.tsx`)

*   **Purpose:** A detailed interface for reviewing, editing, and managing extracted facts.
*   **Refactoring Guidance:**
    *   This will be the most complex component to integrate. It will require a robust set of API endpoints for fetching, filtering, updating, and approving facts.
    *   The state management should be handled using the project's standard library (e.g., Redux/Zustand).
    *   All UI components must be replaced with their `shadcn/ui` equivalents.

### 4.7. Approval Queue (`approval-queue.tsx`)

*   **Purpose:** A dedicated view for users with approval permissions to review and approve or reject facts.
*   **Refactoring Guidance:**
    *   This component will interact with the same backend services as the Facts Curation component but will be limited to users with the appropriate role.
    *   The "Approve" and "Reject" actions must trigger state changes in the backend.

### 4.8. Knowledge Search (`knowledge-search.tsx`)

*   **Purpose:** A powerful search interface for the knowledge base.
*   **Refactoring Guidance:**
    *   The search functionality should be powered by a dedicated search service, potentially using a vector database like `pgvector` as mentioned in the `information-architecture.md`.
    *   The search results should be filtered based on user permissions and security classifications.
    *   The UI should be built using the standard `shadcn/ui` components.

### 4.9. Configuration (`configuration.tsx`)

*   **Purpose:** An admin interface for managing tags, knowledge sources, and other settings.
*   **Refactoring Guidance:**
    *   This section should be restricted to admin users.
    *   All configuration data should be stored in and retrieved from the backend.
    *   The "Knowledge Sources" section should integrate with the backend services responsible for connecting to external systems like ServiceNow and ADO.

## 5. Styling and Theming

All components must be styled according to the `style-guide.md` and `shadcn-theme.md`. This includes:

*   **Colors:** Use the defined primary, accent, semantic, and neutral colors.
*   **Typography:** Use the `Public Sans` font and the defined type scale.
*   **Spacing:** Adhere to the 8px grid system.
*   **Components:** Use the `shadcn/ui` component library and apply the theme variables.

## 6. Technical Implementation Notes

*   **Backend Services:** New services will need to be created to support this feature, following the patterns in `component-architecture.md`. This includes services for document processing, fact extraction, and managing the knowledge base.
*   **API Endpoints:** A comprehensive set of RESTful or GraphQL API endpoints will be required to support the functionality of each component.
*   **Database:** The existing PostgreSQL database will need to be extended with new tables to store documents, communications, facts, tags, and configuration data. The schema should be managed using Prisma migrations.

## 7. Non-Functional Requirements

*   **Performance:** The UI must be responsive, with page load times and search response times meeting the standards defined in `non-functional-requirements.md`.
*   **Security:** All data access must be secured based on user roles and permissions, as defined in the `information-architecture.md`.
*   **Accessibility:** The UI must be compliant with WCAG 2.1 AA standards.
