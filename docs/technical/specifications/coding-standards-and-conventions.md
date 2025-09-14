# Coding Standards and Conventions

## Existing Standards Compliance

**Code Style:** TypeScript strict mode, ESLint configuration, Prettier formatting  
**Linting Rules:** Existing ESLint setup with React and TypeScript rules  
**Testing Patterns:** Cypress E2E testing, component testing patterns  
**Documentation Style:** Inline JSDoc comments, comprehensive README patterns

## Enhancement-Specific Standards

- **Authentication Security:** All authentication functions must include audit logging and error handling
- **User Management Consistency:** User status changes must maintain referential integrity with existing entities
- **Feature Flag Implementation:** Feature flag checks must be consistent and include fallback behavior

## Critical Integration Rules

- **Existing API Compatibility:** New endpoints must not break existing API contracts or middleware chains
- **Database Integration:** All database changes must maintain foreign key relationships and existing query patterns
- **Error Handling:** Authentication errors must follow established error response patterns and user feedback mechanisms
- **Logging Consistency:** Security events must integrate with existing Fastify logging configuration and patterns