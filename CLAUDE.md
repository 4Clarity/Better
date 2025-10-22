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
- Use snake_case naming convention for all data field definitions, across tables, prisma schema and migration scripts.
- Use camelCase naming convention for all objects and classes.
- Use hyphens (dashes-between-words) for file naming convention.

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
- N8N - Lookup n8n documentation and node implementation details


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
10. **Rebuild and restart docker containers after schema modifications**
11. **Define TypeScript interfaces for complex navigation/data structures**
12. **Create hierarchical navigation using subItems pattern for better UX**
13. **Remove duplicate navigation elements (consolidate tabs into sidebar)**
14. **Group related navigation items under logical parent categories**
15. **Normalize role names when mapping between database and UI display formats**
16. **Use Docker service names (not localhost) in container-to-container communication**
17. **Never use JSX syntax in .ts files - use .tsx or refactor to helper functions**
18. **Monitor Docker disk space - run `docker system prune` regularly to prevent "no space" errors**
19. **Match API response structure to frontend interfaces to avoid runtime errors**
20. **Create comprehensive permission matrices before implementing RBAC features**
21. **Always use exact Prisma model names from schema - check schema.prisma before writing queries**
22. **Verify all relation names match Prisma schema exactly (e.g., `milestones` not `Milestone`)**
23. **After adding new database tables, always add corresponding Prisma models**
24. **Use snake_case for database columns, match exactly in Prisma field mapping**
25. **Always regenerate Prisma client and restart backend after schema changes**
26. **Role checking must be case-insensitive - database may store roles with different casing**
27. **Test RBAC features with actual database users, not just demo/bypass logins**
28. **Use `!== undefined` checks for optional update fields, not truthy checks - empty strings are valid values**
29. **Be consistent with conditional logic patterns across similar operations**
30. **Add debug logging for update operations to help troubleshoot data persistence issues**
31. **Always transform database responses to API format - snake_case (DB) → camelCase (API)**
32. **Create explicit transformation functions at service layer boundaries**
33. **Test API responses match frontend interface expectations**
34. **Document field name mappings between database and API layers**
35. **Install Radix UI dependencies before creating shadcn/ui components**
36. **Restart frontend container after adding new UI components to ensure Vite picks them up**
37. **Create role-specific dashboards using composition pattern (shared widgets + persona layouts)**
38. **Use placeholder data in new components to demonstrate UI before API integration**
39. **Implement graceful fallbacks for unrecognized user roles in dashboard routing**
40. **Document all new component props and variants with TypeScript interfaces**
41. **Always check header values explicitly (=== 'true'), never rely on truthy/falsy checks for string headers**
42. **Include Authorization Bearer token in ALL API client methods, not just auth endpoints**
43. **Apply authentication middleware to protected routes using onRequest: [authenticate]**
44. **Set AUTH_BYPASS=false in production environments to enforce real authentication**
45. **Test authentication with multiple user accounts, not just admin or demo users**
46. **Verify JWT tokens are stored in localStorage after successful login**
47. **Ensure frontend API clients read and send stored JWT tokens with every request**
48. **Return placeholder/empty state data from backend services instead of throwing errors when data is missing**
49. **Add defensive null checks in React components when mapping over arrays (use `array || []`)**
50. **Provide fallback empty objects/arrays to prevent undefined property access errors**
51. **Display user-friendly empty state messages instead of crashing when no data is available**
52. **Use pgvector/pgvector:pg16 Docker image for PostgreSQL to enable vector similarity search**
53. **Always install pgvector extension in database: `CREATE EXTENSION IF NOT EXISTS vector;`**
54. **Configure pgAdmin with servers.json and pgpass files for auto-connection to application database**
55. **Include pgAdmin service in docker-compose startup commands to ensure database admin access**
56. **Use host.docker.internal hostname to access host machine services from Docker containers**
57. **Create dedicated service classes for external LLM/AI integrations with health checks**
58. **Test AI/LLM integrations with multiple models to verify compatibility (embeddings, chat, etc.)**
59. **Document model-specific capabilities and limitations in service layer**
60. **Provide comprehensive unit test coverage for AI service integrations using mocked APIs**
61. **Auto-generate secure temporary passwords in user invitation flows - never collect passwords manually**
62. **User accounts created through wizards should start with "Pending" status and require password reset on first login**
63. **Include clear user instructions that new users contact support for temporary credentials**

## User Invitation Security Best Practices

**CRITICAL RULE**: Never collect or manually enter passwords in invitation forms. Always auto-generate secure temporary passwords on the backend.

### Password Generation Requirements:
- Minimum 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Random generation with proper entropy
- Auto-set `mustChangePassword: true` flag
- Account starts with `accountStatus: 'Pending'`

### Stakeholder Setup Wizard Pattern:
```typescript
// Frontend - Remove password field from invitation form
interface InvitedUser {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  username: string;
  roles: string[];
  // NO password field here
}

// Frontend - Generate password on submission
const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  // ... implementation
};

// Backend already handles secure storage
await UserManagementService.inviteUser({
  personData: { ... },
  userData: {
    username,
    password: temporaryPassword, // Auto-generated
    roles
  }
});
```

### User Communication Flow:
1. Admin invites user via wizard (no password entered)
2. System creates account with "Pending" status
3. Temporary password auto-generated and securely stored
4. User contacts support to receive credentials
5. User logs in with temporary password
6. **Forced password reset** on first login
7. Account status updated to "Active"

## Local LLM Integration (Ollama)

**Setup Requirements:**
- Ollama must be running on host machine
- Default port: 11434
- Use `host.docker.internal` for container-to-host communication

**Environment Variables:**
```bash
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_API_KEY=not-required  # Ollama doesn't require API keys
OLLAMA_DEFAULT_MODEL=gemma3:1b  # Or your preferred model
```

**Service Architecture:**
- Service class: `backend-node/src/services/ollama.service.ts`
- API routes: `backend-node/src/routes/ollama.routes.ts`
- Unit tests: `backend-node/src/services/__tests__/ollama.service.test.ts`

**Available Endpoints:**
- `/api/ollama/health` - Health check
- `/api/ollama/models` - List models
- `/api/ollama/generate` - Text generation
- `/api/ollama/chat` - Chat completion
- `/api/ollama/ask` - Simple Q&A
- `/api/ollama/embeddings` - Generate embeddings (model-dependent)

**Best Practices:**
- Always check health endpoint before making LLM calls
- Use appropriate timeouts (2min for generation, 5sec for health)
- Verify model supports requested capability (embeddings, chat, etc.)
- Handle model-not-found errors gracefully
- Provide fallback behavior when Ollama is unavailable

## Prisma Schema Consistency Protocol

**CRITICAL RULE**: Always maintain consistency between database schema, Prisma schema, and service layer code.

### When Creating New Database Tables:

1. **Create Migration SQL** (`database/migrations/###_description.sql`)
   - Use snake_case for table and column names
   - Define proper foreign key constraints with ON DELETE and ON UPDATE actions
   - Add indexes for performance
   - Include seed data (one test record minimum)

2. **Update Prisma Schema** (`backend-node/prisma/schema.prisma`)
   - Add model with exact table name (use snake_case or `@@map` directive)
   - Map all columns with correct types
   - Define all relations with proper names (check both sides of relation)
   - Use snake_case for relation names matching database conventions

3. **Regenerate Prisma Client**
   ```bash
   docker-compose exec backend-node sh -c "npx prisma generate"
   ```

4. **Restart Backend Service**
   ```bash
   docker-compose restart backend-node
   ```

### When Writing Service Code:

1. **Always check schema.prisma FIRST** before writing any Prisma queries
2. **Verify model names** - use exact names from schema (e.g., `prisma.contracts` not `prisma.contract`)
3. **Verify relation names** - use exact names from schema (e.g., `milestones` not `Milestone`)
4. **Check field names** - use snake_case as defined in database/schema
5. **Map camelCase to snake_case** when passing data between API and database

### Common Pitfalls to Avoid:

❌ **DON'T**: Guess model names (prisma.transition vs prisma.transitions)
✅ **DO**: Check schema.prisma for exact model name

❌ **DON'T**: Use capitalized relation names (Milestone)
✅ **DO**: Use lowercase relation names as defined in schema (milestones)

❌ **DON'T**: Mix camelCase and snake_case inconsistently
✅ **DO**: Use snake_case in database/schema, camelCase in TypeScript

❌ **DON'T**: Assume relations exist without checking
✅ **DO**: Verify relation in schema before including in queries

### Verification Steps After Schema Changes:

```bash
# 1. Run migration
docker-compose exec db psql -U postgres -d tip -f /docker-entrypoint-initdb.d/migrations/###_description.sql

# 2. Regenerate Prisma client
docker-compose exec backend-node sh -c "npx prisma generate"

# 3. Restart backend
docker-compose restart backend-node

# 4. Verify backend started successfully
docker-compose logs backend-node | grep "Server listening"

# 5. Test the endpoint
curl http://api.tip.localhost/api/your-endpoint
```

## Authentication & Authorization Best Practices

**CRITICAL RULE**: Always validate authentication explicitly and ensure JWT tokens flow through the entire request chain.

### Common Authentication Pitfalls:

❌ **DON'T**: Check if header exists using truthy checks
```typescript
if (request.headers['x-auth-bypass']) { // WRONG - any value is truthy
```

✅ **DO**: Check header value explicitly
```typescript
if (request.headers['x-auth-bypass'] === 'true') { // CORRECT
```

❌ **DON'T**: Forget to include Authorization headers in API clients
```typescript
fetch('/api/endpoint', {
  headers: { 'Content-Type': 'application/json' } // Missing token!
})
```

✅ **DO**: Always include JWT token from localStorage
```typescript
const token = localStorage.getItem('authToken');
fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
})
```

❌ **DON'T**: Leave protected routes without authentication middleware
```typescript
fastify.get('/api/dashboard/data', async (request, reply) => {
  const user = request.user; // user will be undefined!
})
```

✅ **DO**: Apply authentication middleware to protected routes
```typescript
fastify.get('/api/dashboard/data', {
  onRequest: [authenticate]
}, async (request, reply) => {
  const user = request.user; // Now properly populated
})
```

### Authentication Debugging Checklist:

When authentication fails unexpectedly:
1. Check `AUTH_BYPASS` environment variable in `.env` (should be `false` for real auth)
2. Verify JWT token is stored in `localStorage.getItem('authToken')`
3. Check Network tab → Request Headers → Verify `Authorization: Bearer ...` exists
4. Verify `x-auth-bypass` header is `'false'` not `'true'`
5. Check backend logs for token validation errors
6. Verify authentication middleware is applied to the route
7. Test with multiple user accounts, not just admin/demo users

## Future Prevention Checklist

- [ ] Check table ownership before migrations (`\dt+`)
- [ ] Verify foreign key validation in both frontend and backend
- [ ] Test date format compatibility between frontend and backend
- [ ] Ensure all schema changes are reflected in actual database
- [ ] Test error scenarios and user-facing error messages
- [ ] Document database setup procedures for team members
- [ ] Create rollback plans for schema changes
- [ ] **Check schema.prisma for exact model and relation names before writing queries**
- [ ] **Regenerate Prisma client after any schema.prisma changes**
- [ ] **Restart backend service after regenerating Prisma client**
- [ ] **Verify model name pluralization (transitions vs transition)**
- [ ] **Map camelCase API fields to snake_case database fields explicitly**
- [ ] **Use `!== undefined` for optional update fields, not truthy checks**
- [ ] **Ensure conditional logic is consistent across all update operations**
- [ ] **Test update operations with empty strings, false, zero, and empty objects/arrays**
- [ ] **Verify service layer transforms database responses to API format (snake_case → camelCase)**
- [ ] **Test that API responses match frontend TypeScript interface definitions**
- [ ] **Check end-to-end data flow: database → API → frontend display**
- [ ] **Verify AUTH_BYPASS is set to false in production .env files**
- [ ] **Check all header validations use explicit === 'true' comparisons, not truthy checks**
- [ ] **Ensure all API client methods include Authorization Bearer token**
- [ ] **Verify protected routes have authentication middleware applied**
- [ ] **Test authentication with real user accounts from database**
- [ ] **Return graceful empty state data from services when user has no records assigned**
- [ ] **Add defensive null checks (`|| []`, `|| {}`) before mapping arrays or accessing nested properties**
- [ ] **Test components with empty/null data to verify they display empty states gracefully**
- [ ] **Verify pgvector extension is installed when working with vector embeddings**
- [ ] **Include pgAdmin in docker-compose startup for database administration access**
- [ ] **Ensure pgAdmin servers.json configuration is mounted correctly**
- [ ] **Use host.docker.internal for accessing host services from Docker containers**
- [ ] **Verify Ollama service health before making LLM API calls**
- [ ] **Check model capabilities before using embeddings or other features**
- [ ] **Provide fallback behavior when local LLM is unavailable**

### Core Technologies & Architecture:

*   **Frontend:** A modern user interface built with **React** and **TypeScript**, using **Vite** for the build tooling.
*   **Backend (Primary API):** A **Node.js** service using the **Fastify** framework and **Prisma** as the ORM for database interactions. This service handles the core business logic.
*   **Backend (AI/ML):** A **Python** service dedicated to AI, machine learning, and heavy data processing tasks.
*   **Database:** **PostgreSQL** (with **pgvector** extension) is the primary relational database, supporting vector similarity search for AI/ML features.
*   **Authentication:** Managed by **Keycloak**, providing robust, production-ready SSO capabilities. For development, the system uses JWTs and includes a simple "demo login" and an auth bypass mode.
*   **Infrastructure & Orchestration:** The entire environment is containerized using **Docker** and orchestrated with **Docker Compose**. **Traefik** is used as a reverse proxy to manage routing to the various services under local hostnames. **MinIO** provides an S3-compatible object storage solution.

### Key Documentation References:

*   **Tech Stack:** See `/Users/richardroach/Documents/Builder_Projects/Better/docs/technical/tech-stack.md` for complete approved technology specifications
*   **Source Tree:** See `/Users/richardroach/Documents/Builder_Projects/Better/docs/technical/specifications/source-tree-integration.md` for project file structure
*   **Coding Standards:** See `/Users/richardroach/Documents/Builder_Projects/Better/docs/technical/specifications/coding-standards-and-conventions.md` for development conventions

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
    127.0.0.1 tip.localhost api.tip.localhost py.tip.localhost auth.tip.localhost n8n.tip.localhost mail.tip.localhost pgadmin.tip.localhost
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
    docker-compose up -d --build backend-node reverse-proxy frontend db pgadmin n8n
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
*   **Traefik Dashboard:** [http://localhost:8081](http://localhost:8081)
*   **Keycloak (Auth):** [http://auth.tip.localhost](http://auth.tip.localhost)
*   **n8n Workflows:** [http://n8n.tip.localhost](http://n8n.tip.localhost)
*   **MailHog:** [http://mail.tip.localhost](http://mail.tip.localhost)
*   **pgAdmin (Database):** [http://pgadmin.tip.localhost](http://pgadmin.tip.localhost) - Login: admin@admin.com / admin

### pgAdmin Configuration:

The TIP Application Database is pre-configured to auto-connect in pgAdmin. The configuration is defined in:
- `pgadmin-config/servers.json` - Server connection details
- `pgadmin-config/pgpass` - Secure password storage

**Connection Details:**
- Host: `db` (Docker internal network)
- Port: `5432`
- Database: `tip`
- Username: `user`
- Password: `password`

**Starting pgAdmin:**
```bash
docker-compose up -d pgadmin
```

The "TIP Application Database" connection will automatically appear in the pgAdmin sidebar after login.

### Database Extensions:

The PostgreSQL database includes the following extensions:
- **pgvector** (v0.8.0) - Vector data type with ivfflat and hnsw access methods for AI/ML similarity search
- **pgcrypto** - Cryptographic functions
- **uuid-ossp** - UUID generation
- **plpgsql** - Procedural language

To verify installed extensions:
```bash
docker exec better-db-1 psql -U user -d tip -c "\dx"
```

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
