# Epic 3: Initial Knowledge Access (Expanded for Development)

**Summary:** This epic defines the initial experience for the incoming contractor team. For the MVP, access is limited and focused on independent information discovery through a simple, powerful Q&A interface. Access is strictly controlled and granted only after security clearance.

---

## User Story 3.1.1: Query Knowledge Base

**As an** Incoming Engineer (Maria),
**I want to** ask questions in natural language and receive answers based on the existing, ingested documentation,
**So that** I can find information independently and accelerate my onboarding.

### Acceptance Criteria:
- An Incoming Engineer, once granted access, sees a search-focused dashboard.
- The user can type a question into a search bar and submit it.
- The system returns a list of relevant snippets from the knowledge base.
- Each snippet must cite its source document.
- Access is strictly forbidden for users whose `platform_access` is not `enabled`.

---

### Development Tasks:

#### Python Backend Engineer (FastAPI)
- **Task BE-PY-3.1.1:** Set up a new FastAPI service for the AI/LLM capabilities.
- **Task BE-PY-3.1.2:** Develop a background process (e.g., using Redis Queue) that is triggered when new artifacts are approved. This process will parse the document content (PDF, DOCX, etc.) and create vector embeddings.
- **Task BE-PY-3.1.3:** Store the embeddings in a vector database (e.g., integrated with PostgreSQL via `pgvector`).
- **Task BE-PY-3.1.4:** Create an API endpoint `POST /api/qa` that takes a natural language question.
- **Task BE-PY-3.1.5:** The endpoint should convert the question to an embedding, perform a similarity search against the vector database, and retrieve the most relevant text chunks.
- **Task BE-PY-3.1.6:** Use PydanticAI and a local LLM (Ollama) to synthesize an answer from the retrieved chunks and return the answer along with the source citations.

#### Node.js Backend Engineer (Fastify)
- **Task BE-JS-3.1.1:** Create a proxy endpoint `POST /api/q-and-a` in the main Fastify application.
- **Task BE-JS-3.1.2:** This endpoint must first verify the user's authentication and authorization using Keycloak, specifically checking that their `platform_access` status from the `transition_users` table is `enabled`.
- **Task BE-JS-3.1.3:** If authorized, the endpoint will securely forward the request to the Python FastAPI service. This ensures the main API gateway handles all user-facing security.

#### Frontend Engineer (React/Vite)
- **Task FE-3.1.1:** Design and build the minimalist, search-focused dashboard for Incoming Engineers, visible only to that role.
- **Task FE-3.1.2:** The main component will be a large search bar (`Input` with a `Button` from `shadcn/ui`).
- **Task FE-3.1.3:** On submission, call the proxied `POST /api/q-and-a` endpoint.
- **Task FE-3.1.4:** Display the results in a clean, readable format, showing the synthesized answer at the top and the source snippets below in `Card` components.

#### QA & Test Automation Engineer
- **Task QA-3.1.1:** Write a Pact contract test between the Node.js proxy and the Python QA service.
- **Task QA-3.1.2:** Write a Cypress E2E test for the Q&A flow:
    1. Log in as an Incoming Engineer who has been granted access.
    2. Submit a question.
    3. Verify that an answer and source snippets are displayed.
- **Task QA-3.1.3:** Write a Cypress E2E test to verify that a user *without* access cannot see the dashboard and that any direct API calls fail with a 403 Forbidden error.