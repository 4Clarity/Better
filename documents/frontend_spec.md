# **Front-End UX Specification: Transition Intelligence Platform (TIP) - MVP**

**Version:** 1.0
**Author:** UX Expert
**Date:** 2025-08-16

## 1. Core UX Principles
This specification is guided by the core design principles outlined in the main concept document:
- **Progressive Disclosure:** Show users only what they need, when they need it. Avoid overwhelming them with information.
- **Role-Based Experience:** The UI must be tailored to the specific needs and goals of the user's role (PM, Outgoing, Incoming).
- **Clarity & Simplicity:** The interface must be clean and self-explanatory, embodying the "Zero-Training Onboarding" principle. Every action should be intuitive.
- **Action-Oriented Design:** The UI should guide users toward their next logical action.

## 2. High-Level Structure & Navigation
The application will use a simple, persistent left-hand navigation bar that adapts based on user role.

- **Global Navigation (Left Sidebar):**
    - **Dashboard:** The default landing page.
    - **Transitions:** A list of all transitions the user has access to.
    - **Artifacts:** A central repository for all documents.
    - **Settings:** User profile and notification settings.

## 3. Key Screens & User Flows (MVP)

### 3.1. Brenda: The Government Program Manager

Brenda's experience is focused on oversight, status, and compliance.

**Flow 1: Creating a New Transition**
1.  Brenda clicks a prominent "New Transition" button on her Dashboard.
2.  A simple, single-page form appears asking for core metadata (Contract Name, Number, Key Dates).
3.  Upon creation, she is taken to the new Transition's dedicated **Project Hub**.

**Screen: Project Hub (PM View)**
- **Layout:** A tabbed interface for simplicity.
- **Tab 1: Overview (Default):**
    - A large, clear status indicator (e.g., "On Track," "At Risk"). This is manually set in the MVP.
    - Key milestone tracker showing upcoming and overdue dates.
- **Tab 2: Artifacts:**
    - A view of the `Artifact Vault` filtered for this specific transition.
    - Displays a list of required documents, their status (Pending, Submitted, Approved, Rejected), and who is responsible.
    - Each item is clickable, opening a detail view to see the document and its history.
- **Tab 3: Team & Access:**
    - This is the `Onboarding Readiness Tracker`.
    - A table of all invited users (Incoming & Outgoing).
    - Columns for "Name," "Role," "Security Status" (Pending/Cleared), and "Platform Access" (Enabled/Disabled).
    - Brenda can invite new users from this screen.

### 3.2. David: The Departing Contractor Lead

David's experience is task-oriented, focused on fulfilling obligations.

**Flow 2: Submitting an Artifact**
1.  David logs in and lands on his **Dashboard**.
2.  The Dashboard prominently displays a "My Pending Tasks" widget. It lists the artifacts he needs to upload.
3.  He clicks on a task, e.g., "Upload System Security Plan."
4.  A simple modal appears with a file uploader and a comments box.
5.  He uploads the file, adds an optional comment, and clicks "Submit." The task is removed from his pending list.

**Screen: Dashboard (Outgoing Contractor View)**
- **Layout:** A simple, single-column layout.
- **Component 1: "My Pending Tasks"**
    - A clear, actionable list of required artifact uploads. Each item shows the due date.
- **Component 2: "Recently Submitted"**
    - A list of his team's recent uploads and their current status (e.g., "Pending Review," "Approved").

### 3.3. Maria: The Incoming Engineer

Maria's experience is focused on information discovery and learning. Her access is disabled until Brenda marks her as "Cleared."

**Flow 3: Finding Information**
1.  Once granted access, Maria logs in. Her **Dashboard** is a welcome page.
2.  A large, central search bar is the primary UI element. The placeholder text reads "Ask a question about the project..."
3.  She types her question. As she types, auto-suggestions for relevant documents appear.
4.  She hits enter, and a search results page displays snippets from relevant documents, prioritizing those from the `Artifact Vault`.

**Screen: Dashboard (Incoming Contractor View)**
- **Layout:** Minimalist and search-focused.
- **Component 1: Welcome Message:** A brief intro to the project.
- **Component 2: AI Q&A Search Bar:** The primary interaction point for her in the MVP.
- **Component 3: "Key Documents" Widget:** A curated list of essential reading, such as the System Architecture overview, set by the PM.

## 4. Accessibility
The front-end must be developed to meet WCAG 2.1 AA standards, ensuring it is usable by people with disabilities. This includes keyboard navigation, screen reader compatibility, and sufficient color contrast.