# TIP Approved Technology Stack

**Status:** Approved

This document outlines the approved technology stack for the Transition Intelligence Platform (TIP) MVP. The stack has been reviewed and is fully compliant with the standards outlined in the `systems_catalog.md`.

## 1. Alignment Rationale
The chosen stack aligns perfectly with the enterprise's guiding principles of using secure, self-hosted, open-source technologies. It leverages the mandated platforms for application development, data storage, and security, ensuring long-term maintainability and operational consistency. There are no deviations from the enterprise standards, and therefore no exceptions are required.

## 2. Approved Technologies

### 2.1. App & Runtime
- **Frontend:** React, TypeScript (strict), Vite, shadcn/ui, Tailwind CSS, lucide-react.
    - *Rationale:* Complies with the enterprise standard for web frontends. All dependencies will be vendored and served via the local mirror.
- **Node API:** Fastify, TypeScript (ESM), Zod.
    - *Rationale:* Adheres to the enterprise mandate for Node.js services, ensuring type safety and schema validation.
- **Python API/Agents:** FastAPI, Pydantic v2, PydanticAI.
    - *Rationale:* Follows the enterprise standard for Python services.
- **Local LLM Runtime:** Ollama or a self-hosted Bedrock instance.
    - *Rationale:* Complies with the security requirement to use a local, corporate-hosted LLM with no public internet access.

### 2.2. Data & Storage
- **Database:** PostgreSQL 16+.
    - *Rationale:* The mandated relational database for the enterprise.
- **ORMs:** Prisma (for Node.js) and SQLAlchemy/SQLModel (for Python).
    - *Rationale:* The approved ORMs for their respective services.
- **Object Storage:** MinIO.
    - *Rationale:* The standard S3-compatible, self-hosted object storage solution.
- **Cache/Queue:** Redis.
    - *Rationale:* The approved enterprise solution for caching and job queuing.

### 2.3. Workflows & Automations
- **Engine:** n8n (self-hosted in Docker).
    - *Rationale:* The mandated low-code platform. The implementation will adhere to all constraints, including local Git versioning and no external connectors.

### 2.4. Testing
- **E2E/UI:** Cypress.
- **Unit/Component:** Vitest + Testing Library.
- **API/Contract:** Pact.
- **Python:** pytest.
    - *Rationale:* The selected testing frameworks align with the enterprise's TDD-first approach and cover all required testing layers.

### 2.5. Containers & CI/CD
- **Orchestration:** Docker + Compose.
- **Reverse Proxy:** Traefik or Nginx.
- **CI/CD:** Gitea with local Drone/Jenkins runners.
- **Image Registry:** Harbor.
    - *Rationale:* This stack fully aligns with the enterprise's self-hosted, container-native infrastructure and CI/CD patterns.

### 2.6. Security & Compliance
- **Authentication:** Keycloak.
    - *Rationale:* Adheres to the mandatory requirement for a centralized, self-hosted SSO provider.
- **Package Mirrors:** Verdaccio (npm) and a local pip wheelhouse.
    - *Rationale:* Complies with the security requirement to avoid direct dependencies on public package repositories.
- **Static Analysis:** ESLint/Prettier, ruff/bandit, semgrep.
    - *Rationale:* Meets the requirement for mandatory static analysis across the codebase.