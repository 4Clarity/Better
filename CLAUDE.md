# Project Awareness and Context

- Always read PLANNING.md at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- Check TASK.md before starting a new task. If the task isn’t listed, add it with a brief description and today's date.
- Use consistent naming conventions, file structure, and architecture patterns as described in PLANNING.md.
- Use Upper case letters when naming Reference Documents "UPPER-CASE".md
- Update the IMPLEMENTATION_MEMORY.md with troubleshooting experience to add to ## Lessons learned. 
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
