# Enterprise Systems Catalog

## 1. Guiding Principles
This document outlines the standard technology platforms, tools, and patterns for new solutions. The enterprise prioritizes security, control, and long-term maintainability. Solutions are built on a foundation of open-source technologies, deployed in a self-hosted, containerized environment to ensure data sovereignty and operational independence. A hybrid approach using APIs for system integration is the standard pattern.

## 2. Cloud Platforms & Hosting Environment
- **Primary Environment:** Self-hosted / On-premise. All core services and data must reside within the enterprise's private infrastructure.
- **Cloud Services:** Public cloud platforms (AWS, Azure, Google Cloud) are not used for primary hosting of applications or data. They may only be considered for specific, isolated services with a formal exception process and robust security review.
- **Orchestration:** Docker + Compose is the standard for container orchestration across all environments (development, staging, production).
- **Infrastructure as Code (IaC):** While not explicitly defined, the use of containerization implies a preference for IaC practices for environment provisioning.

## 3. Low-Code Platforms
- **Primary Platform:** n8n (self-hosted) is the approved platform for workflows and automations.
- **Constraints:**
    - Must be version-controlled via the enterprise's local Git (Gitea).
    - No external/cloud nodes are permitted.
    - All triggers must be from local sources (webhooks, cron, queues).
    - Secrets must be managed via local `.env` files or Docker secrets.

## 4. Open Source Technologies & Frameworks

### 4.1. Application & Runtime
- **Language Standard:** TypeScript (strict mode) is mandated for both frontend and backend development.
- **Frontend:** React with Vite. UI components should be built using shadcn/ui, Tailwind CSS, and lucide-react. All dependencies must be vendored or served from a local mirror.
- **Backend (Node.js):** Fastify is the required framework. Zod must be used for all request/response validation.
- **Backend (Python):** FastAPI with Pydantic is the standard for Python services, particularly for AI/ML capabilities.
- **AI/LLM:** PydanticAI is the approved library. It must be paired with a local, corporate-hosted LLM runtime (e.g., Ollama, Bedrock, vLLM). No connections to public LLM APIs are permitted.

### 4.2. Data & Storage
- **Primary Database:** PostgreSQL (version 16+).
- **ORMs:** Prisma for Node.js services and SQLAlchemy/SQLModel for Python services.
- **Object Storage:** MinIO (or another S3-compatible, self-hosted solution).
- **Cache & Queue:** Redis is the standard for in-memory caching and job queuing.

### 4.3. CI/CD & Development
- **Version Control:** Gitea (self-hosted).
- **CI/CD Runners:** Drone or Jenkins (self-hosted runners only).
- **Image Registry:** Harbor (self-hosted).
- **Package Mirrors:** Verdaccio for npm and a local pip wheelhouse for Python packages are mandatory.

## 5. Security & Compliance
- **Authentication:** Keycloak (self-hosted) is the mandatory SSO and identity provider for all applications and APIs.
- **Content Security:** A strict Content Security Policy (CSP) is required for all web frontends. All assets (fonts, images) must be self-hosted.
- **Static Analysis:** All code must pass static analysis checks using ESLint/Prettier (TypeScript), ruff/bandit (Python), and semgrep.

## 6. Integration Strategy
- **Standard Pattern:** A hybrid approach using internal, RESTful APIs is the standard for service-to-service communication.
- **API Gateway:** A reverse proxy (Traefik or Nginx) must be used to manage ingress and provide a single entry point.
- **Contract Testing:** Pact is the standard for ensuring reliability between services (e.g., Node.js API and Python API).