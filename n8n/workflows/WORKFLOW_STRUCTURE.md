# Document Chunking Analysis Pipeline - Node Structure

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Webhook Trigger (Entry Point)                       │
│                    POST /webhook/document-processing                         │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Check for Duplicates                                 │
│                  POST /api/n8n/check-duplicate                              │
│                  Returns: {is_duplicate, strategy}                          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  IF Duplicate SKIP?      │
                    │  (is_duplicate && SKIP)  │
                    └─┬────────────────────┬───┘
                      │ TRUE               │ FALSE
                      ▼                    ▼
    ┌──────────────────────────┐   ┌─────────────────────────┐
    │ Update Status            │   │ Extract Document Text   │
    │ (DUPLICATE_SKIPPED)      │   │ POST /api/n8n/extract-  │
    │ END WORKFLOW             │   │ text                    │
    └──────────────────────────┘   └──┬──────────────────────┘
                                      │ Success  │ Error
                                      ▼          ▼
                    ┌─────────────────────────────────┐    ┌─────────────┐
                    │ Analyze Chunking Strategy       │    │   ERROR     │
                    │ POST /api/n8n/analyze-chunking  │───►│   HANDLER   │
                    └─────────────┬───────────────────┘    └─────────────┘
                                  │ Success  │ Error
                                  ▼          ▼
                    ┌──────────────────────────┐    ┌────────────────────┐
                    │  IF Analyze Error?       │    │   ERROR HANDLER    │
                    └─┬────────────────────┬───┘    └────────────────────┘
                      │ TRUE               │ FALSE
                      ▼                    ▼
    ┌──────────────────────────┐   ┌─────────────────────────┐
    │ Use Fallback Strategy    │   │                         │
    │ (600 tokens, 10% overlap)│   │                         │
    └────────┬─────────────────┘   │                         │
             │                      │                         │
             └──────────────────────┼─────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │ Chunk Document                  │
                    │ POST /api/n8n/chunk-document    │
                    └──────────┬──────────────────────┘
                               │ Success  │ Error
                               ▼          ▼
                    ┌─────────────────────────────────┐    ┌─────────────┐
                    │ Generate Embeddings             │    │   ERROR     │
                    │ POST /api/n8n/generate-         │───►│   HANDLER   │
                    │ embeddings                      │    └─────────────┘
                    └──────────┬──────────────────────┘
                               │ Success  │ Error
                               ▼          ▼
                    ┌─────────────────────────────────┐    ┌─────────────┐
                    │ Store Chunks in Database        │    │   ERROR     │
                    │ POST /api/n8n/store-chunks      │───►│   HANDLER   │
                    └──────────┬──────────────────────┘    └─────────────┘
                               │ Success  │ Error
                               ▼          ▼
                    ┌─────────────────────────────────┐    ┌─────────────┐
                    │ Update Document Status (SUCCESS)│    │   ERROR     │
                    │ POST /api/n8n/update-status     │    │   HANDLER   │
                    │ Status: COMPLETED               │    └─────────────┘
                    └─────────────────────────────────┘
```

## Node Details

### 1. Webhook Trigger
- **Type**: `n8n-nodes-base.webhook`
- **Method**: POST
- **Path**: `/webhook/document-processing`
- **Input**: `{ document_id, filename, mime_type, storage_path, file_content_base64 }`
- **Authentication**: None (internal Docker network)

### 2. Check for Duplicates
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/check-duplicate`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ is_duplicate: boolean, strategy: string }`

### 3. IF Duplicate SKIP
- **Type**: `n8n-nodes-base.if`
- **Condition**: `is_duplicate === true AND strategy === "SKIP"`
- **Branch TRUE**: Update Status (Duplicate Skipped) → END
- **Branch FALSE**: Extract Document Text

### 4. Update Status (Duplicate Skipped)
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/update-status`
- **Payload**: `{ document_id, status: "DUPLICATE_SKIPPED", n8n_workflow_id, n8n_execution_id }`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s

### 5. Extract Document Text
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/extract-text`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ text_content: string, char_count: number }`
- **Error Branch**: Routes to Error Handler on failure

### 6. Analyze Chunking Strategy
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/analyze-chunking`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ chunk_size: number, overlap_percentage: number, strategy: string }`
- **Error Branch**: Routes to Error Handler on failure

### 7. IF Analyze Error
- **Type**: `n8n-nodes-base.if`
- **Condition**: `status === "error"`
- **Branch TRUE**: Use Fallback Strategy
- **Branch FALSE**: Chunk Document (with AI-determined strategy)

### 8. Use Fallback Strategy
- **Type**: `n8n-nodes-base.set` (v3.2)
- **Output**: `{ chunk_size: 600, overlap_percentage: 10, strategy: "fallback", reason: "Analysis failed" }`
- **Next**: Chunk Document

### 9. Chunk Document
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/chunk-document`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ chunks: Array<{ text, chunk_index, char_count }> }`
- **Error Branch**: Routes to Error Handler on failure

### 10. Generate Embeddings
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/generate-embeddings`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ chunks_with_embeddings: Array<{ text, embedding: vector }> }`
- **Error Branch**: Routes to Error Handler on failure

### 11. Store Chunks in Database
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/store-chunks`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Output**: `{ chunk_count: number, status: "stored" }`
- **Error Branch**: Routes to Error Handler on failure

### 12. Update Document Status (Success)
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/update-status`
- **Payload**: `{ document_id, status: "COMPLETED", chunk_count, n8n_workflow_id, n8n_execution_id }`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s

### 13. Error Handler
- **Type**: `n8n-nodes-base.httpRequest`
- **Endpoint**: `http://backend-python:8000/api/n8n/update-status`
- **Payload**: `{ document_id, status: "FAILED", error_message, failed_node, n8n_workflow_id, n8n_execution_id }`
- **Retry**: 3 attempts, 5s delay
- **Timeout**: 60s
- **Note**: This is the terminal node for all error branches

## Error Handling Matrix

| Node | Success Path | Error Path | Retry Strategy |
|------|--------------|------------|----------------|
| Webhook Trigger | → Check Duplicates | N/A | No retry |
| Check Duplicates | → IF Duplicate SKIP | → Error Handler | 3x, 5s delay |
| IF Duplicate SKIP (TRUE) | → Update Status (Skipped) | N/A | No retry |
| IF Duplicate SKIP (FALSE) | → Extract Text | N/A | No retry |
| Extract Text | → Analyze Chunking | → Error Handler | 3x, 5s delay |
| Analyze Chunking | → IF Analyze Error | → Error Handler | 3x, 5s delay |
| IF Analyze Error (TRUE) | → Fallback Strategy | N/A | No retry |
| IF Analyze Error (FALSE) | → Chunk Document | N/A | No retry |
| Fallback Strategy | → Chunk Document | N/A | No retry |
| Chunk Document | → Generate Embeddings | → Error Handler | 3x, 5s delay |
| Generate Embeddings | → Store Chunks | → Error Handler | 3x, 5s delay |
| Store Chunks | → Update Status (Success) | → Error Handler | 3x, 5s delay |
| Update Status (Success) | END | N/A | 3x, 5s delay |
| Error Handler | END | N/A | 3x, 5s delay |

## Data Flow

### Input Data (Webhook)
```json
{
  "document_id": "uuid-v4",
  "filename": "example.pdf",
  "mime_type": "application/pdf",
  "storage_path": "/uploads/example.pdf",
  "file_content_base64": "JVBERi0xLjQK..."
}
```

### Extract Text Output
```json
{
  "text_content": "Extracted document text...",
  "char_count": 5432,
  "status": "success"
}
```

### Analyze Chunking Output
```json
{
  "chunk_size": 800,
  "overlap_percentage": 15,
  "strategy": "semantic",
  "reason": "Technical document with complex structure"
}
```

### Chunk Document Output
```json
{
  "chunks": [
    {
      "chunk_index": 0,
      "text": "First chunk text...",
      "char_count": 800,
      "start_position": 0,
      "end_position": 800
    }
  ],
  "total_chunks": 12
}
```

### Generate Embeddings Output
```json
{
  "chunks_with_embeddings": [
    {
      "chunk_index": 0,
      "text": "First chunk text...",
      "embedding": [0.123, -0.456, 0.789, ...],
      "embedding_model": "nomic-embed-text",
      "embedding_dimension": 768
    }
  ]
}
```

### Store Chunks Output
```json
{
  "chunk_count": 12,
  "status": "stored",
  "document_id": "uuid-v4"
}
```

## Workflow Metadata

- **Name**: Document Chunking Analysis Pipeline
- **Version**: 1.0.0
- **Active**: false (must be activated after import)
- **Execution Timeout**: 600 seconds (10 minutes)
- **Retry Policy**: 3 attempts with 5-second delay
- **Error Workflow**: error-notification-workflow (optional)
- **Tags**: document-processing, rag, knowledge-base

## Performance Characteristics

### Expected Execution Times
- Small documents (< 10 pages): 30-60 seconds
- Medium documents (10-50 pages): 1-3 minutes
- Large documents (50+ pages): 3-8 minutes

### Resource Usage
- Memory: ~200 MB per execution
- CPU: Low (most work done by backend services)
- Network: Moderate (file transfer + API calls)

### Bottlenecks
1. **Text Extraction**: PDF parsing can be slow for complex documents
2. **Embeddings Generation**: Limited by Ollama inference speed
3. **Database Storage**: Bulk insert performance

## Future Enhancements

- [ ] Parallel chunk embedding generation (batch API)
- [ ] Progress notifications via WebSocket
- [ ] Document versioning support
- [ ] Multi-language document support
- [ ] OCR for scanned documents
- [ ] Document format conversion pipeline
- [ ] Automatic metadata extraction
- [ ] Quality scoring for chunks
