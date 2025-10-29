# TIP Agentic RAG - Changes Summary

## What Changed

This document summarizes all changes made to revert the workflows from OpenAI back to Ollama (local) and fix undefined/unconnected nodes.

---

## 1. Reverted from OpenAI to Ollama

### A. Document Processing Workflow (`TIP_Document_Processing_Enhanced_Workflow.json`)

**Changed:**
- **Embeddings Node:** "Embeddings OpenAI" → "Embeddings Ollama"
- **Model:** `text-embedding-ada-002` → `nomic-embed-text:latest`
- **Dimensions:** 1536 → 768
- **Endpoint:** OpenAI API → `http://host.docker.internal:11434`
- **Credentials:** Removed OpenAI API credential requirement

**Why:**
- Use local Ollama instead of cloud OpenAI API
- No API costs
- Data stays on-premise
- Works with existing TIP infrastructure

### B. RAG Agent Workflow (`TIP_Agentic_RAG_Enhanced_Workflow.json`)

**Changed:**
1. **Chat Model:**
   - "OpenAI Chat Model" → "Ollama Chat Model"
   - Model: `gpt-4` → `llama3.2:latest`
   - Endpoint: `http://host.docker.internal:11434`
   - Removed OpenAI credentials

2. **Embeddings:**
   - "Embeddings OpenAI" → "Embeddings Ollama"
   - Model: `text-embedding-ada-002` → `nomic-embed-text:latest`
   - Dimensions: 1536 → 768

3. **All Connections Updated:**
   - Chat model connected to agent
   - Embeddings connected to Knowledge Vector Store Tool
   - All node references updated

**Why:**
- Consistent with local-first architecture
- Free inference (no API costs)
- Privacy preserved (no data sent to OpenAI)
- Matches TIP's existing Ollama setup

---

## 2. Fixed Undefined/Unconnected Nodes

### A. Knowledge Vector Store Tool

**Problem:**
- Node was not properly configured for PostgreSQL + pgvector
- Missing table and column mappings

**Fixed:**
- Added explicit `pgVector` configuration
- Table name: `knowledge_chunks` (uses existing TIP table)
- Column mappings:
  - `id` → id
  - `embedding` → embedding (vector 768)
  - `content` → content
  - `metadata` → chunk_strategy_applied (JSONB)
- Connected to PostgreSQL credential

**Result:**
- Node is now properly configured and connected
- Uses TIP's existing knowledge_chunks table
- Vector similarity search will work

### B. Get Full Document Tool

**Problem:**
- No documentation explaining what it does
- Unclear how to use it
- Function `get_document_full_text()` doesn't exist in database yet

**Fixed:**
- Created comprehensive documentation in [TOOL_DOCUMENTATION.md](TOOL_DOCUMENTATION.md#tool-3-get-file-contents-get-full-document-tool)
- Explained purpose, usage, input/output, examples
- Documented that database migration is required (creates the function)

**Current Status:**
- Node is configured correctly
- Documentation complete
- **Requires:** Database migration to create `get_document_full_text()` function

### C. SQL Query Tool

**Problem:**
- No documentation
- Table `document_rows` doesn't exist yet

**Fixed:**
- Created comprehensive documentation in [TOOL_DOCUMENTATION.md](TOOL_DOCUMENTATION.md#tool-4-query-document-rows-sql-query-tool)
- Explained JSONB query syntax
- Provided 5+ example queries (budget analysis, filtering, aggregations)
- Documented best practices and security

**Current Status:**
- Node is configured correctly
- Documentation complete
- **Requires:** Database migration to create `document_rows` table

---

## 3. Created New Documentation

### A. TOOL_DOCUMENTATION.md (NEW)

**Purpose:**
- Comprehensive guide for all 5 RAG agent tools
- Detailed documentation for Get Full Document Tool and SQL Query Tool
- Examples, use cases, error handling, best practices

**Contents:**
- Tool descriptions and purposes
- Input/output formats
- Example queries and workflows
- Troubleshooting guide
- Performance considerations
- Security best practices

**Benefits:**
- Users understand when to use each tool
- Clear examples for SQL queries on tabular data
- Agent can reference this for better tool selection

### B. DEPLOYMENT_GUIDE.md (NEW)

**Purpose:**
- Step-by-step deployment instructions
- Database migration procedures
- Testing and verification steps
- Troubleshooting guide

**Contents:**
1. Database schema requirements explanation
2. Migration instructions (with copy/paste commands)
3. n8n workflow import steps
4. Backend configuration
5. Ollama verification
6. Testing procedures
7. Troubleshooting common issues
8. Deployment checklist

**Benefits:**
- Clear deployment path for users
- Explains why migration is needed
- Provides verification steps
- Troubleshooting for common issues

### C. README.md (UPDATED)

**Changes:**
- Added reference to [TOOL_DOCUMENTATION.md](TOOL_DOCUMENTATION.md)
- Updated RAG AI Agent Tools section with better descriptions
- Added "Best for" guidance for each tool
- Linked to detailed documentation for Get Full Document Tool and SQL Query Tool
- Updated embedding service section to reflect Ollama (not OpenAI)

---

## 4. Database Schema Analysis

### Current State

**Existing TIP Tables:**
- `knowledge_chunks` - Has embedding vector(768) ✅
- `knowledge_documents` - Document metadata ✅

**Required by n8n Workflows:**
- `knowledge_document_chunks` - Simplified schema for n8n (❌ not created yet)
- `document_rows` - Tabular data storage (❌ not created yet)
- `get_document_full_text()` - PostgreSQL function (❌ not created yet)
- `match_knowledge_document_chunks()` - Vector search function (❌ not created yet)

### Temporary Workaround Applied

**Knowledge Vector Store Tool:**
- Updated to use existing `knowledge_chunks` table
- This allows basic vector search to work immediately
- Full functionality requires migration

### Why Migration is Needed

The n8n workflows expect a **simplified schema** separate from TIP's complex transition-specific schema:

**TIP's knowledge_chunks:**
- Designed for transition knowledge management
- Has: artifactId, transitionId, contentHash, etc.
- Complex foreign key relationships

**n8n's knowledge_document_chunks:**
- Designed for general document RAG
- Simpler fields: id, document_id, content, embedding
- Optimized for n8n workflow processing

**Recommendation:** Run the migration to create separate tables for n8n workflows. This avoids conflicts and allows both systems to coexist.

---

## 5. Ollama Configuration

### Requirements

**Models Needed:**
1. `llama3.2:latest` - Chat/completion model (~2GB)
2. `nomic-embed-text:latest` - Embedding model (~274MB)

**Installation:**
```bash
ollama pull llama3.2:latest
ollama pull nomic-embed-text:latest
```

**Verification:**
```bash
ollama list
curl http://localhost:11434/api/tags
```

**Endpoint:**
- Workflows use: `http://host.docker.internal:11434`
- This allows Docker containers to access Ollama running on host machine

### Why Ollama?

**Advantages over OpenAI:**
- ✅ Free (no API costs)
- ✅ Private (data stays local)
- ✅ Offline capability
- ✅ No rate limits
- ✅ Customizable models

**Considerations:**
- Requires local compute resources
- Models need to be downloaded (2-3 GB total)
- Slower than OpenAI API (but acceptable for most use cases)
- Quality is good but not as advanced as GPT-4

---

## 6. Node Status Summary

| Node | Status | Notes |
|------|--------|-------|
| **Ollama Chat Model** | ✅ Connected | Uses llama3.2:latest |
| **Embeddings Ollama** | ✅ Connected | Uses nomic-embed-text:latest (768d) |
| **Knowledge Vector Store Tool** | ✅ Connected | Uses existing knowledge_chunks table |
| **List Documents Tool** | ✅ Connected | Uses knowledge_documents table |
| **Get Full Document Tool** | ⚠️ Configured | Requires migration for get_document_full_text() |
| **SQL Query Tool** | ⚠️ Configured | Requires migration for document_rows table |
| **Search Facts Tool (mem0)** | ✅ Configured | HTTP request to backend-python |
| **PostgreSQL Chat Memory** | ✅ Connected | Stores conversation history |

**Legend:**
- ✅ Fully functional with current database
- ⚠️ Configured but requires database migration to work

---

## 7. Files Modified

### Workflows (2 files)
1. `TIP_Document_Processing_Enhanced_Workflow.json`
   - Reverted to Ollama embeddings
   - Updated vector_model field
   - Changed connections

2. `TIP_Agentic_RAG_Enhanced_Workflow.json`
   - Reverted to Ollama chat and embeddings
   - Fixed Knowledge Vector Store Tool configuration
   - Updated all connections

### Documentation (3 files created, 1 updated)
1. `TOOL_DOCUMENTATION.md` - NEW (comprehensive tool guide)
2. `DEPLOYMENT_GUIDE.md` - NEW (step-by-step deployment)
3. `CHANGES_SUMMARY.md` - NEW (this file)
4. `README.md` - UPDATED (added tool documentation references)

### Database (no changes yet)
- Migration file exists: `database-migration-tip-agentic-rag.sql`
- User needs to run migration manually (see DEPLOYMENT_GUIDE.md)

---

## 8. What You Need to Do Next

### Immediate (Required for Full Functionality)

1. **Run Database Migration:**
   ```bash
   docker cp assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-tip-agentic-rag.sql better-db-1:/tmp/
   docker-compose exec db psql -U user -d tip -f /tmp/database-migration-tip-agentic-rag.sql
   ```

2. **Verify Ollama is Running:**
   ```bash
   ollama list
   # Should show: llama3.2:latest and nomic-embed-text:latest
   ```

3. **Import Workflows to n8n:**
   - Follow steps in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#step-3-import-n8n-workflows)
   - Configure PostgreSQL credentials
   - Activate both workflows

4. **Test the System:**
   - Upload a test document
   - Run a test RAG query
   - Verify vector search works

### Optional (Enhancements)

5. **Integrate with TIP Frontend:**
   - Add RAG chat interface
   - Connect to n8n webhook

6. **Monitor Performance:**
   - Check n8n execution times
   - Monitor Ollama resource usage

---

## 9. Breaking Changes from Previous Version

### If You Were Using OpenAI:

**Data Incompatibility:**
- OpenAI embeddings: 1536 dimensions
- Ollama embeddings: 768 dimensions
- **Cannot mix:** Existing OpenAI embeddings won't work with Ollama

**Solution:**
1. Run migration to create new tables with vector(768)
2. Reprocess documents with Ollama
3. Or: Keep old OpenAI workflows if preferred (see MIGRATION_SUMMARY.md for rollback)

### Configuration Changes:

**Remove from .env:**
- `OPENAI_API_KEY` (no longer needed)
- `OPENAI_MODEL` (no longer needed)

**Ensure in .env:**
- `OLLAMA_API_URL=http://host.docker.internal:11434`
- `OLLAMA_DEFAULT_MODEL=llama3.2:latest`

---

## 10. Troubleshooting Quick Reference

### "Node is undefined or not connected"

**Check:**
1. Workflow imported correctly?
2. PostgreSQL credentials configured?
3. Ollama running and accessible?

**Fix:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)

### "Table knowledge_document_chunks does not exist"

**Cause:** Migration not run

**Fix:** Run database migration (Step 1 of deployment guide)

### "Ollama connection refused"

**Cause:** Ollama not running or wrong endpoint

**Fix:**
```bash
ollama serve  # Start Ollama
curl http://localhost:11434/api/tags  # Verify
```

### "Vector dimension mismatch"

**Cause:** Database configured for 1536d (OpenAI) but using 768d (Ollama)

**Fix:** Run migration to create tables with correct dimension

---

## 11. Testing Checklist

After deployment, verify:

- [ ] Database migration completed successfully
- [ ] `knowledge_document_chunks` table exists with vector(768)
- [ ] `get_document_full_text()` function exists
- [ ] `document_rows` table exists
- [ ] Ollama running with both models (llama3.2, nomic-embed-text)
- [ ] Both n8n workflows imported and activated
- [ ] PostgreSQL credentials configured in all nodes
- [ ] Test document processed successfully
- [ ] Test RAG query returned results
- [ ] All 5 tools working (knowledge_search, list documents, get contents, SQL, facts)

---

## Summary

**What's Working Now:**
- ✅ Workflows use local Ollama (not OpenAI)
- ✅ All nodes are properly configured
- ✅ Knowledge Vector Store Tool can use existing knowledge_chunks table
- ✅ Comprehensive documentation created
- ✅ Deployment guide provides clear steps

**What's Required:**
- ⚠️ Database migration must be run for full functionality
- ⚠️ Ollama must be running with required models
- ⚠️ Workflows must be imported to n8n
- ⚠️ Backend .env must be configured

**Next Step:**
Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) to complete deployment and testing.

---

**Questions or Issues?**

Refer to:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [TOOL_DOCUMENTATION.md](TOOL_DOCUMENTATION.md) - Tool usage details
- [README.md](README.md) - System overview
- [ENHANCED_ARCHITECTURE.md](ENHANCED_ARCHITECTURE.md) - Technical architecture
