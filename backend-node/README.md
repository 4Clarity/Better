# Transition Intelligence Platform (TIP) - Backend

Node.js backend for the Transition Intelligence Platform, implementing comprehensive data management for government contract transitions.

## Features

- **Comprehensive Data Schema**: Complete person, organization, and transition management
- **Role-Based Access Control**: Multi-level security with Keycloak integration
- **Audit Trails**: Immutable audit logging for compliance
- **Vector Search**: AI-powered semantic search using pgvector
- **Document Management**: Artifact storage and quality review workflows
- **Progress Tracking**: Contractor proficiency assessment and progress monitoring

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Prisma
- **Authentication**: Keycloak
- **File Storage**: MinIO
- **Caching**: Redis
- **Search**: Elasticsearch (optional)

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL with pgvector extension

## Quick Start

### 1. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Update the `.env` file with your specific configuration.

### 2. Start Infrastructure Services

Start the required services using Docker Compose:

```bash
docker-compose up -d postgres minio keycloak redis
```

Wait for all services to be healthy before proceeding.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

Generate the Prisma client:

```bash
npm run db:generate
```

Run database migrations:

```bash
npm run db:migrate
```

Seed the database with initial data:

```bash
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Database Schema

The comprehensive data schema includes:

### Core Entities
- **Persons**: Individual profiles with contact information and security clearances
- **Users**: Authentication and account management linked to Keycloak
- **Organizations**: Government agencies and contractor companies
- **Transitions**: Contract transition projects with lifecycle management

### Project Management
- **Milestones**: Key deliverables and checkpoints
- **Tasks**: Granular work assignments with progress tracking
- **Communications**: Centralized communication logging
- **Calendar Events**: Meeting and event management

### Document Management
- **Artifacts**: File storage with version control and approval workflows
- **Quality Reviews**: Deliverable quality assessment and approval
- **Knowledge Chunks**: AI-processed content for semantic search
- **Vector Embeddings**: Semantic search capabilities

### Assessment & Training
- **Proficiency Assessments**: Contractor skill and knowledge evaluation
- **Progress Tracking**: Learning velocity and readiness monitoring

## Available Scripts

### Database Management
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:push` - Push schema changes without migrations

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Service URLs

When running with Docker Compose:

- **API**: http://localhost:3000
- **Database**: localhost:5432
- **Prisma Studio**: http://localhost:5555 (run `npm run db:studio`)
- **MinIO Console**: http://localhost:9001
- **Keycloak Admin**: http://localhost:8080
- **Redis**: localhost:6379
- **Elasticsearch**: http://localhost:9200

## Security Considerations

- All PII fields are encrypted at the application level
- Row-level security implemented for multi-tenant access
- Comprehensive audit logging for compliance
- Security clearance levels integrated into access control
- API rate limiting and CORS protection enabled

## Development Guidelines

1. **Database Changes**: Always use Prisma migrations for schema changes
2. **API Design**: Follow REST conventions with consistent error handling
3. **Security**: Never log sensitive information or expose internal IDs
4. **Testing**: Write tests for all business logic and API endpoints
5. **Documentation**: Update API documentation for all endpoint changes

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database if needed
npm run db:reset
```

### Missing Extensions
```bash
# Connect to database and verify extensions
docker-compose exec postgres psql -U tip_user -d tip_database -c "SELECT * FROM pg_extension;"
```

### Migration Issues
```bash
# Check migration status
npx prisma migrate status

# Reset and reapply migrations
npm run db:reset
```

## Contributing

1. Follow the existing code style and conventions
2. Write comprehensive tests for new features
3. Update documentation for any API changes
4. Ensure all security requirements are met
5. Test with realistic data volumes

## License

This project is developed for government use and follows applicable federal guidelines and security requirements.