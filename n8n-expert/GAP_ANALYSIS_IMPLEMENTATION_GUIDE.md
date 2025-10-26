# Gap Analysis Node - Implementation Guide

**Quick Start:** Step-by-step instructions to add gap analysis to your N8N Expert Agent workflow

**Time Required:** 15-20 minutes

---

## What You'll Build

**Current behavior:**
```
User query → No matches → Empty response [{}]
```

**New behavior:**
```
User query → No matches → Gap analysis report with:
  - What you're looking for
  - What's available
  - Why no match
  - Suggested alternatives
```

---

## Prerequisites

- ✅ N8N Expert Agent workflow imported and working
- ✅ OpenAI credentials configured
- ✅ Familiar with n8n node editor

---

## Implementation Steps

### Step 1: Locate the Insertion Point

1. Open your N8N Expert Agent workflow
2. Find the **"Aggregate"** node (the one after all the LLM filter nodes)
3. This is where we'll add the gap analysis logic

**Current flow:**
```
Aggregate → Code (format workflow IDs) → Supabase (fetch details)
```

**New flow:**
```
Aggregate → Gap Trigger → IF Node ──┬─> Gap Analysis LLM
                                     └─> Normal Flow
```

---

### Step 2: Add Gap Analysis Trigger Node

**Node Type:** Code

**Configuration:**

1. Click **"+"** after the Aggregate node
2. Select **"Code"**
3. Name: `Gap Analysis Trigger`
4. Mode: `Run Once for All Items`
5. Language: `JavaScript`
6. Code:

```javascript
// Get all filtered workflow IDs
const items = $input.all();
const allWorkflowIds = [];

// Collect all workflow IDs from filtered results
items.forEach(item => {
  if (item.json.workflow_id !== undefined) {
    allWorkflowIds.push(item.json.workflow_id);
  }
});

// Count valid matches (not -1)
const validMatches = allWorkflowIds.filter(id => id !== -1);
const needsGapAnalysis = validMatches.length === 0;

// Get original query and matched workflows from the first item
const firstItem = items[0].json;

return [{
  json: {
    filtered_workflow_ids: allWorkflowIds,
    valid_workflow_ids: validMatches,
    needsGapAnalysis: needsGapAnalysis,
    hasValidMatches: validMatches.length > 0,
    match_count: validMatches.length,
    original_query: firstItem.query || firstItem.chatInput || "Unknown query",
    // Pass through data for normal flow
    ...firstItem
  }
}];
```

7. Click **"Save"**

---

### Step 3: Add IF Node for Branching

**Node Type:** IF

**Configuration:**

1. Add an **IF** node after "Gap Analysis Trigger"
2. Name: `Check for Matches`
3. Conditions:
   - **Condition 1:**
     - Value 1: `{{ $json.hasValidMatches }}`
     - Operation: `Equal`
     - Value 2: `true`

4. This creates two branches:
   - **True** (has matches) → Continue to normal workflow
   - **False** (no matches) → Trigger gap analysis

---

### Step 4: Add Gap Analysis LLM Node (False Branch)

**Node Type:** OpenAI Chat Model

**Configuration:**

1. Connect to the **FALSE** output of the IF node
2. Name: `Generate Gap Report`
3. Model: `gpt-4o`
4. Messages:

**System Message:**
```
You are a helpful assistant analyzing knowledge base gaps for an n8n workflow recommendation system. Provide concise, actionable gap analysis reports.
```

**User Message:**
```
Analyze this knowledge base gap:

USER QUERY:
{{ $json.original_query }}

WORKFLOWS FOUND BY VECTOR SEARCH:
The vector search found workflows but they were all filtered as not relevant by the LLM.

YOUR TASK:
Generate a gap analysis with these sections (keep each to 2-3 sentences):

1. USER NEEDS: What type of workflow is the user looking for based on their query?

2. KNOWLEDGE BASE STATUS: What types of workflows are currently available? (General categories like "data import/export", "notifications", etc.)

3. IDENTIFIED GAPS: What's missing that prevents us from helping this user?

4. ACTIONABLE SUGGESTIONS:
   - Alternative search queries they could try
   - Manual workflow building suggestions with specific n8n nodes
   - Related workflows that might partially help

Format as JSON:
{
  "user_needs": "...",
  "available_workflows": "...",
  "identified_gaps": "...",
  "suggestions": "..."
}
```

5. Options:
   - Temperature: `0.7`
   - Max Tokens: `500`

6. Click **"Save"**

---

### Step 5: Add Parse Gap Report Node

**Node Type:** Code

**Configuration:**

1. Add after "Generate Gap Report"
2. Name: `Parse Gap Report`
3. Code:

```javascript
const items = $input.all();
const gapAnalysisText = items[0].json.response?.generations?.[0]?.[0]?.text || items[0].json.text || "{}";

// Try to parse JSON from the response
let gapReport;
try {
  // Remove markdown code blocks if present
  const cleaned = gapAnalysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  gapReport = JSON.parse(cleaned);
} catch (error) {
  // Fallback if parsing fails
  gapReport = {
    user_needs: "Unable to parse gap analysis",
    available_workflows: gapAnalysisText,
    identified_gaps: "Parsing error",
    suggestions: "Please try rephrasing your query."
  };
}

// Pass through previous data and add parsed gap report
return [{
  json: {
    ...items[0].json,
    gap_analysis: gapReport,
    needsGapAnalysis: true
  }
}];
```

4. Click **"Save"**

---

### Step 6: Modify Normal Flow (True Branch)

**Configuration:**

1. The **TRUE** branch should continue with the existing workflow
2. Connect it to wherever the Aggregate node previously connected (likely a Supabase fetch node)
3. This preserves the normal behavior when matches are found

---

### Step 7: Add Response Formatter Node

**Node Type:** Code

**Configuration:**

1. Add a **Merge** node to combine both branches
2. Connect both branches (gap analysis and normal flow) to this Merge
3. After Merge, add a **Code** node
4. Name: `Format Final Response`
5. Code:

```javascript
const items = $input.all();
const data = items[0].json;

// Check if this is a gap analysis response or normal response
if (data.needsGapAnalysis && data.gap_analysis) {
  // Gap analysis response
  return [{
    json: {
      output: "I couldn't find workflows that directly match your query. Here's what I found:",
      data: [],
      gap_report: {
        what_you_need: data.gap_analysis.user_needs,
        what_we_have: data.gap_analysis.available_workflows,
        the_gap: data.gap_analysis.identified_gaps,
        suggestions: data.gap_analysis.suggestions
      },
      metadata: {
        total_matches: 0,
        query: data.original_query,
        gap_analysis_generated: true
      }
    }
  }];
} else {
  // Normal response with workflow matches
  // Build workflow data from fetched results
  const workflows = items
    .filter(item => item.json.workflow_id && item.json.workflow_id !== -1)
    .map(item => ({
      workflow_id: item.json.workflow_id,
      workflow_name: item.json.workflow_name,
      workflow_description: item.json.workflow_description,
      similarity: item.json.similarity
    }));

  return [{
    json: {
      output: "Here are the recommended workflows to use as an example for you:",
      data: workflows,
      metadata: {
        total_matches: workflows.length,
        query: data.original_query
      }
    }
  }];
}
```

6. Click **"Save"**

---

### Step 8: Connect to Response Node

**Configuration:**

1. Connect "Format Final Response" to the **"Respond to Webhook"** node
2. This ensures both gap analysis and normal responses are returned properly

---

## Final Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Existing Workflow                            │
│  Webhook/Chatbot → Edit Fields → Embeddings → Vector Search     │
│        → LLM Filters (x5) → Aggregate                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Gap Analysis      │
                    │ Trigger (Code)    │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  IF: Has Matches? │
                    └────┬──────────┬───┘
                         │          │
                    TRUE │          │ FALSE
                         │          │
                         ▼          ▼
              ┌──────────────┐  ┌─────────────────┐
              │ Normal Flow  │  │ Generate Gap    │
              │ (Supabase    │  │ Report (LLM)    │
              │  fetch)      │  └────────┬────────┘
              └──────┬───────┘           │
                     │                   ▼
                     │          ┌─────────────────┐
                     │          │ Parse Gap       │
                     │          │ Report (Code)   │
                     │          └────────┬────────┘
                     │                   │
                     └──────┬────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Merge         │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │ Format Final      │
                    │ Response (Code)   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Respond to        │
                    │ Webhook           │
                    └───────────────────┘
```

---

## Testing

### Test 1: Query with No Matches

**Test Query:**
```json
{
  "query": "Create a workflow to analyze customer sentiment from social media posts"
}
```

**Expected Response:**
```json
{
  "output": "I couldn't find workflows that directly match your query. Here's what I found:",
  "data": [],
  "gap_report": {
    "what_you_need": "...",
    "what_we_have": "...",
    "the_gap": "...",
    "suggestions": "..."
  },
  "metadata": {
    "total_matches": 0,
    "query": "Create a workflow to analyze customer sentiment...",
    "gap_analysis_generated": true
  }
}
```

### Test 2: Query with Matches

**Test Query:**
```json
{
  "query": "How do I transfer data from PostgreSQL to Excel?"
}
```

**Expected Response:**
```json
{
  "output": "Here are the recommended workflows to use as an example for you:",
  "data": [
    {
      "workflow_id": 2,
      "workflow_name": "Transfer data from Postgres to Excel",
      "similarity": 0.5022
    }
  ],
  "metadata": {
    "total_matches": 1,
    "query": "How do I transfer data from PostgreSQL to Excel?"
  }
}
```

---

## Troubleshooting

### Issue: Gap report not generating

**Check:**
1. Verify IF node condition: `{{ $json.hasValidMatches }}`
2. Check execution path - is it going to FALSE branch?
3. Look at "Gap Analysis Trigger" output - is `needsGapAnalysis` true?

### Issue: JSON parsing error

**Check:**
1. Look at "Generate Gap Report" output
2. Verify it's returning valid JSON
3. Adjust the Parse Gap Report code to handle edge cases

### Issue: Normal flow broken

**Check:**
1. Verify TRUE branch still connects to Supabase fetch
2. Check Merge node is collecting both branches
3. Verify "Format Final Response" handles both cases

---

## Performance Optimization

### Cost Reduction

**Current setup:**
- Gap analysis LLM call: ~$0.008 per query

**Optimization:**
1. Change to `gpt-4o-mini` (75% cost savings)
2. Cache common gap reports
3. Reduce max tokens to 300

### Speed Optimization

**Current setup:**
- Gap analysis adds ~2-3 seconds

**Optimization:**
1. Run gap analysis only when needed (already implemented)
2. Use streaming for LLM response
3. Cache workflow category summaries

---

## Next Steps

1. ✅ Implement the nodes following this guide
2. ✅ Test with queries that have no matches
3. ✅ Test with queries that have matches
4. ✅ Verify both webhook and chatbot triggers work
5. ✅ Monitor gap analysis quality
6. 📊 Collect gap analysis data to improve knowledge base

---

## Advanced: Category-Based Gap Analysis

To make gap reports more accurate, add this enhancement:

### Query Workflow Categories

Add a Supabase node before gap analysis LLM:

**SQL Query:**
```sql
SELECT
  metadata->>'category' as category,
  COUNT(*) as count,
  array_agg(workflow_name ORDER BY workflow_id LIMIT 3) as examples
FROM workflows
GROUP BY metadata->>'category'
ORDER BY count DESC
LIMIT 10;
```

**Use in gap analysis prompt:**
```
AVAILABLE CATEGORIES IN KNOWLEDGE BASE:
{{ $json.categories.map(c => `- ${c.category}: ${c.count} workflows (e.g., ${c.examples.join(', ')})`).join('\n') }}
```

This provides much more accurate gap analysis!

---

**Status:** Ready to implement

**Estimated Time:** 15-20 minutes

**Difficulty:** Medium

**Support:** See TROUBLESHOOTING_LOG.md for help
