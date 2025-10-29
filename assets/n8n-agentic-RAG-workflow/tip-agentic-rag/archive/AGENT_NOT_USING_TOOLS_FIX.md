# Fix: Agent Not Using Tools & Wrong Responses

## Problem Summary

**Your Issue:**
- Asked: "how many records do you have?"
- Got: Generic response about transition best practices
- Agent took a long time but didn't use any tools
- Database has 40 documents but 0 chunks (not processed)

---

## Root Causes

### 1. **Documents Never Processed**

Your 40 documents are stuck in "EMBEDDING" status because:
- n8n document processing workflow was never triggered
- No chunks created (chunk_count = 0)
- No embeddings generated
- Agent has nothing to search

### 2. **Agent Not Calling Tools**

The agent generates responses from its base knowledge instead of calling tools because:
- Tool descriptions may be too vague
- Agent prompt doesn't emphasize tool usage
- n8n LangChain agent configuration issue

### 3. **Performance is Slow**

Ollama models (especially llama3.2) can be slow on:
- CPU-only systems
- Limited RAM
- During first run (model loading)

---

## Immediate Fixes

### Fix 1: Improve Agent Prompt (Force Tool Usage)

Update your agent's system prompt to be more directive:

```
You are a TIP knowledge base assistant.

IMPORTANT: You MUST use the available tools to answer questions. DO NOT make up answers.

Available Tools:
1. list_documents - Use this to count documents or list what's available
2. knowledge_search - Search document content
3. get_file_contents - Get full document text
4. query_document_rows - Query CSV/Excel data
5. search_facts - Search extracted facts

When asked "how many records/documents do you have?":
- ALWAYS call the list_documents tool first
- Count the results
- Report the number

When asked about content:
- Use knowledge_search tool
- If no results, say "I found no relevant information"

DO NOT generate answers without using tools!
```

### Fix 2: Process the 40 Documents

Your documents need to be chunked and embedded. Options:

**Option A: Trigger n8n workflow manually for each document**

Create a script to trigger document processing:

```bash
#

!/bin/bash
# reprocess-documents.sh

# Get all unprocessed documents
docker-compose exec -T db psql -U user -d tip -c "
SELECT id, filename, storage_path
FROM knowledge_documents
WHERE chunk_count = 0
ORDER BY created_at DESC;
" -t -A -F'|' | while IFS='|' read -r doc_id filename storage_path; do
  echo "Processing: $filename"

  # Trigger n8n document processing webhook
  curl -X POST http://n8n.tip.localhost/webhook/tip-document-processing \
    -H "Content-Type: application/json" \
    -d "{
      \"document_id\": \"$doc_id\",
      \"filename\": \"$filename\",
      \"storage_path\": \"$storage_path\"
    }"

  echo "Triggered for: $filename"
  sleep 2  # Delay between requests
done
```

**Option B: Reset and reupload**

If documents are in MinIO, you can reset their status and let the TIP frontend re-trigger processing:

```sql
-- Reset document status
UPDATE knowledge_documents
SET upload_status = 'UPLOADED',
    n8n_execution_status = 'NONE',
    chunk_count = 0
WHERE chunk_count = 0;
```

Then use the TIP frontend to "reprocess" or trigger the upload flow again.

### Fix 3: Test Tool Calling with Simple Prompt

In the n8n Manual Chat, try this exact prompt:

```
Use the list_documents tool to count how many documents are in the knowledge base. Report the exact number.
```

This explicitly tells the agent to use the tool. If it works, the issue is the agent prompt. If it doesn't, there's a deeper configuration problem.

---

## Verify Tool Configuration

### Check 1: List Documents Tool URL

In n8n, verify the **List Documents Tool** has:
```
URL: http://backend-node:3000/api/knowledge/documents
Method: GET
Headers: Content-Type: application/json
```

**Test from n8n container:**
```bash
docker-compose exec n8n sh -c "
  curl -s http://backend-node:3000/api/knowledge/documents | head -50
"
```

Should return JSON array of documents.

### Check 2: Tool Connections

Verify in n8n:
```
List Documents Tool
    └─► (ai_tool - orange connection)
        └─► TIP RAG AI Agent
```

### Check 3: Agent Configuration

In the **TIP RAG AI Agent** node:
- Agent Type: `conversationalAgent`
- Has Output Parser: ✅ Enabled
- All 5 tools connected
- Chat model connected
- Memory connected

---

## Debug: See What Agent Is Doing

### Add Logging to Agent Prompt

Temporarily add this to your agent prompt:

```
Before responding, state which tools you are considering using and why.

Example format:
"I will use the [tool_name] tool because [reason].
Let me execute that now..."
```

This forces the agent to explain its tool choices before executing.

### Check n8n Execution Logs

After running a chat:
1. Go to n8n → **Executions**
2. Click on your latest execution
3. Expand the **TIP RAG AI Agent** node
4. Look for "Tool Calls" in the output
5. Should see: `{"tool": "list_documents", "input": {...}}`

If you DON'T see tool calls, the agent isn't using tools at all.

---

## Advanced: Force Tool Usage

If the agent still won't call tools, configure it as a **Tools Agent** instead of **Conversational Agent**:

### Option: Use React Agent

In n8n, change the agent type:
- Current: `conversationalAgent`
- Change to: `toolsAgent` (if available)

Tools agents are more aggressive about using tools.

### Option: Create Tool-Calling Prompt

Use a prompt that forces tool selection:

```
You are a knowledge base assistant. You answer questions ONLY by calling tools.

Step-by-step process:
1. Analyze the user's question
2. Decide which tool to use:
   - "how many documents" → list_documents
   - "what information about X" → knowledge_search
   - "show me document Y" → get_file_contents
   - "calculate/aggregate" → query_document_rows
   - "what facts about" → search_facts
3. Call the tool
4. Report the results

If a tool returns no results, say "I found no information" - do NOT make up an answer.

Current tools available: {{TOOLS}}
```

---

## Test Checklist

After implementing fixes:

### Test 1: Tool Availability
```
User: "List the available tools"
Expected: Agent lists all 5 tools

User: "Use the list_documents tool"
Expected: Agent calls list_documents and shows results
```

### Test 2: Direct Count Question
```
User: "How many documents are in the knowledge base?"
Expected: Agent calls list_documents, counts results, returns "40 documents"
```

### Test 3: Content Search (After Processing Docs)
```
User: "Search for information about contracts"
Expected: Agent calls knowledge_search, returns relevant chunks
```

### Test 4: No Results Scenario
```
User: "Tell me about quantum physics"
Expected: Agent calls knowledge_search, gets no results, says "No information found"
NOT: Generic made-up answer about quantum physics
```

---

## Troubleshooting Tool Calls

### Issue: Agent says "I don't have access to tools"

**Fix:**
- Check tool connections in n8n (orange ai_tool connections)
- Verify agent node has tools connected
- Restart n8n workflow

### Issue: Tools return errors

**Fix for list_documents:**
```bash
# Test endpoint manually
docker-compose exec n8n curl -v http://backend-node:3000/api/knowledge/documents
```

If 404: Route doesn't exist in backend
If 500: Backend error, check logs
If timeout: Backend not responding

**Fix for knowledge_search:**
```sql
-- Verify function exists
docker-compose exec db psql -U user -d tip -c "\df match_knowledge_chunks"
```

If not found: Run migration again

### Issue: Agent uses tools but slowly

**Causes:**
1. Ollama CPU inference is slow
2. Large context window
3. Complex tool descriptions

**Fixes:**
- Reduce `contextWindowLength` in memory (from 10 to 5)
- Shorten tool descriptions
- Use faster model: `llama3.2:latest` → `llama3:latest` or `gemma3:1b`
- Check Ollama is using GPU: `ollama ps`

---

## Expected Behavior

### Correct Response to "How many records do you have?"

**With processed documents:**
```
I'll check the knowledge base for you.

[Tool Call: list_documents]

I found 40 documents in the knowledge base, including:
- A_Civil_War_Cartoonist_Created_the_Modern_Image_of_Santa_Claus...
- test-document.txt
- Jewelry_Framework_Presentation.pdf
...

However, I notice these documents haven't been fully processed yet (0 chunks). Would you like me to help you reprocess them?
```

**With processed documents + chunks:**
```
[Tool Call: list_documents]
[Tool Call: knowledge_search with query ""]

I have 40 documents in the knowledge base with approximately 1,247 searchable chunks covering topics like:
- Contract transitions
- Government procedures
- Technical documentation
...
```

---

## Next Steps

1. **Improve agent prompt** (use template above)
2. **Process the 40 documents** (use reprocess script)
3. **Test with explicit tool instruction**: "Use list_documents tool"
4. **Check n8n execution logs** for tool calls
5. **If still not working**: Share n8n execution log output

Once documents are processed and agent is calling tools correctly, you'll get accurate, tool-based responses instead of hallucinated answers.
