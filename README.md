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

1.  **Run the setup script:**
    ```bash
    bash setup.sh
    ```
    This script will check for available ports, generate a `.env` file with the correct configuration, and notify you of the ports being used.

2.  **Review the variables:** Open the newly created `.env` file. The script automatically assigns available ports, but you can review the generated configuration.

### Step 2: Build and Start the Services

To build the Docker images and start all the services, run the following command from the root of the project:

```bash
docker-compose up --build
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
```
127.0.0.1 tip.localhost api.tip.localhost py.tip.localhost auth.tip.localhost n8n.tip.localhost
```

## 3. Project Structure

- `docker-compose.yml`: Defines all the services, networks, and volumes for the local environment.
- `documents/`: Contains all project requirements, architectural documents, and style guides.
- `frontend/`: The React-based user interface.
- `backend-node/`: The primary Node.js API service.
- `backend-python/`: The Python service for AI/ML and data processing tasks.
- `database/`: Contains SQL scripts for database initialization.

## 4. Build Challenges & Solutions

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