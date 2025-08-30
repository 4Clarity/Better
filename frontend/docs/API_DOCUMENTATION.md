# Better Transition Management System - API Documentation

## Overview

The Better Transition Management System provides a comprehensive RESTful API for managing government contract transitions, business operations, user management, and project milestones. The API is built using Fastify with TypeScript and includes full validation, error handling, and OpenAPI schema support.

**Base URL:** `http://localhost:3000/api`

## Authentication

All endpoints require authentication (implementation pending). Currently, user context is handled via placeholder user IDs.

## Core Endpoints

### 1. Team Member Transitions (`/api/transitions`)

Manages the core transition workflow for team member transitions between contracts.

#### Create Transition
- **POST** `/api/transitions`
- **Purpose:** Create a new team member transition (User Story 1.1.1)
- **Request Body:**
  ```json
  {
    "contractName": "string (1-255 chars, required)",
    "contractNumber": "string (1-100 chars, required)", 
    "startDate": "string (date format, required)",
    "endDate": "string (date format, required)",
    "duration": "IMMEDIATE | THIRTY_DAYS | FORTY_FIVE_DAYS | SIXTY_DAYS | NINETY_DAYS",
    "keyPersonnel": "string (optional)",
    "status": "NOT_STARTED | ON_TRACK | AT_RISK | BLOCKED | COMPLETED",
    "requiresContinuousService": "boolean (default: true)",
    "createdBy": "string (user ID)"
  }
  ```
- **Responses:**
  - `201`: Transition created successfully
  - `400`: Invalid request data
  - `409`: Contract number already exists

#### List Transitions
- **GET** `/api/transitions`
- **Purpose:** Retrieve all transitions with filtering and pagination
- **Query Parameters:**
  - `search`: Search by contract name or number
  - `status`: Filter by transition status
  - `page`: Page number (default: 1)
  - `limit`: Items per page (1-100, default: 10)
  - `sortBy`: Sort field (contractName, startDate, endDate, status, createdAt)
  - `sortOrder`: asc or desc (default: desc)
- **Response:** Paginated list of transitions with contract details

#### Get Transition Details
- **GET** `/api/transitions/{id}`
- **Purpose:** Get detailed information for a specific transition
- **Response:** Full transition object with related contract and creator information

#### Update Transition
- **PUT** `/api/transitions/{id}`
- **Purpose:** Update transition information
- **Request Body:** Same as create, all fields optional

#### Update Transition Status
- **PATCH** `/api/transitions/{id}/status`
- **Purpose:** Update only the transition status
- **Request Body:**
  ```json
  {
    "status": "NOT_STARTED | ON_TRACK | AT_RISK | BLOCKED | COMPLETED"
  }
  ```

#### Delete Transition
- **DELETE** `/api/transitions/{id}`
- **Purpose:** Remove a transition (soft delete recommended)

### 2. Enhanced Transitions (`/api/enhanced-transitions`)

Advanced transition management with comprehensive contract integration.

#### Create Enhanced Transition
- **POST** `/api/enhanced-transitions`
- **Request Body:**
  ```json
  {
    "contractId": "string (required)",
    "name": "string (1-255 chars, required)",
    "description": "string (optional)",
    "startDate": "string (date, required)",
    "endDate": "string (date, required)", 
    "duration": "IMMEDIATE | THIRTY_DAYS | FORTY_FIVE_DAYS | SIXTY_DAYS | NINETY_DAYS",
    "keyPersonnel": "string (optional)",
    "status": "NOT_STARTED | ON_TRACK | AT_RISK | BLOCKED | COMPLETED",
    "requiresContinuousService": "boolean (default: true)",
    "createdBy": "string (user ID)"
  }
  ```

#### List Enhanced Transitions
- **GET** `/api/enhanced-transitions`
- **Query Parameters:**
  - `contractId`: Filter by contract
  - `businessOperationId`: Filter by business operation
  - `search`: Search across multiple fields
  - `status`: Filter by status
  - Pagination and sorting parameters

#### Get Legacy Transitions
- **GET** `/api/enhanced-transitions/legacy`
- **Purpose:** Retrieve legacy transition data for migration

### 3. Business Operations (`/api/business-operations`)

Manages business operation entities that contain contracts and transitions.

#### Create Business Operation
- **POST** `/api/business-operations`
- **Request Body:**
  ```json
  {
    "name": "string (1-255 chars, required)",
    "businessFunction": "string (1-100 chars, required)",
    "technicalDomain": "string (1-100 chars, required)",
    "description": "string (optional)",
    "scope": "string (required)",
    "objectives": "string (required)",
    "performanceMetrics": {
      "operational": ["string"],
      "quality": ["string"],
      "compliance": ["string"]
    },
    "supportPeriodStart": "string (date, required)",
    "supportPeriodEnd": "string (date, required)",
    "currentContractEnd": "string (date, required)",
    "governmentPMId": "string (required)",
    "directorId": "string (required)",
    "currentManagerId": "string (optional)"
  }
  ```

#### List Business Operations
- **GET** `/api/business-operations`
- **Query Parameters:**
  - `search`: Search by name or description
  - `businessFunction`: Filter by business function
  - `technicalDomain`: Filter by technical domain
  - Pagination and sorting parameters

### 4. Contracts (`/api/contracts`)

Contract management within business operations.

#### Create Contract
- **POST** `/api/contracts`
- **Request Body:**
  ```json
  {
    "businessOperationId": "string (required)",
    "contractName": "string (1-255 chars, required)",
    "contractNumber": "string (1-100 chars, required)",
    "contractorName": "string (1-255 chars, required)",
    "contractorPMId": "string (optional)",
    "startDate": "string (date, required)",
    "endDate": "string (date, required)",
    "canBeExtended": "boolean (default: true)",
    "status": "PLANNING | ACTIVE | RENEWAL | EXPIRING | EXPIRED | EXTENDED"
  }
  ```

#### Get Contracts by Business Operation
- **GET** `/api/contracts/by-business-operation/{businessOperationId}`
- **Purpose:** Retrieve all contracts for a specific business operation

### 5. Milestones (`/api/transitions/{transitionId}/milestones`)

Milestone management within transitions.

#### Create Milestone
- **POST** `/api/transitions/{transitionId}/milestones`
- **Request Body:**
  ```json
  {
    "title": "string (required)",
    "description": "string (optional)",
    "dueDate": "string (date, required)",
    "priority": "LOW | MEDIUM | HIGH | CRITICAL (required)",
    "status": "PENDING | IN_PROGRESS | COMPLETED | BLOCKED | OVERDUE"
  }
  ```

#### List Milestones
- **GET** `/api/transitions/{transitionId}/milestones`
- **Query Parameters:**
  - `status`: Filter by milestone status
  - `priority`: Filter by priority level
  - `overdue`: Show only overdue milestones
  - Pagination and sorting parameters

#### Bulk Delete Milestones
- **POST** `/api/transitions/{transitionId}/milestones/bulk-delete`
- **Request Body:**
  ```json
  {
    "milestoneIds": ["string"]
  }
  ```

### 6. User Management (`/api/user-management`)

Comprehensive user and security management with government compliance features.

#### Get Users
- **GET** `/api/user-management/users`
- **Query Parameters:**
  - `search`: Search by name or email
  - `role`: Filter by user role
  - `accountStatus`: Filter by account status
  - `page`: Page number
  - `pageSize`: Items per page

#### Invite User
- **POST** `/api/user-management/users/invite`
- **Request Body:**
  ```json
  {
    "userData": {
      "roles": ["string"],
      "person": {
        "firstName": "string",
        "lastName": "string",
        "primaryEmail": "string",
        "securityClearanceLevel": "string",
        "clearanceExpirationDate": "string (date)",
        "pivStatus": "string",
        "pivExpirationDate": "string (date)"
      }
    }
  }
  ```

#### Accept Invitation
- **POST** `/api/user-management/users/accept-invitation`
- **Request Body:**
  ```json
  {
    "invitationToken": "string",
    "keycloakId": "string",
    "confirmationData": {
      "firstName": "string",
      "lastName": "string",
      "primaryEmail": "string"
    }
  }
  ```

#### Update User Status
- **PUT** `/api/user-management/users/{id}/status`
- **Request Body:**
  ```json
  {
    "accountStatus": "ACTIVE | DEACTIVATED | SUSPENDED",
    "statusReason": "string (optional)"
  }
  ```

#### Update User Security
- **PUT** `/api/user-management/users/{id}/security`
- **Request Body:**
  ```json
  {
    "securityClearanceLevel": "string",
    "clearanceExpirationDate": "string (date)",
    "pivStatus": "string",
    "pivExpirationDate": "string (date)"
  }
  ```

#### Transition User Management
- **POST** `/api/user-management/transitions/{transitionId}/users`
- **Purpose:** Invite users to specific transitions
- **GET** `/api/user-management/transitions/{transitionId}/users`
- **Purpose:** Get all users assigned to a transition

#### Security Dashboard
- **GET** `/api/user-management/security/dashboard`
- **Purpose:** Get security compliance dashboard data

## Status Codes and Error Handling

### Standard HTTP Status Codes
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation errors)
- `404`: Resource not found
- `409`: Conflict (duplicate data)
- `500`: Internal server error

### Error Response Format
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed error description or validation errors"
}
```

### Validation Errors (Zod Integration)
The API uses Zod for comprehensive input validation. Validation errors include:
- Field requirements
- Data type mismatches
- Format validation (dates, emails)
- Length constraints
- Enum value validation

## Data Models

### Transition Model
```json
{
  "id": "string (UUID)",
  "contractName": "string",
  "contractNumber": "string", 
  "startDate": "string (ISO date)",
  "endDate": "string (ISO date)",
  "duration": "enum",
  "keyPersonnel": "string",
  "status": "enum",
  "requiresContinuousService": "boolean",
  "createdBy": "string (user ID)",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

### Business Operation Model
```json
{
  "id": "string (UUID)",
  "name": "string",
  "businessFunction": "string",
  "technicalDomain": "string",
  "description": "string",
  "scope": "string",
  "objectives": "string",
  "performanceMetrics": "object",
  "supportPeriodStart": "string (ISO date)",
  "supportPeriodEnd": "string (ISO date)",
  "currentContractEnd": "string (ISO date)",
  "governmentPMId": "string",
  "directorId": "string",
  "currentManagerId": "string",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

### User Model (Government Compliance)
```json
{
  "id": "string (UUID)",
  "keycloakId": "string",
  "accountStatus": "ACTIVE | DEACTIVATED | SUSPENDED",
  "roles": ["string"],
  "person": {
    "firstName": "string",
    "lastName": "string", 
    "primaryEmail": "string",
    "securityClearanceLevel": "string",
    "clearanceExpirationDate": "string (ISO date)",
    "pivStatus": "string",
    "pivExpirationDate": "string (ISO date)"
  },
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

## Rate Limiting and Performance

- API implements standard rate limiting (details TBD)
- Page size limits: Maximum 100 items per request
- Timeout settings: 2 minutes for standard requests
- Database connection pooling for optimal performance

## Health Check

**GET** `/health`
- **Purpose:** Service health verification
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## Development and Testing

### Local Development
- Base URL: `http://localhost:3000/api`
- Frontend integration: `http://localhost:5173`
- Database: PostgreSQL with Prisma ORM

### API Testing
- Comprehensive Cypress E2E test suite available
- Test coverage includes full user journey validation
- Performance testing with 3-second load time requirements

---

**Last Updated:** August 29, 2025  
**API Version:** 1.0  
**Backend Framework:** Fastify with TypeScript  
**Database:** PostgreSQL with Prisma ORM