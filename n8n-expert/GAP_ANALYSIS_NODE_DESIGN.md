# Gap Analysis Node - Design Document

**Purpose:** Provide users with actionable feedback when their query doesn't match available workflows

**Date:** October 25, 2025

---

## Problem Statement

When users query the N8N Expert Agent for workflows that don't exist in the knowledge base, they currently receive:
- Empty results: `{"output": "...", "data": "[{}]"}`
- No explanation of why
- No guidance on what IS available
- No suggestions for alternative queries

**Example:**
- User asks: "Create a QA workflow to analyze emails"
- Knowledge base has: Excel/Postgres import/export workflows
- Result: Empty `[{}]` with no explanation

---

## Solution: Gap Analysis Node

### High-Level Architecture

```
Query Processing
    ↓
Vector Search (finds 5 workflows)
    ↓
LLM Filter (outputs workflow_ids or -1)
    ↓
IF Node: Check filtered results
    ├─> Has matches (≥1 workflow_id != -1) ──> Normal flow
    └─> No matches (all -1) ──> Gap Analysis Node ──> Enhanced response
```

---

## Node Configuration

### Node Type: Code Node (JavaScript)

**Position:** After the LLM filter aggregation, before response formatting

**Name:** "Gap Analysis Trigger"

### Input Data Structure

```javascript
{
  "filtered_workflow_ids": [-1, -1, -1, -1, -1],
  "original_query": "Create a QA workflow to analyze emails",
  "matched_workflows": [
    {
      "workflow_id": 1,
      "workflow_name": "Insert Excel data to Postgres",
      "similarity": 0.28
    },
    // ... other workflows found by vector search
  ]
}
```

### Code Logic

```javascript
// Count valid matches
const validMatches = $input.all()[0].json.filtered_workflow_ids.filter(id => id !== -1);

// Determine if gap analysis is needed
const needsGapAnalysis = validMatches.length === 0;

// Pass data downstream with flag
return {
  json: {
    ...$input.all()[0].json,
    needsGapAnalysis,
    hasValidMatches: validMatches.length > 0
  }
};
```

---

## Gap Analysis LLM Node

### Node Type: OpenAI Chat Model

**Trigger Condition:** Only when `needsGapAnalysis === true`

**Name:** "Generate Gap Report"

### Prompt Template

```
You are analyzing a knowledge base gap for an n8n workflow recommendation system.

USER QUERY:
{{ $json.original_query }}

WORKFLOWS FOUND (by vector similarity):
{{ $json.matched_workflows.map(w => `- ${w.workflow_name} (${(w.similarity * 100).toFixed(1)}% match)`).join('\n') }}

LLM FILTER RESULTS:
All workflows were filtered out as not relevant (all returned -1).

YOUR TASK:
Generate a gap analysis report with the following structure:

1. **What the user is looking for:**
   - Briefly summarize what type of workflow they need
   - Key requirements from their query

2. **What's currently available:**
   - Summarize the types of workflows in the knowledge base (based on the matched workflows list)
   - General categories covered

3. **The gap:**
   - Explain why no matches were found
   - What's missing from the knowledge base

4. **Suggestions:**
   - Alternative queries the user could try
   - Related workflows that might partially solve their problem
   - Recommendations for building a custom workflow

Keep the response concise (3-5 sentences per section) and actionable.
```

### Output Format

```json
{
  "gap_analysis": {
    "user_needs": "...",
    "available_workflows": "...",
    "identified_gaps": "...",
    "suggestions": "..."
  }
}
```

---

## Response Formatting Node

### Node Type: Code Node (JavaScript)

**Name:** "Format Response with Gap Analysis"

### Code Logic

```javascript
const items = $input.all()[0].json;

// Check if we have valid matches
if (items.hasValidMatches) {
  // Normal response with workflow recommendations
  return {
    json: {
      output: "Here are the recommended workflows to use as an example for you:",
      data: items.valid_workflows,
      metadata: {
        total_matches: items.valid_workflows.length,
        query: items.original_query
      }
    }
  };
} else {
  // Response with gap analysis
  const gapAnalysis = items.gap_analysis;

  return {
    json: {
      output: "I couldn't find workflows that directly match your query. Here's a gap analysis:",
      data: [],
      gap_report: {
        user_needs: gapAnalysis.user_needs,
        available_workflows: gapAnalysis.available_workflows,
        identified_gaps: gapAnalysis.identified_gaps,
        suggestions: gapAnalysis.suggestions
      },
      metadata: {
        total_matches: 0,
        query: items.original_query,
        closest_matches: items.matched_workflows.slice(0, 3).map(w => ({
          name: w.workflow_name,
          similarity: `${(w.similarity * 100).toFixed(1)}%`
        }))
      }
    }
  };
}
```

---

## Implementation Steps

### 1. Add Gap Analysis Trigger (Code Node)

**Location:** After "Aggregate" node (the one that collects filtered workflow IDs)

**Configuration:**
- Name: "Gap Analysis Trigger"
- Language: JavaScript
- Code: See "Code Logic" section above

### 2. Add IF Node for Branching

**Location:** After "Gap Analysis Trigger"

**Configuration:**
- Condition: `{{ $json.needsGapAnalysis }}`
- True branch → Gap Analysis LLM Node
- False branch → Normal workflow fetch flow

### 3. Add Gap Analysis LLM Node

**Location:** True branch of IF node

**Configuration:**
- Node Type: OpenAI Chat Model
- Model: GPT-4o
- System Prompt: "You are a helpful assistant that analyzes knowledge base gaps and provides actionable recommendations."
- User Prompt: See "Prompt Template" section above

### 4. Add Response Formatter Node

**Location:** Merge point after both branches

**Configuration:**
- Name: "Format Response with Gap Analysis"
- Language: JavaScript
- Code: See "Response Formatting Node" section above

### 5. Update Merge Logic

**Configuration:**
- Merge both branches (normal flow + gap analysis flow)
- Ensure data structure is consistent
- Route to "Respond to Webhook" node

---

## Example Output Comparison

### Before Gap Analysis

```json
{
  "output": "Here are the recommended workflows to use as an example for you:",
  "data": [{}]
}
```

**User experience:** Confusing, no explanation

### After Gap Analysis

```json
{
  "output": "I couldn't find workflows that directly match your query. Here's a gap analysis:",
  "data": [],
  "gap_report": {
    "user_needs": "You're looking for a workflow that analyzes emails, extracts factual details using QA techniques, and submits them to a PostgreSQL approval queue.",
    "available_workflows": "The current knowledge base focuses on data import/export workflows (Excel to Postgres, Google Sheets sync) and basic automation (GitHub to Slack notifications).",
    "identified_gaps": "The knowledge base lacks workflows for: (1) Email processing and analysis, (2) Natural language QA/summarization, (3) Approval queue management, (4) Email-to-database automation.",
    "suggestions": "Try searching for: 'Extract data from emails and store in database', 'Process incoming emails with webhooks', or 'Automated email parsing workflow'. Alternatively, you could build a custom workflow combining: Email Trigger → HTTP Request (to QA API) → Postgres Insert → Approval notification."
  },
  "metadata": {
    "total_matches": 0,
    "query": "Create a QA workflow to analyze emails and summarize factual details",
    "closest_matches": [
      { "name": "Insert Excel data to Postgres", "similarity": "28.5%" },
      { "name": "GitHub events to Slack", "similarity": "22.1%" },
      { "name": "Sync Google Spreadsheets", "similarity": "19.3%" }
    ]
  }
}
```

**User experience:** Clear explanation, actionable suggestions, understanding of what's available

---

## Advanced Features (Future Enhancements)

### 1. Category-Based Analysis

Query Supabase for workflow categories:
```sql
SELECT DISTINCT
  metadata->>'category' as category,
  COUNT(*) as workflow_count
FROM workflows
GROUP BY category
```

Include in gap report:
```
"The knowledge base has strong coverage in: Data Import/Export (15 workflows), Notifications (8 workflows), but limited coverage in: Email Processing (0 workflows), QA/Summarization (0 workflows)."
```

### 2. Recommendation Engine

Use LLM to suggest specific n8n nodes:
```
"To build this workflow yourself, you'll need these n8n nodes:
- Email Trigger (IMAP)
- HTTP Request (to OpenAI API for summarization)
- Postgres (to insert into approval queue)
- Conditional logic for approval routing"
```

### 3. Similar Query Suggestions

Vector search on past queries to find related searches:
```
"Other users have searched for:
- 'Email automation with database storage'
- 'Parse emails and extract data'
```

### 4. Knowledge Base Growth Tracking

Track requested workflow types:
```sql
CREATE TABLE gap_requests (
  id SERIAL PRIMARY KEY,
  query TEXT,
  missing_categories TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

Use to prioritize workflow ingestion.

---

## Cost Analysis

### Current Cost Per Query (with matches)
- Embedding generation: ~$0.0001
- Vector search: Free (Supabase)
- LLM filtering (5 workflows): ~$0.01
- Response generation: ~$0.005
- **Total: ~$0.015 per query**

### Cost Per Query (with gap analysis)
- All above costs: ~$0.015
- Gap analysis LLM call: ~$0.008
- **Total: ~$0.023 per query** (53% increase)

**Mitigation:**
- Only run gap analysis when needed (no valid matches)
- Cache gap reports for common missing categories
- Use GPT-4o-mini for gap analysis (~75% cost reduction)

---

## Testing Checklist

- [ ] Test with query that has no matches (all -1s)
- [ ] Verify gap report is generated
- [ ] Test with query that has matches (normal flow)
- [ ] Verify normal response is returned
- [ ] Test gap report quality with diverse queries
- [ ] Verify webhook still works
- [ ] Verify chatbot still works
- [ ] Check response time (should be <10 seconds)
- [ ] Verify suggestions are actionable

---

## Metrics to Track

1. **Gap Analysis Trigger Rate**
   - % of queries that trigger gap analysis
   - Target: <30% (as knowledge base grows)

2. **User Satisfaction**
   - Do users try suggested alternative queries?
   - Do gap reports help users understand coverage?

3. **Knowledge Base Improvement**
   - Track most common gap categories
   - Use to prioritize workflow ingestion

---

## Deployment Notes

1. **Implement incrementally:**
   - Step 1: Add gap trigger and IF node
   - Step 2: Test branching logic
   - Step 3: Add gap analysis LLM
   - Step 4: Update response formatting
   - Step 5: Test end-to-end

2. **Monitor performance:**
   - Check execution times
   - Monitor OpenAI API costs
   - Track gap analysis quality

3. **Iterate based on feedback:**
   - Adjust LLM prompts for better suggestions
   - Add more context to gap reports
   - Improve suggestion quality

---

**Status:** Design complete, ready for implementation

**Next Steps:**
1. Review design with user
2. Implement gap trigger node
3. Test IF branching logic
4. Add gap analysis LLM node
5. Update response formatting
6. Deploy and monitor
