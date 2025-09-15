# Transition Intelligence Platform (TIP)

This repository contains the source code for the Transition Intelligence Platform (TIP), an AI-powered SaaS platform designed to streamline government contract transitions.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Docker and Docker Compose:** The entire development environment is containerized. [Install Docker](https://docs.docker.com/get-docker/).
- **Node.js and npm:** Required for local development and package management. [Install Node.js](https://nodejs.org/).

### Important: NPM Cache Permissions

During setup, you may encounter permission errors with `npm` if your cache directory contains files owned by `root`. This can happen due to a bug in older npm versions.

**If `npm install` fails with an `EACCES` error, you must fix the ownership of your npm cache directory.** Run the following command in your terminal:

```bash
sudo chown -R $(whoami) ~/.npm
```

This command changes the ownership of the `.npm` directory to your current user, which is a safe and necessary step to resolve this common issue.

## 2. Local Development Setup

The local environment is orchestrated using Docker Compose. It includes the frontend, all backend services, a database, cache, and other required dependencies.

### Step 1: Configure Your Environment

Before starting the services, you need to configure the necessary ports for your environment and create a local environment file. We've provided a script to automate this process.

1. **Run the setup script:**

    ```bash
    bash setup.sh
    ```

    This script will check for available ports, generate a `.env` file with the correct configuration, and notify you of the ports being used.

2. **Review the variables:** Open the newly created `.env` file. The script automatically assigns available ports, but you can review the generated configuration.

### Step 2: Build and Start the Services

To build the Docker images and start all the services, run the following command from the root of the project:

```bash
docker-compose up --build
```

to stop services:

```bash
docker-compose down
```

- The `--build` flag forces Docker to rebuild the images, which is necessary on the first run or after making changes to `Dockerfile`s or application dependencies.
- The services will start in the foreground, and you will see logs from all containers in your terminal. To stop the services, press `Ctrl+C`.
- To run the services in the background (detached mode), use `docker-compose up -d --build`.

### Database Initialization

On the first run, the PostgreSQL database will be automatically initialized. The `database/init.sql` script will be executed, creating the necessary tables and seeding some initial data. You can modify this script to change the initial database schema.

### Step 2: Accessing the Services

Once the containers are running, you can access the different parts of the application at the following local URLs:

- **Frontend Application:** [http://tip.localhost](http://tip.localhost)
- **Node.js API:** [http://api.tip.localhost](http://api.tip.localhost)
- **Python API:** [http://py.tip.localhost](http://py.tip.localhost)
- **Traefik Dashboard (Reverse Proxy):** [http://localhost:8080](http://localhost:8080)
- **Keycloak (Authentication):** [http://auth.tip.localhost](http://auth.tip.localhost)
- **n8n (Workflows):** [http://n8n.tip.localhost](http://n8n.tip.localhost)
- **MinIO (S3 Storage):** [http://localhost:9001](http://localhost:9001)

**Note:** You may need to add entries to your `/etc/hosts` file to map these hostnames to your localhost IP address (`127.0.0.1`):

```text
127.0.0.1 tip.localhost api.tip.localhost py.tip.localhost auth.tip.localhost n8n.tip.localhost
```

## 3. Project Structure

- `docker-compose.yml`: Defines all the services, networks, and volumes for the local environment.
- `documents/`: Contains all project requirements, architectural documents, and style guides.
- `frontend/`: The React-based user interface.
- `backend-node/`: The primary Node.js API service.
- `backend-python/`: The Python service for AI/ML and data processing tasks.
- `database/`: Contains SQL scripts for database initialization.

## 4. Data Architecture Overview

The Transition Intelligence Platform implements a comprehensive data schema designed for government contract transitions with **21 core entities** supporting role-based access control, audit compliance, and AI-powered knowledge management.

### Core Data Entities

#### 🏢 Organization & Access Management

- **Organizations**: Government agencies and contractor companies with hierarchical structure
- **Transitions**: Central workspace entities for contract transition projects
- **TransitionUsers**: Role-based access control with security clearance progression tracking

#### 📋 Work Management

- **Milestones**: High-level transition deliverables and checkpoints
- **Tasks**: Granular work assignments with dependencies, progress tracking, and time management
- **TaskComments**: Contextual communication threads for task collaboration

#### 📄 Document & Knowledge Management

- **Artifacts**: Version-controlled documents with approval workflows and security classification
- **DeliverableQualityReviews**: Multi-dimensional quality assessment (completeness, accuracy, clarity, security) with approval gates
- **KnowledgeChunks**: AI-processed text segments from approved documents
- **VectorEmbeddings**: Semantic search capabilities using pgvector for natural language queries

#### 📧 Communication & Calendar

- **Communications**: Centralized logging of emails, chat messages, and notifications across platforms (Teams, Slack, Email)
- **CalendarEvents**: Integrated calendar system with Outlook/Teams synchronization and automated event generation
- **NotificationPreferences**: User-configurable multi-channel notification settings

#### 🎓 Contractor Readiness

- **ContractorProficiencyAssessments**: Comprehensive skill evaluations across technical, domain, and soft skills
- **ProficiencyProgressTracking**: Longitudinal analytics with learning velocity, trend analysis, and predictive modeling

#### 🔍 AI & Analytics

- **QuerySessions**: Natural language question-answering audit trail with user feedback
- **ArtifactAuditLog**: Immutable audit trail for all document actions ensuring compliance

### Key Architectural Features

#### 🔐 Security-First Design

- Role-based access control with explicit security clearance requirements
- Immutable audit trails for all actions and communications
- Data encryption at rest and in transit with classification handling

#### 🤖 AI Integration

- Vector embeddings for semantic search and knowledge discovery
- Quality-gated content processing ensuring only approved deliverables become searchable
- Natural language query capabilities with source citation and confidence scoring

#### 📊 Enterprise Integration

- Microsoft Graph API integration for Outlook/Teams calendar synchronization
- Multi-platform communication logging (Teams, Slack, Email, SMS)
- External tool integration while maintaining centralized audit trails

#### 📈 Analytics & Insights

- Real-time contractor readiness tracking with predictive completion modeling
- Quality metrics for deliverable assessment and improvement
- Learning velocity analysis with automated intervention triggers
- Communication pattern analysis for knowledge gap identification

### Data Relationships

The schema implements a hub-and-spoke model with **Transitions** as the central entity, connected to:

- User management through **TransitionUsers** junction table
- Work breakdown via **Milestones** and **Tasks** hierarchy  
- Document lifecycle through **Artifacts** → **Quality Reviews** → **Knowledge Processing**
- Communication tracking across all related entities
- Proficiency monitoring for incoming contractors

This architecture supports enterprise-scale government contract transitions while maintaining strict compliance, security, and auditability requirements essential for federal contracting environments.

## 6. Build Challenges & Solutions

This section documents the key challenges encountered during the setup of the local development environment and the solutions that were implemented.

### 1. EACCES Permission Error with NPM Cache

-   **Problem**: The `npm install` command failed with an `EACCES` permission error, indicating that the process did not have permission to write to the npm cache directory (`~/.npm`).
-   **Cause**: This issue is common when `npm` commands have been run with `sudo` in the past, causing some files in the cache to be owned by the `root` user.
-   **Solution**: The ownership of the npm cache directory was recursively changed to the current user. This is a safe and standard fix for this problem.
    ```bash
    sudo chown -R $(whoami) ~/.npm
    ```

### 2. "Port Already in Use" Errors

-   **Problem**: When starting the services with `docker-compose up`, builds would fail because the hardcoded ports in the `docker-compose.yml` file were already allocated by other processes on the host machine.
-   **Solution**: The `setup.sh` script was created to automate port configuration. The script:
    -   Checks for available ports on the host machine within a predefined range.
    -   Generates a `.env` file and populates it with the available ports.
    -   The `docker-compose.yml` file was updated to use these variables from the `.env` file, making the port allocation dynamic and avoiding conflicts.

### 3. Frontend Connectivity Issues

-   **Problem**: After all services were running, the frontend application at `http://tip.localhost` would not load, even though the container was running without errors.
-   **Cause**: The Vite development server inside the `frontend` container was configured to listen on `localhost` (`127.0.0.1`) by default. This meant it would only accept connections from within the container itself, not from the Traefik reverse proxy.
-   **Solution**: The `vite.config.ts` file was modified to instruct the Vite server to listen on `0.0.0.0`. This allows the server to accept connections from any network interface, making it accessible to the reverse proxy and allowing traffic to be correctly routed to the application.

### 4. Backend Node.js 400 Error and Service Crashes

-   **Problem**: The backend-node service was returning 400 "Bad Gateway" errors when accessed via `http://api.tip.localhost/api/transitions`, and the container was repeatedly crashing with various module loading errors.
-   **Root Causes**:
    -   **Port Mismatch**: The Node.js application was listening on port 3001, but Docker and Traefik were configured to expect port 3000.
    -   **ES Module Issues**: The `package.json` had `"type": "module"` but `ts-node-dev` couldn't handle ES modules properly, causing import resolution failures.
    -   **Prisma Compatibility**: The Prisma client was generated with incorrect binary targets for the Alpine Linux ARM64 environment.
    -   **Database Connection**: The `DATABASE_URL` was pointing to port 5433 instead of the correct PostgreSQL port 5432.
-   **Solutions Implemented**:
    -   **Port Alignment**: Changed `src/index.ts` to listen on port 3000 to match Docker configuration.
    -   **CommonJS Conversion**: Removed `"type": "module"` from `package.json` and reverted to CommonJS imports without `.js` extensions.
    -   **Prisma Binary Targets**: Updated `schema.prisma` to include `binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]` for Alpine Linux compatibility.
    -   **Runtime Prisma Generation**: Modified `Dockerfile.dev` to generate Prisma client at runtime: `CMD ["sh", "-c", "npx prisma generate && npm run dev"]`.
    -   **Database URL Fix**: Corrected `.env` file to use `postgresql://user:password@db:5432/tip`.
    -   **OpenSSL Dependencies**: Added `RUN apk add --no-cache openssl libc6-compat` to Dockerfile for Prisma engine compatibility.

### 5. PostCSS ES Module Configuration Error

-   **Problem**: The frontend build was failing with `module is not defined in ES module scope` error in `postcss.config.js`.
-   **Cause**: The frontend `package.json` included `"type": "module"` which treated `.js` files as ES modules, but the PostCSS config was using CommonJS syntax.
-   **Solution**: Updated `frontend/postcss.config.js` to use ES module syntax: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`.

### 6. Missing Frontend Functionality

-   **Problem**: The frontend UI displayed but clicking "New Transition" button had no effect, and no transitions were being fetched or displayed.
-   **Cause**: The `DashboardPage.tsx` component was only a static template with no API integration or event handlers implemented.
-   **Solution**: Implemented complete transitions functionality:
    -   Added `useState` and `useEffect` hooks for state management
    -   Created `fetchTransitions()` function to GET data from API
    -   Implemented `createSampleTransition()` function for POST requests
    -   Added error handling and loading states
    -   Built responsive UI with transition cards, status badges, and real-time updates

### 7. Database Schema and Migration Issues

-   **Problem**: Prisma client initialization errors and missing database tables for the transitions API.
-   **Solution**: 
    -   Created proper Prisma schema with `Transition` and `Milestone` models
    -   Ran `npx prisma db push --accept-data-loss` to synchronize schema with database

## 5. Authentication System

The Transition Intelligence Platform implements a comprehensive authentication system with JWT tokens, role-based access control, and Keycloak SSO integration.

### Authentication Methods

The system supports multiple authentication methods for different environments:

1. **Demo Login** (Development) - One-click authentication with admin privileges
2. **Username/Password** - Direct credential authentication (demo/demo)
3. **Keycloak SSO** - Production-ready single sign-on integration

### Available Endpoints

- **Health Check**: `GET /api/auth/health` - Authentication service status
- **Demo Login**: `POST /api/auth/demo-login` - Development authentication
- **Login**: `POST /api/auth/login` - Regular authentication (Keycloak or credentials)
- **Profile**: `GET /api/auth/me` - Current user profile
- **Admin Test**: `GET /api/auth/admin/test` - Admin role verification

### Quick Start Authentication

1. **Access the application**: Navigate to [http://tip.localhost](http://tip.localhost)
2. **Login**: Use the "Demo Login" button for instant access with admin privileges
3. **Alternative**: Use username `demo` and password `demo` for manual login

### Authentication Features

- ✅ **JWT Token Management**: Access tokens (15min) + refresh tokens (7 days)
- ✅ **Role-Based Access Control**: Admin, program_manager, and user roles
- ✅ **Session Management**: Secure session handling with database storage
- ✅ **Development Bypass**: Auth bypass mode for development (`AUTH_BYPASS=true`)
- ✅ **Keycloak Integration**: Production-ready SSO with token validation
- ✅ **Security Headers**: CORS configuration and secure token handling

### User Roles & Permissions

The system implements three primary roles:

- **Admin**: Full system access including user management
- **Program Manager**: Project oversight and milestone management
- **User**: Basic access to assigned transitions and tasks

### Development Configuration

For development, authentication bypass is enabled by default:

```env
AUTH_BYPASS=true
JWT_SECRET=your-jwt-secret-key-here-change-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-key-here-change-in-production
KEYCLOAK_JWT_PUBLIC_KEY=your-keycloak-public-key-here
```

### Testing Authentication

Test the authentication endpoints directly:

```bash
# Health check
curl -X GET http://api.tip.localhost/api/auth/health

# Demo login
curl -X POST http://api.tip.localhost/api/auth/demo-login \
  -H "Content-Type: application/json" -d "{}"

# Username/password login
curl -X POST http://api.tip.localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo"}'

# Get current user (with auth bypass)
curl -X GET http://api.tip.localhost/api/auth/me \
  -H "x-auth-bypass: true"
```

### Production Deployment

For production deployment:

1. Set `AUTH_BYPASS=false` in your environment
2. Configure proper Keycloak public key for token validation
3. Use strong JWT secrets (minimum 32 characters)
4. Enable HTTPS for all authentication endpoints
5. Configure proper CORS origins for your domain

## 7. Testing

This project uses Cypress for end-to-end (E2E) testing of the UI and integrated backend flows.

### Prerequisites
- Ensure the stack is running behind Traefik so the hostnames resolve correctly:
  - `docker-compose up -d --build`
- Ensure these hostnames are present in `/etc/hosts`:
  - `127.0.0.1 tip.localhost api.tip.localhost py.tip.localhost auth.tip.localhost n8n.tip.localhost`

### Auth Bypass in Dev
- The app supports an “Auth Bypass” development mode controlled via a UI toggle (in the left sidebar header). When ON, protected routes accept the header `x-auth-bypass: true`.
- Cypress tests set this via localStorage automatically in helpers, but you can toggle it in the UI when testing manually.

### Run Cypress Tests
From the `frontend/` folder:

```bash
cd frontend
# Headless run (CI-like)
npm run test:e2e:headless

# Standard run
npm run test:e2e

# Open Cypress runner (interactive)
npm run test:e2e:open
```

By default, tests assume:
- Frontend is at `http://tip.localhost`
- Backend API is at `http://api.tip.localhost/api`
(Configured in `frontend/cypress.config.ts`.)

### Useful Tips
- Run a single spec by using Cypress’s built-in pattern matching in the runner, or run headless with `--spec`:
  ```bash
  npx cypress run --spec cypress/e2e/transitions/project_hub_milestones_crud.cy.ts
  ```
- To view backend traffic during tests, tail logs: `docker-compose logs -f backend-node`.
- If you see foreign key errors in tests, ensure the DB schema is up-to-date: inside the backend container run `npx prisma db push`.

### Where Are the Tests?
- E2E specs live under `frontend/cypress/e2e/` and include:
  - Smoke tests (stack health)
  - Security (User Management) views
  - Transitions overview
  - Milestones CRUD (Project Hub and Enhanced Detail)
  - Tasks CRUD on Enhanced Detail (incl. Subtasks and Milestone association)
  - Planning View tree operations (add, indent/outdent, reorder)
  - Auth Bypass toggle checks

### Test Plan
- See the full test plan at `documents/planning/epic-0-1-cypress-test-plan.md` for coverage goals, selectors guidance, CI strategy, and a traceability matrix outline.

    -   Implemented proper database connection handling in the application

## Useful Resources

### Agents

- https://github.com/wshobson/agents
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://claudecodecommands.directory/browse
- https://github.com/anthropics/claude-code-action/tree/main
- CodeReview Worflow. https://github.com/OneRedOak/claude-code-workflows