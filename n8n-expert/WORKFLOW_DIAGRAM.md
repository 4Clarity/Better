# N8N Expert Agent Workflow - Visual Diagram

## Complete Workflow Flow with Gap Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
           ┌───────▼────────┐    ┌──────▼────────┐
           │   Webhook      │    │   Chatbot     │
           │   Trigger      │    │   Trigger     │
           └───────┬────────┘    └──────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA EXTRACTION                                  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Edit Fields       │
                   │  (Extract: query,   │
                   │   user_id, etc.)    │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Supabase2         │
                   │  (Log user query)   │
                   └──────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                      VECTOR SEARCH                                       │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │ Embeddings OpenAI   │
                   │  (text-embedding-   │
                   │   3-small)          │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │ Supabase Vector     │
                   │ Store (Find top 5   │
                   │ similar workflows)  │
                   └──────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                      LLM FILTERING                                       │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Basic LLM Chain    │
                   │  (5x parallel -     │
                   │   filter relevant   │
                   │   workflows)        │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │    Aggregate        │
                   │  (Collect workflow  │
                   │   IDs: [1,-1,2,...]│
                   └──────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                    🆕 GAP ANALYSIS TRIGGER                               │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │ Gap Analysis        │
                   │ Trigger (Code)      │
                   │ Check: valid IDs?   │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │ Check for Matches   │
                   │ (IF Node)           │
                   └────┬────────────┬───┘
                        │            │
                   TRUE │            │ FALSE
                 (Has   │            │ (No
                Matches)│            │ Matches)
                        │            │
┌───────────────────────┼────────────┼───────────────────────────────────┐
│                       │            │                                    │
│  NORMAL FLOW          │            │         GAP ANALYSIS FLOW         │
│  (Workflows Found)    │            │         (No Workflows Found)      │
│                       │            │                                    │
│       ┌───────────────▼──────┐     │     ┌────────────────────────┐   │
│       │    Summarize         │     │     │ Gap Analysis Chat      │   │
│       │  (Format workflow    │     │     │ Model (GPT-4o-mini)    │   │
│       │   IDs)               │     │     └──────────┬─────────────┘   │
│       └──────────┬───────────┘     │                │                  │
│                  │                 │     ┌──────────▼─────────────┐   │
│       ┌──────────▼───────────┐     │     │ Generate Gap Report    │   │
│       │    Code              │     │     │ (Basic LLM Chain)      │   │
│       │  (Build query string)│     │     │ - What user needs      │   │
│       └──────────┬───────────┘     │     │ - What we have         │   │
│                  │                 │     │ - Identified gaps      │   │
│       ┌──────────▼───────────┐     │     │ - Suggestions          │   │
│       │    Supabase          │     │     └──────────┬─────────────┘   │
│       │  (Fetch workflow     │     │                │                  │
│       │   details)           │     │     ┌──────────▼─────────────┐   │
│       └──────────┬───────────┘     │     │ Parse Gap Report       │   │
│                  │                 │     │ (Code - Extract JSON)  │   │
│       ┌──────────▼───────────┐     │     └──────────┬─────────────┘   │
│       │   Aggregate1         │     │                │                  │
│       │  (Collect all        │     │                │                  │
│       │   workflow data)     │     │                │                  │
│       └──────────┬───────────┘     │                │                  │
│                  │                 │                │                  │
└──────────────────┼─────────────────┼────────────────┼──────────────────┘
                   │                 │                │
                   └────────┬────────┴────────────────┘
                            │
┌─────────────────────────────────────────────────────────────────────────┐
│                    🆕 MERGE & FORMAT                                     │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Merge Responses    │
                 │  (Combine both      │
                 │   branches)         │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Format Final        │
                 │ Response (Code)     │
                 │ • Normal: workflows │
                 │ • Gap: gap_report   │
                 └──────────┬──────────┘
                            │
┌─────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE LOGGING                                  │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │   Supabase1         │
                 │  (Log AI response   │
                 │   with gap_report)  │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │   Edit Fields2      │
                 │  (Format for output:│
                 │   output, data,     │
                 │   gap_report)       │
                 └──────────┬──────────┘
                            │
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                         │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Respond to Webhook  │
                 │ (Return JSON to     │
                 │  user)              │
                 └─────────────────────┘
```

## Key Components

### 🆕 New Nodes (Gap Analysis Feature)

1. **Gap Analysis Trigger** - Detects when all workflows filtered out
2. **Check for Matches** - IF node that routes to gap analysis or normal flow
3. **Gap Analysis Chat Model** - GPT-4o-mini for cost-effective analysis
4. **Generate Gap Report** - LLM chain that creates gap analysis
5. **Parse Gap Report** - Extracts JSON from LLM response
6. **Merge Responses** - Combines gap analysis and normal flow
7. **Format Final Response** - Creates unified response structure

### 📊 Data Flow Examples

#### Example 1: Query with Matches

```
User: "Transfer data from PostgreSQL to Excel"
  ↓
Vector Search: Finds 5 similar workflows
  ↓
LLM Filter: workflow_id=[2, -1, -1, -1, -1]
  ↓
Gap Trigger: hasValidMatches = true
  ↓
IF Node: TRUE branch
  ↓
Fetch workflow #2 details
  ↓
Response: {
  "output": "Here are the recommended workflows...",
  "data": [{workflow_id: 2, ...}]
}
```

#### Example 2: Query without Matches (Gap Analysis)

```
User: "Create sentiment analysis for social media"
  ↓
Vector Search: Finds 5 workflows (database/spreadsheet related)
  ↓
LLM Filter: workflow_id=[-1, -1, -1, -1, -1] (all irrelevant)
  ↓
Gap Trigger: hasValidMatches = false, needsGapAnalysis = true
  ↓
IF Node: FALSE branch
  ↓
Generate Gap Report:
  - User needs: sentiment analysis, social media monitoring
  - Available: database import/export, spreadsheet sync
  - Gap: NLP/ML workflows, social media connectors
  - Suggestions: Try "social media webhook" or build custom
  ↓
Response: {
  "output": "I couldn't find workflows...",
  "data": [],
  "gap_report": {
    "what_you_need": "...",
    "what_we_have": "...",
    "the_gap": "...",
    "suggestions": "..."
  }
}
```

---

## Node Positions (For Manual Verification)

| Node Name | X | Y | Notes |
|-----------|---|---|-------|
| Gap Analysis Trigger | 1920 | 640 | After Aggregate |
| Check for Matches | 2120 | 640 | IF node |
| Generate Gap Report | 2320 | 840 | FALSE branch |
| Gap Analysis Chat Model | 2500 | 840 | LLM model |
| Parse Gap Report | 2700 | 840 | Parse JSON |
| Merge Responses | 2900 | 640 | Merge point |
| Format Final Response | 3100 | 640 | Before Supabase1 |

---

## Connection Summary

### New Connections Added

```javascript
// Gap analysis flow
Aggregate → Gap Analysis Trigger
Gap Analysis Trigger → Check for Matches
Check for Matches (TRUE) → Summarize
Check for Matches (FALSE) → Generate Gap Report
Gap Analysis Chat Model → Generate Gap Report (AI model)
Generate Gap Report → Parse Gap Report
Parse Gap Report → Merge Responses

// Modified connections
Aggregate1 → Merge Responses (instead of Edit Fields1)
Merge Responses → Format Final Response
Format Final Response → Supabase1
```

### Preserved Connections

```javascript
// Normal flow (unchanged)
Webhook → Edit Fields
Edit Fields → Supabase2
Supabase2 → Supabase Vector Store
Embeddings OpenAI → Supabase Vector Store
Supabase Vector Store → Basic LLM Chain
OpenAI Chat Model → Basic LLM Chain
Basic LLM Chain → Aggregate

// Response flow (updated to use Format Final Response)
Supabase1 → Edit Fields2
Edit Fields2 → Respond to Webhook
```

---

## Execution Metrics

### Normal Flow (With Matches)
- **Nodes Executed:** 15
- **Avg Time:** 3-5 seconds
- **Cost:** ~$0.01

### Gap Analysis Flow (No Matches)
- **Nodes Executed:** 16
- **Avg Time:** 5-8 seconds
- **Cost:** ~$0.012

---

This workflow now provides intelligent feedback whether matches are found or not!
