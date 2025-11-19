# Workflow Resource Doc (WRD) – n8n Master Template

Complete this BEFORE building. Use this as your validation checklist throughout development.

## 1. Header

Workflow Title: (Use kebab-case for consistency: my-workflow-name)
Author:
Date Created:
Version: (SemVer: 1.0.0)
n8n Instance: (Cloud/Self-hosted URL)

## 2. Goal & Business Value

**Primary Outcome:** (One measurable sentence)
**Time/Cost Savings:** (Hours saved per week/month)
**Manual Process Replaced:**
**Prompt:** "Describe the specific business problem this workflow solves. What manual process does it replace? How many hours per week does it save? What's the measurable impact (e.g., 'Reduces invoice processing from 2 hours to 5 minutes')?"

## 3. Trigger Configuration

**Trigger Node Type:** (e.g., n8n-nodes-base.webhook, n8n-nodes-base.scheduleTrigger)
**Trigger Details:**

- Webhook Path: /webhook/[unique-identifier]
- Schedule/Cron:
- Event Type/Filters:
**Test Trigger Command:** (curl example or test payload)
**Prompt:** "Specify exactly how this workflow starts. If webhook: what's the path and expected payload structure? If scheduled: what's the cron expression? If event-based: what specific events trigger it? Include a sample test command or payload."

## 4. End State & Validation

**Success Criteria:** (What proves completion?)
**Output Location:** (Where does data end up?)
**Verification Method:** (How to check it worked)
**Prompt:** "Define what 'done' looks like. Where should the final data be? How can someone verify the workflow completed successfully? What record, file, or notification confirms completion?"

## 5. Systems & Authentication

- **Source Systems:**
- - System: | Node Type: | Auth Method: | Rate Limits:
- **Destination Systems:**
- - System: | Node Type: | Auth Method: | Write Frequency:
- **Credential Names in n8n:** (As stored in n8n)
**Prompt:** "List every external system this workflow touches. For each, specify: the exact n8n node type (e.g., n8n-nodes-base.slack), authentication method (OAuth2, API Key, Basic), any rate limits to consider, and the exact credential name as saved in n8n."

## 6. Data Flow & Transformations

**Input Schema**
// Expected input structure
{
  "field1": "type",
  "field2": "type"
}
**Output Schema**
// Final output structure
{
  "field1": "type",
  "field2": "type"
}
**Key Transformations**

- Field Mappings: (source.field → destination.field)
- n8n Expressions Used: (e.g., {{ $json.data }}, {{ $node["HTTP Request"].json }})
- Custom Functions: (Any .toUpperCase(), .split(), etc.)
**Prompt:** "Document the exact data structure coming in and going out. List every field transformation using n8n expression syntax. Include any data type conversions, field renaming, or calculations. Use actual n8n expressions like {{ $json.fieldName }} or {{ $node['NodeName'].json.data }}."

## 7. Workflow Architecture

**Node Sequence**

1. [Node Name] - Type: nodeType - Purpose:
2. [Node Name] - Type: nodeType - Purpose:
3. [Node Name] - Type: nodeType - Purpose:
**Decision Points**
- IF Node Conditions: (Exact expressions)
- Switch Node Routes: (Route names and conditions)
- Loop Controls: (SplitInBatches settings)
**AI Tool Connections** (if applicable)
- AI Agent Node:
- Connected Tool Nodes: (ANY node can be a tool!)
- Tool Descriptions:
**Prompt:** "List each node in order with its exact n8n node type and purpose. For IF nodes, write the exact condition expression. For Switch nodes, list all routes. For AI Agents, list which nodes are connected as tools and their descriptions. Remember: any node can be an AI tool, not just those marked as tools."

## 8. Error Handling Strategy

**Node-Level Settings**
- **Retry Policy:** (On fail: retry X times, wait Y ms)
- **Continue On Fail:** (Which nodes have this enabled?)
- **Error Workflow ID:** (Separate error handler workflow)
**Error Notifications**
- **Alert Channel:** (Slack channel, email, webhook)
- **Error Message Template:**
- **Recovery Steps:**
**Prompt:** "For each node that could fail: How many retries? What's the wait time? Should it continue on fail? Where are errors sent? Include the exact Slack channel or email for alerts. What's the manual recovery process if automation fails?"

## 9. Performance & Limits

- **Expected Volume:** (Records per hour/day)
- **Processing Time Target:** (Per item or batch)
- **Memory Considerations:** (Large files? Pagination needed?)
- **Concurrent Executions:** (Parallel processing limits)
- **API Rate Limits:** (Calls per minute/hour)
**Prompt:** "Define performance expectations and constraints. How many records will this process per day? What's the acceptable processing time? Are there API rate limits to respect? Should you use batching or pagination? What's the maximum file size it can handle?"

## 10.  Variables & Configuration

**Environment Variables**
- **Variable Name | Purpose | Example Value**
**n8n Workflow Variables**
- **{{ $env.VARIABLE_NAME }}** - Purpose:
**Static Configuration**
- **Base URLs:**
- **Default Values:**
- **Magic Numbers: (Explain any hardcoded values)**
**Prompt:** "List all environment variables, their purpose, and example values. Include any n8n workflow variables using {{ $env.VAR_NAME }} syntax. Document any hardcoded values and explain why they're not variables. Include base URLs and default timeout values."

## 11.  Testing Plan

**Test Scenarios**
- [ ] Happy Path: Input → Expected Output
- [ ] Empty Input: Expected behavior
- [ ] Invalid Data: Error handling check
- [ ] High Volume: Performance under load
- [ ] API Failure: Retry and fallback
**Test Data Location**
- Sample Files: (Path or URL)
- Mock Webhook Payload:

**Validation Commands**

Test webhook
curl -X POST https://[instance]/webhook/[path] \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
**Prompt:** "Create specific test cases with input and expected output for each scenario. Where is test data stored? Include exact curl commands or Postman collections for testing webhooks. What should happen with empty data? How do you verify error handling works?"

## 12.  Deployment & Monitoring

**Deployment Steps**
1. Validate in n8n UI (all nodes green)
2. Test with sample data
3. Activate workflow
4. Monitor first 10 executions
**Monitoring Setup**
- Execution History Check: (Frequency)
- Success Rate Target: (>X%)
- Alert Thresholds:
- Dashboard/Metrics: (URL if applicable)
**Rollback Plan**
- Previous Version Location:
- Rollback Steps:
- Data Recovery Process:
**Prompt:** "Document the exact deployment steps from dev to production. How do you monitor success rate? What metrics trigger alerts? Where are execution logs reviewed? What's the rollback process if issues arise? Include specific URLs to dashboards or monitoring tools."

## 13.  Security & Compliance

**Credential Management**
 - **Credential Storage:** (n8n Credentials vs Env Vars)
- **Access Control:** (Who can edit/execute?)
- **Secret Rotation Schedule:**
**Data Handling**
- **PII Fields:** (List any personal data)
- **Encryption Requirements:**
- **Data Retention:** (How long are executions kept?)
**GDPR/Compliance Notes:**
**Prompt:** "Identify all sensitive data this workflow handles. How are API keys stored (n8n credentials or environment variables)? List any PII fields and how they're protected. What's the data retention policy? Are there compliance requirements (GDPR, HIPAA, SOC2)?"

## 14.  Dependencies & Prerequisites

**Technical Requirements**
- **n8n Version:** (Minimum required)
- **Required Nodes:** (Community nodes to install?)
- **External Services:** (APIs that must be enabled)
**Access Requirements**
- **API Keys Needed:**
- **Permissions Required:**
- **IP Whitelisting:**
**Prompt:** "List everything that must be in place before this workflow can run. What n8n version is required? Are any community nodes needed? What API access must be configured? Are there IP whitelisting requirements? What permissions does the service account need?"

## 15.  Maintenance & Support

**Regular Maintenance**
- **Review Frequency:** (Monthly, Quarterly)
**What to Check:**
- - [ ] API version changes
- - [ ] Credential expiration
- - [ ] Error rate trends
- - [ ] Performance degradation
**Support Contacts***
- **Primary Owner:** (Name, email, Slack)
- **Backup Owner:**
- **Escalation Path:**
**Documentation Links**
- **API Docs:**
- **Runbook:** (Link to operational guide)
- **Related Workflows:** (IDs or names)
**Prompt:** "Define the maintenance schedule and checklist. Who owns this workflow and who's the backup? When should credentials be rotated? What API deprecations should be monitored? Include links to relevant API documentation and any operational runbooks."

## 16.  Change Log

**Date**
**Version**
**Change Description**
**Author**
**Validation Status**

☐ Tested ☐ Approved

## Pre-Build Validation Checklist

**Complete before building:**
- [ ] All source/destination systems accessible
- [ ] Test data prepared
- [ ] Credentials configured in n8n
- [ ] Error handling workflow created (if separate)
- [ ] Webhook path confirmed as unique
- [ ] Rate limits documented and acceptable
- [ ] Success metrics defined and measurable

**Post-Build Validation Checklist**
Complete before activation:
- [ ] All nodes show green (valid) in n8n UI
- [ ] Test execution with sample data successful
- [ ] Error path tested with invalid data
- [ ] Webhook responds correctly (if applicable)
- [ ] Output matches expected schema
- [ ] Monitoring alerts configured
- [ ] Documentation shared with team

**Remember:** This document is your source of truth. Update it with every change. A well-documented workflow is a maintainable workflow.