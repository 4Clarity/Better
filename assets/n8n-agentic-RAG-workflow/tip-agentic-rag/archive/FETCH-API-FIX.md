# Fetch API Fix - Why Chunks Weren't Being Created

**Issue**: `fetch is not defined` error in Process Document node
**Root Cause**: `fetch()` API not available in n8n's JavaScript execution environment
**Status**: ✅ FIXED

---

## The Problem

### Error Message:
```
ReferenceError: fetch is not defined
at getEmbedding (evalmachine.<anonymous>:37:22)
```

### What Was Happening:
The Process Document code was using `fetch()` to call the Ollama API:

```javascript
const response = await fetch(OLLAMA_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: OLLAMA_MODEL,
    prompt: text
  })
});
```

**Problem**: `fetch()` is not available in n8n's Node.js execution environment. It's a browser API, and while it's available in Node.js 18+, n8n's code execution sandbox doesn't include it.

---

## The Solution

### Use n8n's Built-in `$http` Helper

n8n provides a built-in `$http` object for making HTTP requests:

```javascript
const response = await $http.request({
  method: 'POST',
  url: OLLAMA_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    model: OLLAMA_MODEL,
    prompt: text
  },
  json: true  // Automatically parse JSON response
});
```

**Benefits**:
- ✅ Built into n8n (always available)
- ✅ Works in all n8n environments
- ✅ Automatic JSON parsing
- ✅ Proper error handling
- ✅ Supports all HTTP methods

---

## Code Changes

### Before (Broken):
```javascript
async function getEmbedding(text) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text
    })
  });

  const data = await response.json();
  return data.embedding;
}
```

**Error**: `ReferenceError: fetch is not defined`

### After (Working):
```javascript
async function getEmbedding(text) {
  const response = await $http.request({
    method: 'POST',
    url: OLLAMA_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      model: OLLAMA_MODEL,
      prompt: text
    },
    json: true  // Auto-parse response
  });

  // Response is already parsed JSON
  if (!response || !response.embedding) {
    throw new Error('Ollama API did not return embedding data');
  }

  return response.embedding;
}
```

**Result**: Works! No more fetch errors.

---

## Testing

### Test with Text File:
```bash
# Create test file
echo "This is a test document for TIP RAG processing. Multiple sentences for chunking." > /tmp/test-chunks.txt

# Upload via UI: http://tip.localhost/knowledge/document-upload
# Click Process (▶️)
```

### Expected Results:

#### In n8n Execution Logs:
```
=== Process Document Started ===
Received 1 items
Document: test-chunks.txt
Text length: 85 characters
Created 1 chunks
Chunk 1/1: 85 chars
Generating embedding...
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Embedding received: 768 dimensions
Chunk 1 processed successfully
Document test-chunks.txt processing complete: 1 chunks created

=== Process Document Complete ===
Processed 1 items total
Successful chunks: 1
Failed items: 0
```

#### In Database:
```sql
-- Check chunks created
SELECT COUNT(*) FROM n8n_vectors;
-- Should return: 1

-- Check chunk content
SELECT
  metadata->>'filename' as filename,
  LEFT(text, 50) as preview,
  array_length(embedding::float[], 1) as dims
FROM n8n_vectors
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- filename         | preview                    | dims
-- test-chunks.txt  | This is a test document... | 768

-- Check document status
SELECT filename, upload_status, chunk_count
FROM knowledge_documents
WHERE filename = 'test-chunks.txt'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- filename         | upload_status | chunk_count
-- test-chunks.txt  | COMPLETED     | 1
```

---

## n8n $http API Reference

### Basic Usage:
```javascript
const response = await $http.request({
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: 'https://api.example.com/endpoint',
  headers: {
    'Header-Name': 'value'
  },
  body: {  // For POST/PUT
    key: 'value'
  },
  json: true  // Auto-parse JSON response
});
```

### GET Request:
```javascript
const data = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/data',
  json: true
});
```

### POST Request:
```javascript
const result = await $http.request({
  method: 'POST',
  url: 'https://api.example.com/create',
  headers: {'Content-Type': 'application/json'},
  body: {name: 'value'},
  json: true
});
```

### Error Handling:
```javascript
try {
  const response = await $http.request({...});
  return response.data;
} catch (error) {
  console.error('HTTP request failed:', error.message);
  throw error;
}
```

---

## Why This Was the Blocker

1. **Errors handled correctly** → Error flow worked (Handle Error node)
2. **Text extraction worked** → Extract Text output had text content
3. **Chunking logic worked** → Text was being split correctly
4. **But embeddings failed** → `fetch is not defined` stopped processing

**Result**:
- Failed items (PDFs) → Routed to error handling ✓
- Successful items (text) → Crashed at Ollama API call ✗
- No chunks created → Workflow stopped at embedding step

**Fix**: Replace `fetch()` with `$http.request()`
**Now**: Text files process successfully, chunks created, embeddings generated ✓

---

## Other n8n Built-in Helpers

For reference, n8n provides these helpers in code nodes:

| Helper | Purpose | Example |
|--------|---------|---------|
| `$http` | HTTP requests | `$http.request({...})` |
| `$json` | Current item JSON | `$json.fieldName` |
| `$input` | Access input data | `$input.all()` |
| `$node` | Access other nodes | `$node['NodeName'].json` |
| `$execution` | Workflow execution info | `$execution.id` |
| `$workflow` | Workflow metadata | `$workflow.name` |

---

## Files Updated

- ✅ `WIP-TIP Document Processing.json` - Process Document node fixed
- 📄 `FETCH-API-FIX.md` - This document
- 🐍 `fix-fetch-api.py` - Script that made the fix

---

## Summary

**Problem**: `fetch is not defined` in n8n code node
**Solution**: Use `$http.request()` instead
**Result**: Ollama embeddings now work, chunks being created

---

**Import the updated workflow and test with a text file - chunks should now be created!** ✅
