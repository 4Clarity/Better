# Repository Guidelines

## Project Structure & Module Organization
- Root: `docker-compose.yml`, `setup.sh`, `.env` (from `.env.template`).
- Frontend (React + TS): `frontend/src/{pages,components,services}`; Tailwind config in `frontend/tailwind.config.js`.
- Node API (Fastify + Prisma): `backend-node/src/modules/{domain}/{controller,service,route}.ts`; Prisma schema in `backend-node/prisma/`.
- Python API (FastAPI): `backend-python/src/main.py`.
- Database assets: `database/` (init SQL) and SQL migration files in `backend-node/`.

## Build, Test, and Development Commands
- Environment: `bash setup.sh` then `docker-compose up --build` (stop: `docker-compose down`).
- Frontend: `cd frontend && npm run dev` (Vite), build `npm run build`, lint `npm run lint`.
- Node API: `cd backend-node && npm run dev` (ts-node-dev), build `npm run build`, start `npm start`.
- Prisma (Node API): `npm run db:migrate`, `npm run db:generate`, `npm run db:seed`, reset `npm run db:reset`.
- Python API (via Docker): exposed on port 8000; local dev mirrors container `uvicorn src.main:app --reload`.

## Coding Style & Naming Conventions
- TypeScript/TSX: 2-space indentation; prefer explicit types; avoid default exports.
- React: PascalCase files/components (e.g., `NewTransitionDialog.tsx`); pages end with `Page.tsx`.
- Node API: module folders in kebab-case (e.g., `business-operation`); files `*.controller.ts`, `*.service.ts`, `*.route.ts`.
- Linting: Frontend uses ESLint; run `npm run lint` before PRs.

## Testing Guidelines
- E2E: Cypress specs in `frontend/cypress/e2e/*.cy.ts`.
  - Run: `cd frontend && npm run test:e2e` (headless: `npm run test:e2e:headless`).
- Prefer idempotent tests and stable selectors; include setup/teardown as needed.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `docs:`), scoped when helpful.
- PRs must include: concise description, linked issues, screenshots for UI, API/DB notes (migrations, env var changes), and test steps.
- Pre-PR checks: `frontend/npm run test:all`; for Node API, run Prisma migrations locally and ensure `docker-compose up --build` is healthy.

## Security & Configuration Tips
- Do not commit secrets. Generate `.env` via `setup.sh` and review values.
- Add hosts: `tip.localhost`, `api.tip.localhost`, `py.tip.localhost`, `auth.tip.localhost`, `n8n.tip.localhost` to `/etc/hosts`.
