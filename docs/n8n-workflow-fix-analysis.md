# n8n Workflow Fix Analysis & Recommendations

**Date**: 2025-10-27
**Status**: 🔴 CRITICAL FIX REQUIRED
**Issue**: Route by File Type node not connected to downstream processing

---

## Executive Summary

The TIP Document Processing workflow is **95% complete** but has a critical missing connection preventing document chunks from being created. The "Route by File Type" node executes successfully but has **no output connections**, causing the processing pipeline to stop.

---

## Root Cause Analysis

### Current Workflow Flow:
```
✅ Document Upload Webhook
  ↓
✅ Extract Document Info ──┬──→ Update Status - Analyzing
  ↓                         ↓
  ↓                      ✅ Merge
  └────────────────────────┘
                            ↓
✅ Convert Base64 to Binary
  ↓
✅ Create Version Record
  ↓
❌ Route by File Type [NO CONNECTIONS DEFINED]

🚫 Character Text Splitter (NEVER EXECUTES)
🚫 Embeddings Ollama (NEVER EXECUTES)
🚫 Insert Chunks to PostgreSQL (NEVER EXECUTES)
🚫 Calculate Quality Score (NEVER EXECUTES)
🚫 Add to Curation Queue (NEVER EXECUTES)
```

### Evidence from Workflow JSON:
```json
"Route by File Type": {
  // EMPTY - no connections defined!
}
```

**Impact**: All downstream processing nodes never execute, resulting in:
- ❌ No text extraction from documents
- ❌ No chunks created in `n8n_vectors` table
- ❌ Document status stuck at "ANALYZING" (never updated to "COMPLETED")
- ❌ RAG queries cannot find any document content

---

## n8n Best Practices Applied

Based on n8n documentation review, here are the critical patterns to fix this workflow:

### 1. **Switch Node Output Routing** (Primary Fix)

The Switch node (Route by File Type) must define explicit output routes. From n8n docs, Switch nodes support multiple outputs based on conditions.

**Current Configuration**: Switch node with NO output connections
**Required Configuration**: Switch node with connections for each route

**Example from Documentation**:
```json
"IF": {
  "main": [
    [
      {
        "node": "Set",
        "type": "main",
        "index": 0
      }
    ],
    [
      {
        "node": "Function",
        "type": "main",
        "index": 0
      }
    ]
  ]
}
```

### 2. **Error Handling Pattern**

The workflow should include proper error handling. From n8n docs:

```javascript
try {
  // Process item
  const result = await processItem(items[i]);
  returnData.push(result);
} catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: { error: error.message },
      pairedItem: { item: i },
    });
    continue;
  }
  throw new NodeOperationError(this.getNode(), error as Error, {
    description: error.description,
    itemIndex: i,
  });
}
```

**Recommendation**: Add error handling to "Convert Base64 to Binary" and "Calculate Quality Score" code nodes.

### 3. **Connection Validation**

From n8n docs, workflows must have explicit connections between nodes:
```json
"connections": {
  "Node A": {
    "main": [
      [
        {
          "node": "Node B",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }
}
```

---

## Fix Options

### Option 1: **Add Text Extraction Nodes with Routing** (Recommended)

This follows proper n8n patterns for handling different file types:

```
Route by File Type ──┬─[PDF (output 0)]──→ Extract from PDF ──┐
                     │                                         │
                     ├─[Text (output 1)]─→ Extract from Text ──┤
                     │                                         │
                     └─[Other (output 2)]─→ Pass Through ──────┘
                                                               ↓
                                                   Character Text Splitter
```

**Implementation Steps**:

1. **Add PDF Extraction Node** (if PDFs need special handling)
   - Type: `n8n-nodes-base.code` or PDF parser
   - Input: Route output 0 (PDF files)
   - Purpose: Extract text from PDF binary

2. **Add Text Pass-Through** (for text files)
   - Type: `n8n-nodes-base.set`
   - Input: Route output 1 (Text files)
   - Purpose: Extract text from binary or pass through

3. **Connect All Outputs to Character Text Splitter**

4. **Update Switch Node Configuration**:
   ```json
   "Route by File Type": {
     "main": [
       [
         {
           "node": "Extract from PDF",
           "type": "main",
           "index": 0
         }
       ],
       [
         {
           "node": "Extract from Text",
           "type": "main",
           "index": 0
         }
       ],
       [
         {
           "node": "Character Text Splitter",
           "type": "main",
           "index": 0
         }
       ]
     ]
   }
   ```

### Option 2: **Bypass Router for Testing** (Quick Fix)

For immediate testing, bypass the router entirely:

```json
"Create Version Record": {
  "main": [
    [
      {
        "node": "Character Text Splitter",
        "type": "main",
        "index": 0
      }
    ]
  ]
}
```

**Pros**: Quick test to verify rest of pipeline works
**Cons**: No file type handling, may fail on binary files
**Use Case**: Temporary fix to test with simple text files

---

## Required Workflow Updates

### 1. **Add Text Extraction Logic**

The workflow needs to extract text from binary data before splitting. Current "Convert Base64 to Binary" node creates binary data, but Character Text Splitter needs text input.

**Add Code Node: "Extract Text from Binary"**
```javascript
// For each item, extract text from binary
const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
  try {
    const item = items[i];
    const mimeType = item.json.mime_type;
    let textContent = '';

    // Handle different file types
    if (mimeType.includes('text') || mimeType.includes('json')) {
      // Text-based files
      const binaryData = item.binary.data;
      textContent = Buffer.from(binaryData.data, 'base64').toString('utf-8');
    } else if (mimeType.includes('pdf')) {
      // PDF handling - this may need a PDF parser node instead
      textContent = ''; // Placeholder - add PDF extraction
      throw new Error('PDF extraction not yet implemented - use PDF parser node');
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    results.push({
      json: {
        document_id: item.json.document_id,
        filename: item.json.filename,
        text: textContent,
        mime_type: mimeType,
        file_size: item.json.file_size
      }
    });

  } catch (error) {
    if (this.continueOnFail()) {
      results.push({
        json: {
          error: error.message,
          document_id: items[i].json.document_id
        },
        pairedItem: { item: i }
      });
      continue;
    }
    throw new NodeOperationError(this.getNode(), error, {
      description: `Failed to extract text from ${items[i].json.filename}`,
      itemIndex: i
    });
  }
}

return results;
```

### 2. **Update Switch Node Routes**

Configure the Switch node with proper MIME type matching:

**Switch Node Configuration**:
- **Output 0 (PDF)**: `mime_type` contains `'application/pdf'`
- **Output 1 (Text)**: `mime_type` contains `'text/'`
- **Output 2 (Other)**: Default fallback

### 3. **Add "Update Status - COMPLETED" Node**

After "Insert Chunks to PostgreSQL", add a final status update node:

```sql
UPDATE knowledge_documents
SET
  upload_status = 'COMPLETED',
  chunk_count = (
    SELECT COUNT(*)
    FROM n8n_vectors
    WHERE metadata->>'document_id' = $1
  ),
  processing_completed_at = NOW()
WHERE id = $1::uuid
```

### 4. **Add Error Workflow**

Create an Error Trigger workflow following n8n best practices:

```json
{
  "nodes": [
    {
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger"
    },
    {
      "name": "Update Document Status to FAILED",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE knowledge_documents SET upload_status = 'FAILED', error_message = $1 WHERE id = $2",
        "additionalFields": {
          "values": [
            "={{ $node['Error Trigger'].json.execution.error.message }}",
            "={{ $node['Error Trigger'].json.execution.lastNodeExecuted }}"
          ]
        }
      }
    }
  ]
}
```

---

## Testing Checklist

After applying fixes:

### Phase 1: Verify Connections
- [ ] Route by File Type has 3 output connections defined
- [ ] Each output connects to appropriate text extraction node
- [ ] All extraction nodes connect to Character Text Splitter
- [ ] Character Text Splitter connects to Embeddings Ollama
- [ ] Complete chain: Embeddings → Insert Chunks → Quality Score → Curation

### Phase 2: Test with Simple Text File
```bash
# Create test file
echo "This is a test document for TIP RAG processing." > /tmp/test-rag.txt

# Upload via UI: http://tip.localhost/knowledge/document-upload
# Click Process button
```

**Expected Results**:
- [ ] Workflow shows all nodes green in n8n Executions
- [ ] `SELECT COUNT(*) FROM n8n_vectors;` returns > 0
- [ ] Document status = 'COMPLETED'
- [ ] chunk_count > 0

### Phase 3: Test with PDF
```bash
# Upload existing PDF via UI
# Click Process button
```

**Expected Results**:
- [ ] PDF text extraction works
- [ ] Chunks created in n8n_vectors
- [ ] Status = 'COMPLETED'

### Phase 4: Test Error Handling
```bash
# Upload unsupported file type (.exe, .zip)
# Click Process button
```

**Expected Results**:
- [ ] Error workflow triggers
- [ ] Document status = 'FAILED'
- [ ] Error message logged

---

## Implementation Priority

### Immediate (This Session)
1. ✅ **Add connection from "Route by File Type" to "Character Text Splitter"**
   - Choose output index 2 (Other/default) for initial testing
   - This unblocks the pipeline

2. ✅ **Add "Extract Text from Binary" code node**
   - Place between "Route by File Type" and "Character Text Splitter"
   - Handle text/plain and application/json initially

3. ✅ **Test with simple text file**
   - Verify chunks created
   - Verify status updated

### Short Term (Next 24 Hours)
4. Add proper PDF extraction node
5. Add "Update Status - COMPLETED" node
6. Add error handling workflow
7. Test with multiple file types

### Medium Term (Next Week)
8. Optimize chunk size based on Ollama performance
9. Add retry logic for Ollama timeouts
10. Implement batch processing for multiple documents
11. Add monitoring/alerting for failed workflows

---

## Configuration Reference

### Environment Variables (Already Configured)
```bash
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/document-processing
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_DEFAULT_MODEL=llama3.2:latest
```

### Database Tables
- `knowledge_documents` - Document metadata and status
- `document_versions` - Version tracking
- `n8n_vectors` - Vector embeddings for RAG
- `document_rows` - Tabular data (future use)

### Expected Data Flow
```json
// Input from webhook
{
  "document_id": "uuid",
  "filename": "test.txt",
  "file_content": "base64...",
  "mime_type": "text/plain",
  "file_size": 1024
}

// After Extract Text
{
  "document_id": "uuid",
  "text": "This is the document content...",
  "filename": "test.txt"
}

// After Text Splitter
{
  "document_id": "uuid",
  "chunk_text": "This is the",
  "chunk_index": 0
}

// After Embeddings
{
  "document_id": "uuid",
  "chunk_text": "This is the",
  "embedding": [0.1, 0.2, ..., 0.768]
}

// Insert to n8n_vectors
{
  "id": "uuid",
  "text": "This is the",
  "embedding": [0.1, 0.2, ..., 0.768],
  "metadata": {
    "document_id": "uuid",
    "chunk_index": 0,
    "filename": "test.txt"
  }
}
```

---

## Next Steps

1. **Open n8n workflow editor**: http://n8n.tip.localhost
2. **Click on "Route by File Type" node**
3. **Add output connection**:
   - Drag from output port to "Character Text Splitter"
   - OR add intermediate "Extract Text from Binary" node first
4. **Save and activate workflow**
5. **Test with simple text file**
6. **Monitor execution** in n8n Executions tab
7. **Verify database** has chunks created

---

## Success Metrics

✅ Workflow is fully operational when:
- All nodes execute (green checkmarks)
- Chunks appear in `n8n_vectors` table
- Document status = 'COMPLETED'
- chunk_count matches actual chunks
- RAG queries return relevant results
- Error cases handled gracefully

---

**Last Updated**: 2025-10-27 20:15 UTC
**Analysis By**: Development Agent (James)
**Priority**: 🔴 CRITICAL - Blocks all document processing
