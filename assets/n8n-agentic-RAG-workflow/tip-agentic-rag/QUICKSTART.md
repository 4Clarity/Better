# TIP Agentic RAG - Quick Start Card

## ⚡ 5-Minute Setup

### Prerequisites (Verify First)

```bash
# 1. Check TIP services running
docker-compose ps | grep -E 'db|backend-python|n8n'

# 2. Check Ollama has embedding model
curl http://localhost:11434/api/tags | grep nomic-embed-text

# 3. Check pgvector extension
docker-compose exec db psql -U postgres -d tip -c "\dx" | grep vector
```

---

## 🚀 Deploy (5 Steps - 15 minutes)

### Step 1: Database Migration (2 min)

```bash
# Copy migration file
cp assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-tip-agentic-rag.sql \
   database/migrations/020_tip_agentic_rag.sql

# Run migration
docker-compose exec db psql -U postgres -d tip \
  -f /docker-entrypoint-initdb.d/migrations/020_tip_agentic_rag.sql
```

**Expected:** `TIP Agentic RAG Migration Complete` message

---

### Step 2: Create n8n PostgreSQL Credential (2 min)

1. Open: `http://n8n.tip.localhost`
2. Go to: **Settings** → **Credentials** → **New**
3. Search: "Postgres"
4. Configure:
   ```yaml
   Name: TIP PostgreSQL
   Host: db
   Port: 5432
   Database: tip
   User: user
   Password: password
   SSL: Disable
   ```
5. Click **Save**

---

### Step 3: Import Workflows (3 min)

**Import Workflow 1:**
1. In n8n: **Workflows** → **Add Workflow** → **Import from File**
2. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Document_Processing_Workflow.json`
3. For each node with credential icon:
   - Click node
   - Select "TIP PostgreSQL" credential
4. Copy webhook URL from "Document Upload Webhook" node
5. Toggle **Active** (top-right)

**Import Workflow 2:**
1. **Workflows** → **Add Workflow** → **Import from File**
2. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Agentic_RAG_Workflow.json`
3. Update credentials (same as above)
4. Copy webhook URL from "When chat message received" node
5. Toggle **Active**

---

### Step 4: Configure Backend (2 min)

```bash
# Add to backend-python/.env
cat >> backend-python/.env <<EOF

# n8n Integration
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing
EOF
```

---

### Step 5: Restart Backend (1 min)

```bash
docker-compose restart backend-python

# Verify
docker-compose exec backend-python sh -c 'env | grep N8N'
```

---

## ✅ Test (3 Tests - 5 minutes)

### Test 1: Upload Document

```bash
# Create test file
cat > /tmp/test-doc.txt <<EOF
Government Transition Planning Guide

Key Milestones:
- T-180 days: Initial stakeholder identification
- T-120 days: Knowledge capture begins
- T-90 days: Contractor handover preparation
- T-60 days: Security clearance processing
- T-30 days: Final transition briefings
- T-0 days: Contract transition complete
EOF

# Upload
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/test-doc.txt" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"

# Save document_id from response
```

---

### Test 2: Verify Processing (wait 30s)

```bash
sleep 30

# Check status
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT * FROM document_processing_summary;"

# Expected: 1 COMPLETED document
```

---

### Test 3: Query RAG Agent

```bash
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What are the key milestones for transition planning?",
    "sessionId": "test-session-001",
    "userId": "demo-user-id"
  }'

# Expected: AI response citing the milestones from uploaded document
```

---

## 🎉 Success Criteria

✅ Database migration shows "Migration Complete"
✅ Both n8n workflows show "Active" status
✅ Document upload returns status "UPLOADED"
✅ After 30s, document status is "COMPLETED"
✅ Chunks exist with embeddings in database
✅ RAG query returns coherent answer with sources

---

## 🔍 Quick Verification

```bash
# Check document count
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT COUNT(*) FROM knowledge_documents WHERE upload_status = 'COMPLETED';"

# Check chunk count
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT COUNT(*) FROM knowledge_document_chunks WHERE embedding IS NOT NULL;"

# Check readiness
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT * FROM vector_search_readiness;"
```

---

## 📚 Next Steps

1. **Upload more documents:**
   - PDFs, DOCX, CSVs, Excel files
   - Try different security classifications

2. **Test different queries:**
   - Semantic questions (RAG)
   - Numerical questions (SQL)
   - Cross-document questions

3. **Integrate with frontend:**
   - Add chat component
   - Implement document upload UI

4. **Review full documentation:**
   - `README.md` - Architecture
   - `CONFIGURATION_GUIDE.md` - Detailed setup
   - `DEPLOYMENT_TESTING_GUIDE.md` - Production deployment

---

## 🆘 Quick Troubleshooting

### Document stuck at "UPLOADED"?
```bash
# Check workflow activated
# Visit: http://n8n.tip.localhost → Workflows → Check "Active" toggle

# Check webhook URL
docker-compose exec backend-python sh -c 'env | grep N8N_DOCUMENT'
```

### No RAG results?
```bash
# Lower similarity threshold in query
# Try: "similarity_threshold": 0.5 instead of 0.7

# Check embeddings exist
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT COUNT(*) FROM knowledge_document_chunks WHERE embedding IS NOT NULL;"
```

### Ollama errors?
```bash
# Verify Ollama running
curl http://localhost:11434/api/tags

# Test from n8n container
docker-compose exec n8n curl http://host.docker.internal:11434/api/tags
```

---

## 📖 Full Documentation

All guides are in: `/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/`

| File | Purpose |
|------|---------|
| **INDEX.md** | File navigation |
| **SUMMARY.md** | Project overview |
| **README.md** | Architecture guide |
| **CONFIGURATION_GUIDE.md** | Detailed setup |
| **DEPLOYMENT_TESTING_GUIDE.md** | Production deployment |

---

**Setup time:** ~15 minutes
**Test time:** ~5 minutes
**Total:** ~20 minutes to working system

🚀 **You're ready to go!**
