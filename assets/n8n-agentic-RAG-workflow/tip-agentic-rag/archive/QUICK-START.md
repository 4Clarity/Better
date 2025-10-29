# Quick Start - Import Fixed Workflow

**File**: `WIP-TIP Document Processing.json`
**Status**: ✅ Fixed and Ready

---

## What Was Fixed

### 🔴 Problem
- "Route by File Type" node had **no connections**
- Processing pipeline stopped after routing
- No chunks created in database
- Documents stuck in "ANALYZING" status

### ✅ Solution
- Added "Extract Text from Binary" node
- Added "Update Status - COMPLETED" node
- Connected all processing nodes
- Workflow now runs end-to-end

---

## Import in 5 Steps

### 1. Open n8n
```
http://n8n.tip.localhost
```

### 2. Import Workflow
- Click **+ Workflow** → **Import from File**
- Select: `WIP-TIP Document Processing.json`
- Click **Import**

### 3. Configure Database Credentials
Click on **any PostgreSQL node** → Select credential:
- **Name**: PostgreSQL account
- **Host**: `db`
- **Database**: `tip`
- **User**: `user`
- **Password**: `password`

### 4. Verify Ollama Model
```bash
ollama list | grep nomic-embed-text
```
If missing:
```bash
ollama pull nomic-embed-text:latest
```

### 5. Save & Activate
- Click **Save** (top right)
- Toggle **Active** to ON

---

## Quick Test

### Create test file:
```bash
echo "This is a test document for TIP RAG. It should be chunked and embedded." > /tmp/test.txt
```

### Upload & Process:
1. Go to: http://tip.localhost/knowledge/document-upload
2. Upload `test.txt`
3. Click **Play button** (▶️)

### Verify Success:
```bash
# Check chunks created
docker-compose exec -T db psql -U user -d tip -c "SELECT COUNT(*) FROM n8n_vectors;"

# Check document status
docker-compose exec -T db psql -U user -d tip -c "SELECT filename, upload_status, chunk_count FROM knowledge_documents ORDER BY created_at DESC LIMIT 1;"
```

**Expected**:
- Status = `COMPLETED`
- Chunk count > 0
- n8n execution shows all green ✓

---

## Visual Flow (Updated)

```
📥 Webhook → Extract Info → Update Status (Analyzing)
                    ↓               ↓
                    └──── Merge ────┘
                           ↓
                  Convert Base64 to Binary
                           ↓
                  Create Version Record
                           ↓
                  Route by File Type
                           ↓
                  🆕 Extract Text ✅
                           ↓
                  Character Text Splitter
                           ↓
                  Embeddings Ollama
                           ↓
                  Insert Chunks
                           ↓
                  Quality Score → Curation
                           ↓
                  🆕 Update Status (COMPLETED) ✅
```

---

## Troubleshooting

### ❌ Workflow fails at "Extract Text"
**Fix**: Check file is text-based (not PDF/binary)

### ❌ No chunks in database
**Fix**: Verify Ollama is running
```bash
curl http://host.docker.internal:11434/api/tags
```

### ❌ Status stays "ANALYZING"
**Fix**: Check PostgreSQL credentials on "Update Status - COMPLETED" node

---

## What's New in This Version

| Feature | Status | Impact |
|---------|--------|--------|
| Extract Text from Binary | ✅ Added | Unblocks processing pipeline |
| Update Status - COMPLETED | ✅ Added | Properly marks documents done |
| Route connections | ✅ Fixed | Processing now flows to completion |
| Error handling | ✅ Improved | Better error messages |
| PDF support | ⚠️ Planned | Coming soon (needs PDF parser) |

---

## Next Steps After Import

1. ✅ Test with simple text file (see above)
2. ✅ Process existing uploaded documents
3. ⏳ Add PDF parser node (for PDF support)
4. ⏳ Test RAG queries against processed documents

---

**Ready to go! Import the workflow and test.** 🚀
