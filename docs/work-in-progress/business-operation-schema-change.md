# Business Operation Schema Change Plan

This document outlines the files that need to be modified to resolve the business operation schema mismatch.

## Files to Modify:

1.  **`backend-node/prisma/schema.prisma`**: This is the main Prisma schema file that needs to be updated to include the new models, enums, and modifications to existing models.

    *   **Add Models**:
        *   `BusinessOperation`
        *   `Contract`
        *   `OperationStakeholder`
        *   `AuditLog`
    *   **Update Models**:
        *   `Transition` (add new columns)
        *   `Milestone` (add new columns)
        *   `User` (ensure it matches the SQL migration)
    *   **Add Enums**:
        *   `TransitionStatus`
        *   `ContractStatus`
        *   `StakeholderType`
        *   `TransitionDuration`
        *   `MilestoneStatus`
        *   `PriorityLevel`

2.  **`backend-node/business_operations_incremental_migration.sql`**: This file contains the SQL for the new schema. It should be reviewed and potentially used as a reference for updating the Prisma schema. It may not need to be modified if the Prisma migration is successful.

3.  **`backend-node/src/services/business-operations/business-operations.service.ts`** (and related files): After the schema is updated, the service files that interact with these tables will need to be updated to use the new models and fields.

4.  **`frontend/src/services/api.ts`** (and related files): The frontend API service will need to be updated to match the new API endpoints and data structures.

5.  **`frontend/src/components/business-operations/*.tsx`** (and related files): The frontend components that display and interact with business operations data will need to be updated to match the new data structures.

## Next Steps:

1.  **Update `schema.prisma`**: Modify the Prisma schema to reflect the changes outlined above.
2.  **Run Prisma Migration**: Use `npx prisma db push` to apply the changes to the database.
3.  **Update Backend Code**: Modify the backend services to use the new schema.
4.  **Update Frontend Code**: Modify the frontend services and components to use the new schema.
5.  **Test**: Thoroughly test the application to ensure that all pages are working correctly.
