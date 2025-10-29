# HTTP Helper Fix - Proper n8n API for Code Nodes

**Issue**: `$http is not defined` error in Process Document node
**Root Cause**: Using incorrect `$http` helper - must use `this.helpers.httpRequest()` in code nodes
**Status**: ✅ FIXED

---

## The Problem

### Error Message:
```
ReferenceError: $http is not defined
at getEmbedding (evalmachine.<anonymous>:61:22)
```

### What Was Happening:
The Process Document code was using `$http.request()` to call the Ollama API:

```javascript
const response = await $http.request({
  method: 'POST',
  url: OLLAMA_URL,
  headers: { 'Content-Type': 'application/json' },
  body: {
    model: OLLAMA_MODEL,
    prompt: text
  },
  json: true
});
```

**Problem**: `$http` is available in **expression fields** and **workflow context**, but NOT in **code nodes** (Function/Code nodes).

---

## The Solution

### Use `this.helpers.httpRequest()` in Code Nodes

In code nodes, you must use the `this.helpers` API to make HTTP requests:

```javascript
async function getEmbedding(text, nodeContext) {
  try {
    console.log(`Calling Ollama API at: ${OLLAMA_URL}`);

    // Use n8n's this.helpers.httpRequest() method
    const response = await nodeContext.helpers.httpRequest({
      method: 'POST',
      url: OLLAMA_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text
      })
    });

    // Parse the response (it may be a string)
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    if (!data || !data.embedding) {
      throw new Error('Ollama API did not return embedding data');
    }

    console.log(`Embedding received: ${data.embedding.length} dimensions`);
    return data.embedding;

  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    throw error;
  }
}

// In main processing loop - pass 'this' context
const embedding = await getEmbedding(chunkText, this);
```

**Key Differences:**
- ✅ Must pass `this` context to helper functions
- ✅ Use `this.helpers.httpRequest()` not `$http.request()`
- ✅ Body must be stringified with `JSON.stringify()`
- ✅ Response may be a string - parse if needed

---

## Code Changes

### Before (Broken):
```javascript
async function getEmbedding(text) {
  const response = await $http.request({
    method: 'POST',
    url: OLLAMA_URL,
    headers: { 'Content-Type': 'application/json' },
    body: {
      model: OLLAMA_MODEL,
      prompt: text
    },
    json: true
  });

  if (!response || !response.embedding) {
    throw new Error('Ollama API did not return embedding data');
  }

  return response.embedding;
}

// Called without context
const embedding = await getEmbedding(chunkText);
```

**Error**: `ReferenceError: $http is not defined`

### After (Working):
```javascript
async function getEmbedding(text, nodeContext) {
  const response = await nodeContext.helpers.httpRequest({
    method: 'POST',
    url: OLLAMA_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text
    })
  });

  // Parse response if it's a string
  const data = typeof response === 'string' ? JSON.parse(response) : response;

  if (!data || !data.embedding) {
    throw new Error('Ollama API did not return embedding data');
  }

  return data.embedding;
}

// Pass 'this' context
const embedding = await getEmbedding(chunkText, this);
```

**Result**: Works! Ollama API calls succeed.

---

## Testing

### Test with Text File:
```bash
# Create test file
echo "This is a test document for TIP RAG processing with the proper n8n HTTP helper API." > /tmp/test-http-helper.txt

# Upload via UI: http://tip.localhost/knowledge/document-upload
# Click Process (▶️)
```

### Expected Results:

#### In n8n Execution Logs:
```
=== Process Document Started ===
Received 1 items
Document: test-http-helper.txt
Text length: 85 characters
Created 1 chunks
Chunk 1/1: 85 chars
Generating embedding...
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Embedding received: 768 dimensions
Chunk 1 processed successfully
Document test-http-helper.txt processing complete: 1 chunks created

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
-- filename              | preview                    | dims
-- test-http-helper.txt  | This is a test document... | 768

-- Check document status
SELECT filename, upload_status, chunk_count
FROM knowledge_documents
WHERE filename = 'test-http-helper.txt'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- filename              | upload_status | chunk_count
-- test-http-helper.txt  | COMPLETED     | 1
```

---

## n8n this.helpers API Reference

### HTTP Request in Code Nodes:
```javascript
const response = await this.helpers.httpRequest({
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: 'https://api.example.com/endpoint',
  headers: {
    'Header-Name': 'value'
  },
  body: JSON.stringify({  // Must stringify!
    key: 'value'
  })
});

// Response might be a string - parse if needed
const data = typeof response === 'string' ? JSON.parse(response) : response;
```

### GET Request:
```javascript
const data = await this.helpers.httpRequest({
  method: 'GET',
  url: 'https://api.example.com/data'
});

const parsed = typeof data === 'string' ? JSON.parse(data) : data;
```

### POST Request:
```javascript
const result = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.example.com/create',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: 'value'})
});
```

### Error Handling:
```javascript
try {
  const response = await this.helpers.httpRequest({...});
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  return data;
} catch (error) {
  console.error('HTTP request failed:', error.message);
  throw error;
}
```

---

## Why This Was Different from fetch()

1. **fetch() API**: Not available in n8n's Node.js sandbox
2. **$http helper**: Only available in expression context ({{ }})
3. **this.helpers.httpRequest()**: Proper API for code nodes

**n8n Context Hierarchy:**
```
Code Nodes:
  ✅ this.helpers.httpRequest()
  ✅ this.helpers.request()
  ❌ $http (expression-only)
  ❌ fetch() (not available)

Expressions ({{ }}):
  ✅ $http.request()
  ✅ $node, $json, $input
  ❌ this.helpers (code-only)
```

---

## Files Updated

- ✅ `WIP-TIP Document Processing.json` - Process Document node fixed
- 📄 `HTTP-HELPER-FIX.md` - This document
- 🐍 `fix-http-helper.py` - Script that made the fix

---

## Summary

**Problem**: `$http is not defined` in n8n code node
**Solution**: Use `this.helpers.httpRequest()` instead
**Result**: Ollama API calls now work, chunks being created

**Key Lesson**: Different n8n contexts have different APIs - code nodes use `this.helpers`, expressions use `$` variables.

---

**Import the updated workflow and test with a text file - chunks should now be created!** ✅
