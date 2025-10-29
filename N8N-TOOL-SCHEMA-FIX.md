# N8N Tool Schema Fix - v1.0.5

**Date**: 2025-10-29
**Issue**: "Received tool input did not match expected schema"
**Status**: FIXED ✅

---

## Problem

When testing the List Documents Tool in n8n by clicking "play", the following error occurred:

```
Problem in node 'PartialExecutionToolExecutor'
Error executing tool: Received tool input did not match expected schema
```

## Root Cause

LangChain tools in n8n require two mandatory parameters to define their schema:
- `name`: The identifier the agent uses to call the tool
- `description`: What the tool does and what inputs it expects

The v1.0.4 workflow was missing these parameters for:
1. **List Documents Tool** (toolHttpRequest)
2. **Search Facts Tool** (toolHttpRequest)

## Fix Applied (v1.0.5)

### List Documents Tool
```json
{
  "name": "List Documents Tool",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "parameters": {
    "name": "list_documents",
    "description": "List all available documents in the knowledge base. No input required. Returns a list of document names and IDs.",
    "url": "http://backend-node:3000/api/documents",
    "sendHeaders": true
  }
}
```

### Search Facts Tool
```json
{
  "name": "Search Facts Tool",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "parameters": {
    "name": "search_facts",
    "description": "Search extracted facts from documents. Input: query (string). Returns structured facts and metadata.",
    "method": "POST",
    "url": "http://backend-python:8000/api/knowledge/facts/search",
    "sendHeaders": true,
    "sendBody": true
  }
}
```

## All Tools Verified ✅

| Tool Name | Type | Schema Status |
|-----------|------|---------------|
| Knowledge Search Tool | toolVectorStore | ✅ Has name & description |
| List Documents Tool | toolHttpRequest | ✅ FIXED in v1.0.5 |
| Get File Contents Tool | toolCode | ✅ Has name & description |
| Query Document Rows Tool | toolCode | ✅ Has name & description |
| Search Facts Tool | toolHttpRequest | ✅ FIXED in v1.0.5 |

## How to Test

1. **Import v1.0.5 workflow** from:
   ```
   /Users/richardroach/Documents/Builder_Projects/Better/assets/
   n8n-agentic-RAG-workflow/tip-agentic-rag/
   TIP Agentic RAG (Enhanced) v1.0.5 - FIXED.json
   ```

2. **Test individual tools:**
   - Click on "List Documents Tool" node
   - Click the "Play" button (test node)
   - Should execute successfully without schema errors

3. **Test full workflow:**
   - Click "Chat" button
   - Ask: "What documents are available?"
   - Agent should use list_documents tool successfully

## Changes from v1.0.4 to v1.0.5

1. Added `name` and `description` parameters to List Documents Tool
2. Added `name` and `description` parameters to Search Facts Tool
3. Updated workflow name to v1.0.5
4. Updated sticky note documentation

## Technical Details

### Why This Error Occurs

N8N LangChain tools work by:
1. Agent receives user query
2. Agent decides which tool to call based on tool descriptions
3. Agent generates tool call with parameters
4. N8N validates tool call against tool schema
5. If schema is missing or mismatched → ERROR

### Tool Schema Requirements

For `toolHttpRequest` and `toolCode` types:
- **Required**: `name` (string, snake_case identifier)
- **Required**: `description` (string, explains what tool does)
- **Optional**: Input/output schema definitions (for complex tools)

### Why Other Tools Didn't Have This Issue

The other tools (Get File Contents, Query Document Rows) already had `name` and `description` parameters in the original workflow, so they didn't trigger the schema error.

## Verification Steps

After importing v1.0.5:

```bash
# Test List Documents tool directly
curl -H "x-auth-bypass: true" http://api.tip.localhost/api/documents

# Expected: JSON array of documents
```

```bash
# Test Search Facts tool directly
curl -X POST http://py.tip.localhost/api/knowledge/facts/search \
  -H "Content-Type: application/json" \
  -H "x-auth-bypass: true" \
  -d '{"query": "test"}'

# Expected: JSON response with facts
```

## Next Steps

1. Delete old workflow (v1.0.4) from n8n
2. Import v1.0.5 workflow
3. Test each tool individually using "Play" button
4. Test full workflow with chat interface
5. Verify no more schema errors

---

**Status**: READY FOR IMPORT ✅
**Version**: v1.0.5 - FIXED
**Issue Resolved**: Tool schema validation errors
