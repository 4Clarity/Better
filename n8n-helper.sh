#!/bin/bash
# n8n API Helper Script
# Provides convenient functions for interacting with n8n workflows

# Configuration
N8N_API_URL="${N8N_API_URL:-http://localhost:5678/api/v1}"
N8N_API_KEY="${N8N_API_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to make n8n API calls
n8n_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    local url="${N8N_API_URL}${endpoint}"

    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
            -H "Content-Type: application/json" \
            "$url"
    else
        curl -s -X "$method" \
            -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url"
    fi
}

# Pretty print JSON with jq if available, otherwise just output
pretty_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        cat
    fi
}

#############################################
# WORKFLOW OPERATIONS
#############################################

# List all workflows
n8n_list_workflows() {
    echo -e "${BLUE}Fetching all workflows...${NC}"
    n8n_api_call GET "/workflows" | pretty_json
}

# List workflows with summary
n8n_workflows_summary() {
    echo -e "${BLUE}Workflows Summary:${NC}"
    local response=$(n8n_api_call GET "/workflows")

    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.data[] | "\(.id) | \(.name) | Active: \(.active) | Nodes: \(.nodes | length)"' | \
        while IFS='|' read -r id name active nodes; do
            echo -e "  ${GREEN}$id${NC} |$name |$active |$nodes"
        done
    else
        echo "$response"
    fi
}

# Get specific workflow by ID
n8n_get_workflow() {
    local workflow_id="$1"

    if [ -z "$workflow_id" ]; then
        echo -e "${RED}Error: Workflow ID required${NC}"
        echo "Usage: n8n_get_workflow <workflow_id>"
        return 1
    fi

    echo -e "${BLUE}Fetching workflow: ${workflow_id}${NC}"
    n8n_api_call GET "/workflows/${workflow_id}" | pretty_json
}

# Get workflow by name (fuzzy search)
n8n_find_workflow() {
    local search_term="$1"

    if [ -z "$search_term" ]; then
        echo -e "${RED}Error: Search term required${NC}"
        echo "Usage: n8n_find_workflow <search_term>"
        return 1
    fi

    echo -e "${BLUE}Searching for workflows matching: ${search_term}${NC}"
    local response=$(n8n_api_call GET "/workflows")

    if command -v jq &> /dev/null; then
        echo "$response" | jq -r --arg term "$search_term" '.data[] | select(.name | test($term; "i")) | "\(.id) | \(.name) | Active: \(.active)"'
    else
        echo "$response"
    fi
}

# Activate a workflow
n8n_activate_workflow() {
    local workflow_id="$1"

    if [ -z "$workflow_id" ]; then
        echo -e "${RED}Error: Workflow ID required${NC}"
        echo "Usage: n8n_activate_workflow <workflow_id>"
        return 1
    fi

    echo -e "${YELLOW}Activating workflow: ${workflow_id}${NC}"
    n8n_api_call PATCH "/workflows/${workflow_id}" '{"active": true}' | pretty_json
    echo -e "${GREEN}✓ Workflow activated${NC}"
}

# Deactivate a workflow
n8n_deactivate_workflow() {
    local workflow_id="$1"

    if [ -z "$workflow_id" ]; then
        echo -e "${RED}Error: Workflow ID required${NC}"
        echo "Usage: n8n_deactivate_workflow <workflow_id>"
        return 1
    fi

    echo -e "${YELLOW}Deactivating workflow: ${workflow_id}${NC}"
    n8n_api_call PATCH "/workflows/${workflow_id}" '{"active": false}' | pretty_json
    echo -e "${GREEN}✓ Workflow deactivated${NC}"
}

#############################################
# EXECUTION OPERATIONS
#############################################

# Execute a workflow (trigger manually)
n8n_execute_workflow() {
    local workflow_id="$1"
    local input_data="${2:-{}}"

    if [ -z "$workflow_id" ]; then
        echo -e "${RED}Error: Workflow ID required${NC}"
        echo "Usage: n8n_execute_workflow <workflow_id> [input_json]"
        return 1
    fi

    echo -e "${BLUE}Executing workflow: ${workflow_id}${NC}"
    echo -e "${BLUE}Input data: ${input_data}${NC}"

    local payload=$(cat <<EOF
{
    "workflowId": "$workflow_id"
}
EOF
)

    n8n_api_call POST "/workflows/${workflow_id}/execute" "$payload" | pretty_json
}

# List executions (recent)
n8n_list_executions() {
    local limit="${1:-20}"

    echo -e "${BLUE}Fetching last ${limit} executions...${NC}"
    n8n_api_call GET "/executions?limit=${limit}" | pretty_json
}

# List executions for specific workflow
n8n_workflow_executions() {
    local workflow_id="$1"
    local limit="${2:-20}"

    if [ -z "$workflow_id" ]; then
        echo -e "${RED}Error: Workflow ID required${NC}"
        echo "Usage: n8n_workflow_executions <workflow_id> [limit]"
        return 1
    fi

    echo -e "${BLUE}Fetching last ${limit} executions for workflow: ${workflow_id}${NC}"
    n8n_api_call GET "/executions?workflowId=${workflow_id}&limit=${limit}" | pretty_json
}

# Get execution details
n8n_get_execution() {
    local execution_id="$1"

    if [ -z "$execution_id" ]; then
        echo -e "${RED}Error: Execution ID required${NC}"
        echo "Usage: n8n_get_execution <execution_id>"
        return 1
    fi

    echo -e "${BLUE}Fetching execution: ${execution_id}${NC}"
    n8n_api_call GET "/executions/${execution_id}" | pretty_json
}

# Get execution status (summary)
n8n_execution_status() {
    local execution_id="$1"

    if [ -z "$execution_id" ]; then
        echo -e "${RED}Error: Execution ID required${NC}"
        echo "Usage: n8n_execution_status <execution_id>"
        return 1
    fi

    local response=$(n8n_api_call GET "/executions/${execution_id}")

    if command -v jq &> /dev/null; then
        local status=$(echo "$response" | jq -r '.data.status // .status // "unknown"')
        local finished=$(echo "$response" | jq -r '.data.finished // .finished // "unknown"')
        local mode=$(echo "$response" | jq -r '.data.mode // .mode // "unknown"')

        echo -e "${BLUE}Execution: ${execution_id}${NC}"
        echo -e "  Status: ${GREEN}${status}${NC}"
        echo -e "  Finished: ${finished}"
        echo -e "  Mode: ${mode}"
    else
        echo "$response"
    fi
}

# Delete an execution
n8n_delete_execution() {
    local execution_id="$1"

    if [ -z "$execution_id" ]; then
        echo -e "${RED}Error: Execution ID required${NC}"
        echo "Usage: n8n_delete_execution <execution_id>"
        return 1
    fi

    echo -e "${YELLOW}Deleting execution: ${execution_id}${NC}"
    n8n_api_call DELETE "/executions/${execution_id}"
    echo -e "${GREEN}✓ Execution deleted${NC}"
}

#############################################
# WEBHOOK OPERATIONS
#############################################

# Trigger webhook (test)
n8n_trigger_webhook() {
    local webhook_path="$1"
    local data="${2:-{}}"
    local method="${3:-POST}"

    if [ -z "$webhook_path" ]; then
        echo -e "${RED}Error: Webhook path required${NC}"
        echo "Usage: n8n_trigger_webhook <webhook_path> [json_data] [method]"
        return 1
    fi

    local webhook_url="http://localhost:5678/webhook/${webhook_path}"

    echo -e "${BLUE}Triggering webhook: ${webhook_url}${NC}"
    echo -e "${BLUE}Method: ${method}${NC}"
    echo -e "${BLUE}Data: ${data}${NC}"

    curl -s -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$webhook_url" | pretty_json
}

#############################################
# CREDENTIAL OPERATIONS
#############################################

# List credentials (names and types only)
n8n_list_credentials() {
    echo -e "${BLUE}Fetching credentials...${NC}"
    n8n_api_call GET "/credentials" | pretty_json
}

# Get credential by ID
n8n_get_credential() {
    local credential_id="$1"

    if [ -z "$credential_id" ]; then
        echo -e "${RED}Error: Credential ID required${NC}"
        echo "Usage: n8n_get_credential <credential_id>"
        return 1
    fi

    echo -e "${BLUE}Fetching credential: ${credential_id}${NC}"
    n8n_api_call GET "/credentials/${credential_id}" | pretty_json
}

#############################################
# TAGS OPERATIONS
#############################################

# List all tags
n8n_list_tags() {
    echo -e "${BLUE}Fetching tags...${NC}"
    n8n_api_call GET "/tags" | pretty_json
}

#############################################
# UTILITY FUNCTIONS
#############################################

# Health check
n8n_health() {
    echo -e "${BLUE}Checking n8n health...${NC}"
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz)

    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ n8n is healthy (HTTP ${status_code})${NC}"
        return 0
    else
        echo -e "${RED}✗ n8n health check failed (HTTP ${status_code})${NC}"
        return 1
    fi
}

# Show API info
n8n_info() {
    echo -e "${BLUE}n8n API Configuration:${NC}"
    echo -e "  API URL: ${GREEN}${N8N_API_URL}${NC}"
    echo -e "  API Key: ${GREEN}${N8N_API_KEY:0:20}...${NC}"
    echo ""
    n8n_health
}

# Help function
n8n_help() {
    cat <<EOF
${BLUE}n8n Helper Script - Available Commands${NC}

${GREEN}Workflow Operations:${NC}
  n8n_list_workflows              - List all workflows
  n8n_workflows_summary           - List workflows with summary
  n8n_get_workflow <id>           - Get workflow details
  n8n_find_workflow <search>      - Search workflows by name
  n8n_activate_workflow <id>      - Activate a workflow
  n8n_deactivate_workflow <id>    - Deactivate a workflow

${GREEN}Execution Operations:${NC}
  n8n_execute_workflow <id> [data]     - Execute a workflow
  n8n_list_executions [limit]          - List recent executions
  n8n_workflow_executions <id> [limit] - List executions for workflow
  n8n_get_execution <id>               - Get execution details
  n8n_execution_status <id>            - Get execution status summary
  n8n_delete_execution <id>            - Delete an execution

${GREEN}Webhook Operations:${NC}
  n8n_trigger_webhook <path> [data] [method] - Trigger a webhook

${GREEN}Credential Operations:${NC}
  n8n_list_credentials            - List all credentials
  n8n_get_credential <id>         - Get credential details

${GREEN}Tag Operations:${NC}
  n8n_list_tags                   - List all tags

${GREEN}Utility:${NC}
  n8n_health                      - Check n8n health
  n8n_info                        - Show API configuration
  n8n_help                        - Show this help

${YELLOW}Examples:${NC}
  # List all workflows
  n8n_list_workflows

  # Find document processing workflow
  n8n_find_workflow "document"

  # Execute a workflow
  n8n_execute_workflow "S1reDEFte3H0mHZZ"

  # Trigger webhook with data
  n8n_trigger_webhook "document-processing" '{"document_id":"123"}'

  # Check recent executions
  n8n_list_executions 10

EOF
}

# If script is sourced, just define functions
# If executed directly, show help
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    if [ "$1" = "help" ] || [ -z "$1" ]; then
        n8n_help
    else
        # Execute the command passed as argument
        "$@"
    fi
fi
