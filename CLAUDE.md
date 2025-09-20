# Project Awareness and Context

- Always read implementation-plan.md at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- Check task-list.md before starting a new task. If the task isn’t listed, add it with a brief description and today's date.
- Use consistent naming conventions, file structure, and architecture patterns as described in docs/technical/specifications/information-architecture.md.
- Update the implementation-memory.md with troubleshooting experience and add to ## Lessons learned section. 
- When Starting new sessions read ## Lessons learned

## Code Structure and Modularity
- Never create a file longer than 500 lines of code. If a file approaches this limit, refactor by splitting it into modules or helper files.
- Organize code into clearly separated modules, grouped by feature or responsibility.
- Use clear, consistent imports (prefer relative imports within packages).

## Testing and Reliabiity
- Create tests first following a test driven development cycle
- Always create unit tests for new features (functions, classes, routes, etc).
- After updating any logic, check whether existing unit tests need to be updated. If so, do it.
- Tests should live in a /tests folder mirroring the main app structure. Frontend tests live in /cypress
- Include at least:
  - - 1 test for expected use
  - - 1 edge case
  - - 1 failure case
  
## MCP's
- Context7 - Lookup relevant feature documentation for analysis


## When asked to design UI & frontend interface
- Follow style guidance (./docs/technical/specifications/style-guide.md)


## Best Practices Learned

1. **Always verify database ownership before schema changes**
2. **Use superuser accounts for DDL operations, service accounts for DML**
3. **Validate foreign key references before database operations**
4. **Convert empty strings to null/undefined for optional foreign keys**
5. **Regenerate Prisma client after manual database changes**
6. **Implement comprehensive error handling with specific user messages**
7. **Test migration scripts in development before production**
8. **Document database user roles and permissions clearly**
9. **New Migrations, seed new data tables with one test record**

## Future Prevention Checklist

- [ ] Check table ownership before migrations (`\dt+`)
- [ ] Verify foreign key validation in both frontend and backend
- [ ] Test date format compatibility between frontend and backend
- [ ] Ensure all schema changes are reflected in actual database
- [ ] Test error scenarios and user-facing error messages
- [ ] Document database setup procedures for team members
- [ ] Create rollback plans for schema changes

### Core Technologies & Architecture:

*   **Frontend:** A modern user interface built with **React** and **TypeScript**, using **Vite** for the build tooling.
*   **Backend (Primary API):** A **Node.js** service using the **Express** framework and **Prisma** as the ORM for database interactions. This service handles the core business logic.
*   **Backend (AI/ML):** A **Python** service dedicated to AI, machine learning, and heavy data processing tasks.
*   **Database:** **PostgreSQL** is the primary relational database.
*   **Authentication:** Managed by **Keycloak**, providing robust, production-ready SSO capabilities. For development, the system uses JWTs and includes a simple "demo login" and an auth bypass mode.
*   **Infrastructure & Orchestration:** The entire environment is containerized using **Docker** and orchestrated with **Docker Compose**. **Traefik** is used as a reverse proxy to manage routing to the various services under local hostnames. **MinIO** provides an S3-compatible object storage solution.

### Key Directories:

*   `frontend/`: Contains the React frontend application.
*   `backend-node/`: Contains the primary Node.js API service.
*   `backend-python/`: Contains the Python service for AI/ML tasks.
*   `database/`: Holds database initialization scripts (`init.sql`).
*   `docker-compose.yml`: The central configuration file for all services.
*   `docs/`: Project documentation, requirements.
*   `docs/logs/`: Project build logs
*   `docs/technical/`: Product development and architectural details.
*   `docs/work-in-progress/`: Implementation Plan, Epics, Task Lists, Next Steps.

## 2. Building and Running the Project

The project is designed to be run entirely within Docker containers.

### One-Time Setup:

1.  **Run the setup script:** This script dynamically assigns available ports to services to avoid conflicts.
    ```bash
    bash setup.sh
    ```
2.  **Update `/etc/hosts`:** Add the following entries to your local hosts file to enable the custom domains used by the reverse proxy.
    ```text
    127.0.0.1 tip.localhost api.tip.localhost py.tip.localhost auth.tip.localhost n8n.tip.localhost
    ```

### Core Commands:

*   **Build and Start Services (Foreground):**
    From the project root, run:
    ```bash
    docker-compose up --build
    ```
    Use the `--build` flag on the first run or after changing dependencies/Dockerfiles. Logs from all services will be streamed to your terminal.

*   **Start Services (Background):**
    ```bash
    docker-compose up -d --build
    ```
*  **General Startup**
    ```bash
    docker-compose up -d --build backend-node reverse-proxy frontend db
    ```

*   **Stop Services:**
    ```bash
    docker-compose down
    ```

### Accessing Services:

Once running, the services are available at these local URLs:

*   **Frontend:** [http://tip.localhost](http://tip.localhost)
*   **Node.js API:** [http://api.tip.localhost](http://api.tip.localhost)
*   **Python API:** [http://py.tip.localhost](http://py.tip.localhost)
*   **Traefik Dashboard:** [http://localhost:8080](http://localhost:8080)
*   **Keycloak (Auth):** [http://auth.tip.localhost](http://auth.tip.localhost)

## 3. Development Conventions

### Package Management:

*   The `frontend` and `backend-node` projects use `npm` for managing dependencies. Key `package.json` files are located in their respective directories.
*   The `backend-python` project uses `pip` and a `requirements.txt` file.

### Database Migrations:

*   The Node.js service uses **Prisma** for database management.
*   To synchronize the schema with the database after making changes to `prisma/schema.prisma`, run:
    ```bash
    # It's often best to run this inside the running container
    docker-compose exec backend-node sh -c "npx prisma db push"
    ```

### Testing:

*   The project uses **Cypress** for end-to-end (E2E) testing.
*   Test files are located in `frontend/cypress/e2e/`.
*   **To run tests**, first `cd` into the `frontend` directory:
    ```bash
    cd frontend
    ```
*   **Run tests in headless mode (for CI):**
    ```bash
    npm run test:e2e:headless
    ```
*   **Run tests with the Cypress interactive runner:**
    ```bash
    npm run test:e2e:open
    ```
*   **Note:** Tests rely on an "Auth Bypass" mode, which is handled automatically within the Cypress test environment.
