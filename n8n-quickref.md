# n8n Helper Quick Reference

## Setup (One-time)
```bash
# Make script executable (already done)
chmod +x ./n8n-helper.sh

# Source the functions (add to your .bashrc/.zshrc for persistence)
source ./n8n-helper.sh
```

## Most Common Commands

```bash
# Show help
n8n_help

# Check n8n health
n8n_health

# List all workflows
n8n_list_workflows

# Find workflow by name
n8n_find_workflow "document"

# Get workflow details
n8n_get_workflow "S1reDEFte3H0mHZZ"

# Activate/deactivate workflow
n8n_activate_workflow "S1reDEFte3H0mHZZ"
n8n_deactivate_workflow "S1reDEFte3H0mHZZ"

# Trigger webhook
n8n_trigger_webhook "document-processing" '{
  "document_id": "123",
  "filename": "test.pdf"
}'

# List recent executions
n8n_list_executions 10

# Get execution status
n8n_execution_status "execution-id"
```

## Your Current Workflows

| ID | Name | Status |
|----|------|--------|
| `S1reDEFte3H0mHZZ` | Document Chunking Analysis Pipeline | ✅ Active |
| `XAexgtMTb9UEzX5M` | My workflow | ⏸️ Inactive |
| `reobP7M8Hj7aPog9` | Old Document Chunking Analysis Pipeline | ⏸️ Inactive |
| `s9qdItEQVQSpm9TX` | Folder Monitor - Auto Process (Fixed) | ⏸️ Inactive |

## Direct curl Examples

```bash
# Export API key first
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"

# List workflows (simple)
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows | \
  jq -r '.data[] | "\(.id) | \(.name) | Active: \(.active)"'

# Get workflow details
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows/S1reDEFte3H0mHZZ | jq '.'

# Trigger webhook
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"document_id":"123","filename":"test.pdf"}' \
  http://localhost:5678/webhook/document-processing | jq '.'

# List recent executions
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/executions?limit=5 | \
  jq -r '.data[] | "\(.id) | Status: \(.status) | \(.workflowId)"'
```

## Files Created

- `n8n-helper.sh` - Main helper script with all functions
- `docs/technical/n8n-api-guide.md` - Complete documentation
- `n8n-quickref.md` - This quick reference
- `.env` - Updated with your API key

## API Configuration

- **URL**: http://localhost:5678/api/v1
- **Webhook URL**: http://localhost:5678/webhook/
- **Web UI**: http://n8n.tip.localhost or http://localhost:5678
- **API Key**: Configured in `.env` and `n8n-helper.sh`
- **Key Expiry**: 2025-12-31

## Next Steps

1. **Source the helper**: `source ./n8n-helper.sh`
2. **Test health**: `n8n_health`
3. **List workflows**: `n8n_list_workflows`
4. **Explore functions**: `n8n_help`

For full documentation, see: `docs/technical/n8n-api-guide.md`
