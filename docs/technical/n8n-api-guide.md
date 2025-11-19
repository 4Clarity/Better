# n8n API Helper Guide

## Quick Start

The n8n API helper script provides convenient bash functions for managing n8n workflows.

### Setup

Your API key has been configured in:
- `.env` file (for container access)
- `n8n-helper.sh` script (for local CLI access)

### Usage

**Option 1: Source the script (recommended for interactive use)**
```bash
source ./n8n-helper.sh
n8n_help
```

**Option 2: Execute directly**
```bash
./n8n-helper.sh help
./n8n-helper.sh n8n_list_workflows
```

**Option 3: Direct curl commands**
```bash
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"

curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows | jq '.'
```

## Available Functions

### Workflow Management

#### List All Workflows
```bash
n8n_list_workflows
```

Returns all workflows with complete details.

#### Find Workflow by Name
```bash
n8n_find_workflow "document"
n8n_find_workflow "processing"
```

Searches workflows by name (case-insensitive).

#### Get Specific Workflow
```bash
n8n_get_workflow "S1reDEFte3H0mHZZ"
```

Returns complete workflow definition including nodes and connections.

#### Activate/Deactivate Workflow
```bash
n8n_activate_workflow "S1reDEFte3H0mHZZ"
n8n_deactivate_workflow "S1reDEFte3H0mHZZ"
```

Enable or disable a workflow.

### Execution Management

#### Execute a Workflow
```bash
# Simple execution
n8n_execute_workflow "S1reDEFte3H0mHZZ"

# With input data (not yet fully supported by helper)
n8n_execute_workflow "S1reDEFte3H0mHZZ" '{"input": "data"}'
```

Manually trigger a workflow execution.

#### List Recent Executions
```bash
# Last 20 executions (default)
n8n_list_executions

# Last 50 executions
n8n_list_executions 50
```

#### List Executions for Specific Workflow
```bash
n8n_workflow_executions "S1reDEFte3H0mHZZ" 10
```

Get execution history for a particular workflow.

#### Get Execution Details
```bash
n8n_get_execution "execution-id-here"
```

Returns complete execution data including node outputs.

#### Check Execution Status
```bash
n8n_execution_status "execution-id-here"
```

Returns a summary of execution status (success/error/running).

#### Delete Execution
```bash
n8n_delete_execution "execution-id-here"
```

Remove execution from history.

### Webhook Operations

#### Trigger a Webhook
```bash
# Simple webhook trigger
n8n_trigger_webhook "document-processing"

# With JSON data
n8n_trigger_webhook "document-processing" '{
  "document_id": "123",
  "filename": "test.pdf",
  "mime_type": "application/pdf"
}'

# With different HTTP method
n8n_trigger_webhook "my-webhook" '{"data":"value"}' "GET"
```

Trigger webhook-based workflows directly.

### Other Operations

#### List Credentials
```bash
n8n_list_credentials
```

**Note:** Sensitive credential data is not returned by the API.

#### List Tags
```bash
n8n_list_tags
```

Returns all workflow tags.

#### Health Check
```bash
n8n_health
```

Verify n8n is running and accessible.

#### Show Configuration
```bash
n8n_info
```

Display current API configuration.

## Common Workflows

### 1. Document Processing Workflow

```bash
# Find the document processing workflow
n8n_find_workflow "document"

# Trigger it via webhook
n8n_trigger_webhook "document-processing" '{
  "document_id": "doc-123",
  "filename": "manual.pdf",
  "mime_type": "application/pdf",
  "storage_path": "/data/uploads/manual.pdf",
  "content_hash": "abc123def456"
}'

# Check recent executions
n8n_list_executions 5
```

### 2. Monitoring Workflow Execution

```bash
# Execute workflow and capture execution ID
EXEC_OUTPUT=$(n8n_execute_workflow "S1reDEFte3H0mHZZ")
EXEC_ID=$(echo "$EXEC_OUTPUT" | jq -r '.data.executionId')

# Check status
n8n_execution_status "$EXEC_ID"

# Get full details if needed
n8n_get_execution "$EXEC_ID"
```

### 3. Workflow Maintenance

```bash
# List all workflows
n8n_list_workflows

# Deactivate a problematic workflow
n8n_deactivate_workflow "workflow-id"

# Fix the workflow (manually in n8n UI)

# Reactivate it
n8n_activate_workflow "workflow-id"
```

## Direct API Examples

### Using curl directly

```bash
# Set API key
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"

# List workflows
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows

# Get specific workflow
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows/S1reDEFte3H0mHZZ

# Execute workflow
curl -s -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  http://localhost:5678/api/v1/workflows/S1reDEFte3H0mHZZ/execute

# List executions
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/executions?limit=10

# Get execution details
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/executions/EXECUTION_ID
```

## API Reference

### Base URL
```
http://localhost:5678/api/v1
```

### Authentication
All API requests require the `X-N8N-API-KEY` header:
```
X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflows` | GET | List all workflows |
| `/workflows/{id}` | GET | Get workflow details |
| `/workflows/{id}` | PATCH | Update workflow (e.g., activate/deactivate) |
| `/workflows/{id}/execute` | POST | Execute workflow |
| `/executions` | GET | List executions |
| `/executions/{id}` | GET | Get execution details |
| `/executions/{id}` | DELETE | Delete execution |
| `/credentials` | GET | List credentials |
| `/tags` | GET | List tags |

### Webhook Endpoint
```
http://localhost:5678/webhook/{webhook-path}
```

## Troubleshooting

### "Unauthorized" Error
Check that your API key is correct and not expired:
```bash
n8n_info
```

### Webhook Not Triggering
1. Verify webhook path is correct
2. Check workflow is activated
3. Verify n8n container is running:
```bash
docker-compose ps n8n
```

### Execution Fails
Check execution logs:
```bash
n8n_get_execution "execution-id" | jq '.data.error'
```

View n8n container logs:
```bash
docker-compose logs n8n --tail=50
```

## Additional Resources

- **n8n API Documentation**: https://docs.n8n.io/api/
- **n8n Web UI**: http://n8n.tip.localhost or http://localhost:5678
- **Workflow Configuration**: See `/n8n/workflows/` directory

## Notes

- API key is valid until: **2025-12-31** (based on JWT exp claim)
- The API key has full access to all workflows and executions
- Keep the API key secure and don't commit it to version control (already in `.env`)
