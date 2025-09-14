# GEMINI.md - Transition Intelligence Platform (TIP)

This document provides a comprehensive overview of the Transition Intelligence Platform (TIP) project, designed to serve as a quick-start guide and instructional context for AI-powered development.

## 1. Project Overview

The Transition Intelligence Platform (TIP) is an AI-powered SaaS platform built to streamline government contract transitions. It features a multi-service, containerized architecture designed for scalability and robust local development.

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
*   `documents/`: Project documentation, requirements, and architectural diagrams.

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
