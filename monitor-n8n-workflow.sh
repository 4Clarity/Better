#!/bin/bash
# Monitor n8n Workflow Executions
# Real-time monitoring of workflow execution status and logs

set -e

# Configuration
N8N_API_KEY="${N8N_API_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js}"
N8N_API_URL="http://localhost:5678/api/v1"
WORKFLOW_ID="${1:-S1reDEFte3H0mHZZ}"
CHECK_INTERVAL="${2:-2}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         n8n Workflow Execution Monitor                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Workflow ID:${NC} ${WORKFLOW_ID}"
echo -e "${CYAN}Check Interval:${NC} ${CHECK_INTERVAL}s"
echo ""

# Get latest execution ID
get_latest_execution() {
    curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_API_URL}/executions?workflowId=${WORKFLOW_ID}&limit=1" | \
        jq -r '.data[0].id // empty'
}

# Get execution details
get_execution_details() {
    local exec_id="$1"
    curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_API_URL}/executions/${exec_id}"
}

# Display execution status
display_execution() {
    local exec_data="$1"

    local exec_id=$(echo "$exec_data" | jq -r '.id')
    local status=$(echo "$exec_data" | jq -r '.status')
    local mode=$(echo "$exec_data" | jq -r '.mode')
    local started=$(echo "$exec_data" | jq -r '.startedAt')
    local stopped=$(echo "$exec_data" | jq -r '.stoppedAt')
    local finished=$(echo "$exec_data" | jq -r '.finished')

    # Status color
    local status_color="${YELLOW}"
    case "$status" in
        success|running) status_color="${GREEN}" ;;
        error) status_color="${RED}" ;;
        waiting) status_color="${CYAN}" ;;
    esac

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Execution ID:${NC} ${exec_id}"
    echo -e "${CYAN}Status:${NC} ${status_color}${status}${NC}"
    echo -e "${CYAN}Mode:${NC} ${mode}"
    echo -e "${CYAN}Started:${NC} ${started}"

    if [ "$stopped" != "null" ]; then
        echo -e "${CYAN}Stopped:${NC} ${stopped}"

        # Calculate duration
        local start_sec=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${started:0:19}" "+%s" 2>/dev/null || echo "0")
        local stop_sec=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${stopped:0:19}" "+%s" 2>/dev/null || echo "0")

        if [ "$start_sec" != "0" ] && [ "$stop_sec" != "0" ]; then
            local duration=$((stop_sec - start_sec))
            echo -e "${CYAN}Duration:${NC} ${duration}s"
        fi
    fi

    echo -e "${CYAN}Finished:${NC} ${finished}"
}

# Display node execution details
display_node_status() {
    local exec_data="$1"

    if command -v jq &> /dev/null; then
        local has_data=$(echo "$exec_data" | jq 'has("data")')

        if [ "$has_data" = "true" ]; then
            echo ""
            echo -e "${CYAN}Node Execution Status:${NC}"

            # Try to get node execution data
            local nodes=$(echo "$exec_data" | jq -r '.data.resultData.runData // {} | keys[]' 2>/dev/null || echo "")

            if [ -n "$nodes" ]; then
                while IFS= read -r node; do
                    local node_status=$(echo "$exec_data" | jq -r ".data.resultData.runData[\"${node}\"][0].error // \"success\"" 2>/dev/null)

                    if [ "$node_status" = "success" ]; then
                        echo -e "  ${GREEN}✓${NC} ${node}"
                    else
                        echo -e "  ${RED}✗${NC} ${node}: ${node_status}"
                    fi
                done <<< "$nodes"
            else
                echo -e "  ${YELLOW}No detailed node data available${NC}"
            fi
        fi
    fi
}

# Monitor mode - watch for new executions
monitor_mode() {
    echo -e "${BLUE}Monitoring for new executions...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""

    local last_exec_id=""
    local check_count=0

    while true; do
        check_count=$((check_count + 1))
        local current_exec_id=$(get_latest_execution)

        if [ -n "$current_exec_id" ] && [ "$current_exec_id" != "$last_exec_id" ]; then
            echo ""
            echo -e "${GREEN}New execution detected!${NC}"

            local exec_data=$(get_execution_details "$current_exec_id")
            display_execution "$exec_data"

            # Monitor until finished
            local status=$(echo "$exec_data" | jq -r '.status')
            local finished=$(echo "$exec_data" | jq -r '.finished')

            while [ "$status" = "running" ] || [ "$status" = "waiting" ]; do
                sleep "$CHECK_INTERVAL"
                exec_data=$(get_execution_details "$current_exec_id")
                status=$(echo "$exec_data" | jq -r '.status')
                finished=$(echo "$exec_data" | jq -r '.finished')

                echo -e "${CYAN}Status:${NC} ${status} (checking...)"
            done

            # Show final status
            echo ""
            echo -e "${BLUE}Execution Complete:${NC}"
            display_execution "$exec_data"
            display_node_status "$exec_data"

            # Show recent logs
            echo ""
            echo -e "${CYAN}Recent n8n Logs:${NC}"
            docker-compose logs n8n --tail=10 | grep -v "Rudder" || echo "No logs available"

            last_exec_id="$current_exec_id"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo -e "${YELLOW}Waiting for next execution...${NC}"
        else
            # Show periodic status
            if [ $((check_count % 5)) -eq 0 ]; then
                echo -e "${CYAN}[Check $check_count]${NC} Waiting... (last: ${last_exec_id:-none})"
            fi
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# Check specific execution
check_execution() {
    local exec_id="$1"

    echo -e "${BLUE}Checking execution: ${exec_id}${NC}"
    echo ""

    local exec_data=$(get_execution_details "$exec_id")

    if [ -z "$exec_data" ] || [ "$exec_data" = "null" ]; then
        echo -e "${RED}Error: Execution not found${NC}"
        exit 1
    fi

    display_execution "$exec_data"
    display_node_status "$exec_data"

    # Show logs around execution time
    local started=$(echo "$exec_data" | jq -r '.startedAt')
    echo ""
    echo -e "${CYAN}Logs around execution time:${NC}"
    docker-compose logs n8n --since="${started}" --until="${started}" 2>/dev/null | grep -v "Rudder" | tail -20 || \
    docker-compose logs n8n --tail=20 | grep -v "Rudder"
}

# List recent executions
list_recent() {
    local limit="${1:-10}"

    echo -e "${BLUE}Recent Executions (last ${limit}):${NC}"
    echo ""

    local executions=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_API_URL}/executions?workflowId=${WORKFLOW_ID}&limit=${limit}")

    if command -v jq &> /dev/null; then
        echo "$executions" | jq -r '.data[] |
            "\(.id) | \(.status) | \(.mode) | \(.startedAt)"' | \
        while IFS='|' read -r id status mode started; do
            local status_icon="○"
            local status_color="${NC}"

            case "$status" in
                *success*) status_icon="✓"; status_color="${GREEN}" ;;
                *error*) status_icon="✗"; status_color="${RED}" ;;
                *running*) status_icon="⟳"; status_color="${YELLOW}" ;;
                *waiting*) status_icon="⏸"; status_color="${CYAN}" ;;
            esac

            echo -e "  ${status_color}${status_icon}${NC} ${id} | ${status_color}${status}${NC} | ${mode} | ${started}"
        done
    else
        echo "$executions"
    fi
}

# Show help
show_help() {
    cat <<EOF
${BLUE}n8n Workflow Execution Monitor${NC}

Usage: $0 [command] [options]

${CYAN}Commands:${NC}
  monitor [workflow_id] [interval]  - Monitor for new executions (default)
  check <execution_id>              - Check specific execution details
  list [limit]                      - List recent executions (default: 10)
  help                              - Show this help

${CYAN}Examples:${NC}
  # Monitor Document Chunking workflow (default)
  $0 monitor

  # Monitor specific workflow with 5s interval
  $0 monitor XAexgtMTb9UEzX5M 5

  # Check specific execution
  $0 check 319

  # List last 20 executions
  $0 list 20

${CYAN}Environment:${NC}
  N8N_API_KEY     - n8n API key (default: from config)
  N8N_API_URL     - n8n API URL (default: http://localhost:5678/api/v1)

EOF
}

# Main command dispatcher
case "${1:-monitor}" in
    monitor)
        shift
        WORKFLOW_ID="${1:-$WORKFLOW_ID}"
        CHECK_INTERVAL="${2:-$CHECK_INTERVAL}"
        monitor_mode
        ;;
    check)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Execution ID required${NC}"
            echo "Usage: $0 check <execution_id>"
            exit 1
        fi
        check_execution "$2"
        ;;
    list)
        list_recent "${2:-10}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
