# Troubleshooting: Ollama Embeddings Error in n8n

## Error Message
```
Ollama call failed with status code 400: "nomic-embed-text:latest" does not support generate
```

## Root Cause

The `nomic-embed-text` model is an **embeddings-only model** and doesn't support the `/api/generate` endpoint. It only works with the `/api/embeddings` endpoint.

The error occurs when n8n's Ollama Embeddings node tries to call the wrong API endpoint.

---

## Solution 1: Use Manual Vector Store Connection (RECOMMENDED)

Since the `@n8n/n8n-nodes-langchain.vectorStorePostgres` node isn't recognized in your n8n version, you need to manually configure the vector store.

### Steps:

1. **Import** `TIP_Agentic_RAG_Enhanced_Workflow_FINAL.json`

2. **Add Postgres Vector Store Node Manually:**
   - Click the `+` button in n8n
   - Search for "Postgres" or "Vector Store"
   - Add whichever Postgres Vector Store node is available in your version
   - Configure it:
     ```
     Operation: Load
     Table: knowledge_chunks
     Columns:
       - ID Column: id
       - Embedding Column: embedding
       - Content Column: content
     ```

3. **Connect the Vector Store:**
   ```
   Embeddings Ollama (ai_embedding output)
       ↓
   Postgres Vector Store (ai_embedding input)
       ↓
   Knowledge Search Tool (ai_vectorStore input)
   ```

4. **Connect Embeddings to Knowledge Search Tool:**
   - Also connect `Embeddings Ollama` directly to `Knowledge Search Tool`
   - This provides embeddings for query conversion

### Final Connection Pattern:
```
Embeddings Ollama
    ├─► (ai_embedding) → Postgres Vector Store → (ai_vectorStore) → Knowledge Search Tool
    └─► (ai_embedding) → Knowledge Search Tool (for query embeddings)
```

---

## Solution 2: Verify Ollama Configuration

The embeddings model might not be properly configured. Verify:

### Test Ollama Embeddings Directly:

```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text:latest",
  "prompt": "Test embedding"
}'
```

**Expected Response:**
```json
{
  "embedding": [0.123, 0.456, ...],
  "model": "nomic-embed-text:latest"
}
```

**If you get an error:**
```bash
# Re-pull the model
ollama pull nomic-embed-text:latest

# Verify it's installed
ollama list | grep nomic
```

---

## Solution 3: Check n8n Ollama Embeddings Node Configuration

In the **Embeddings Ollama** node, verify:

1. **Model Name:** `nomic-embed-text:latest` (exact match)
2. **Base URL:** `http://host.docker.internal:11434`
3. **No extra parameters** that might force it to use generate endpoint

### Correct Configuration:
```json
{
  "model": "nomic-embed-text:latest",
  "options": {
    "baseURL": "http://host.docker.internal:11434"
  }
}
```

---

## Solution 4: Alternative - Use Ollama Embeddings via HTTP Request

If the native Embeddings Ollama node doesn't work, create a custom tool:

### Create Code Tool for Embeddings:

```javascript
const fetch = require('node-fetch');

const query = $input.query || $input.first().json.query;

const response = await fetch('http://host.docker.internal:11434/api/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nomic-embed-text:latest',
    prompt: query
  })
});

const data = await response.json();

return {
  query: query,
  embedding: data.embedding,
  model: data.model
};
```

---

## Common Issues & Fixes

### Issue 1: "Model not found"

**Fix:**
```bash
ollama pull nomic-embed-text:latest
```

### Issue 2: "Connection refused"

**Fix:**
```bash
# Start Ollama service
ollama serve

# Or restart if already running
pkill ollama && ollama serve
```

### Issue 3: "Docker can't reach host.docker.internal"

**Fix - Linux:**
```bash
# Use host network mode in docker-compose.yml
network_mode: "host"

# Or add extra host
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Fix - Mac/Windows:**
```bash
# Should work by default, if not try:
baseURL: "http://host.docker.internal:11434"
# Or use container name if Ollama is in Docker:
baseURL: "http://ollama:11434"
```

### Issue 4: Wrong endpoint being called

This is typically a bug in n8n's Ollama node. Workarounds:

1. **Downgrade n8n** to a version that works (1.110.x)
2. **Use custom code tool** (Solution 4 above)
3. **Wait for n8n update** and check their GitHub issues

---

## Verification Steps

After applying fixes, verify:

### 1. Test Ollama Embeddings:
```bash
curl http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text:latest",
    "prompt": "test query"
  }' | jq .
```

### 2. Test Vector Store Connection:
```bash
# In n8n, execute just the Postgres Vector Store node
# Should connect without errors
```

### 3. Test Knowledge Search Tool:
```bash
# In n8n, execute Knowledge Search Tool
# Should return similar documents from database
```

### 4. Test Full Agent:
```bash
# Click "Chat" on Manual Chat Trigger
# Ask: "What documents are available?"
# Should get response from agent
```

---

## Working Configuration Summary

For your setup (n8n 1.116.2):

**Nodes Required:**
1. Manual Chat Trigger
2. TIP RAG AI Agent
3. Ollama Chat Model (llama3.2:latest)
4. Embeddings Ollama (nomic-embed-text:latest)
5. Postgres Vector Store (manually added)
6. Knowledge Search Tool
7. Other tools (List Documents, Get File Contents, etc.)
8. PostgreSQL Chat Memory

**Critical Connections:**
- Embeddings → Vector Store → Knowledge Search Tool
- Embeddings → Knowledge Search Tool (direct, for query embedding)
- All tools → Agent
- Chat Model → Agent
- Memory → Agent

**Credentials Needed:**
- TIP PostgreSQL (for Vector Store and Memory)

---

## If All Else Fails

Create a minimal test workflow with just:
1. Manual Chat Trigger
2. Simple Agent (no tools)
3. Ollama Chat Model

This will verify if the issue is with:
- Agent setup (if minimal works)
- Tool configuration (if agent works but tools fail)
- Embeddings specifically (if other tools work but Knowledge Search fails)

---

## Report to n8n Team

If the issue persists, report to n8n:

**GitHub Issue Template:**
```
Title: Ollama Embeddings node calling wrong endpoint

Version: n8n 1.116.2
Node: @n8n/n8n-nodes-langchain.embeddingsOllama v1
Model: nomic-embed-text:latest

Error: "nomic-embed-text:latest" does not support generate

Expected: Should call /api/embeddings
Actual: Calling /api/generate

Workaround: Using custom HTTP Request tool
```

**GitHub:** https://github.com/n8n-io/n8n/issues

---

## Next Steps

After fixing embeddings:
1. Test manual chat (should work)
2. Add webhook trigger for API integration
3. Test document upload workflow
4. Verify RAG query returns relevant results
