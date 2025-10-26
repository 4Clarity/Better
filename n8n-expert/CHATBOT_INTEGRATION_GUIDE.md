# N8N Expert Agent - Chatbot Integration Guide

**Date Created:** October 25, 2025
**Purpose:** Enable dual-trigger support for both webhook and chatbot triggers in the N8N Expert Agent workflow

---

## Overview

This guide explains how to configure the N8N Expert Agent workflow to work with both:
1. **Webhook trigger** (original implementation)
2. **Chatbot trigger** (new integration)

The key issue is that these two trigger types send data in different formats, requiring the Edit Fields node to handle both formats gracefully.

---

## Data Format Comparison

### Webhook Trigger Data Structure
```json
{
  "body": {
    "query": "How do I transfer data from PostgreSQL to Excel?",
    "user_id": "user-123",
    "session_id": "session-abc",
    "request_id": "request-xyz"
  }
}
```

### Chatbot Trigger Data Structure
```json
{
  "chatInput": "How do I transfer data from PostgreSQL to Excel?",
  "sessionId": "session-abc",
  "user": {
    "id": "user-123"
  }
}
```

**Key Differences:**
- Query text: `body.query` (webhook) vs `chatInput` (chatbot)
- User ID: `body.user_id` (webhook) vs `user.id` (chatbot)
- Session ID: `body.session_id` (webhook) vs `sessionId` (chatbot)
- Request ID: `body.request_id` (webhook) vs not provided (chatbot)

---

## Solution: Update Edit Fields Node

### Step-by-Step Instructions

1. **Open your n8n workflow** at http://n8n.tip.localhost:5678
2. **Find the "Edit Fields" node** (connected to both webhook and chatbot triggers)
3. **Click the Edit Fields node** to open its configuration
4. **Update each field** using the configurations below

### Field Configuration

#### Field 1: query
**Current (webhook only):**
```javascript
{{ $json.body.query }}
```

**Updated (both triggers):**
```javascript
{{ $json.chatInput || $json.body.query }}
```

**Explanation:**
- First tries to get `chatInput` (chatbot format)
- Falls back to `body.query` (webhook format)
- Returns the first non-null/non-undefined value

---

#### Field 2: user_id
**Current (webhook only):**
```javascript
{{ $json.body.user_id }}
```

**Updated (both triggers):**
```javascript
{{ $json.user?.id || $json.body.user_id || 'chatbot-user' }}
```

**Explanation:**
- First tries `user.id` (chatbot format with safe navigation)
- Falls back to `body.user_id` (webhook format)
- Uses 'chatbot-user' as final fallback if both are undefined

---

#### Field 3: session_id
**Current (webhook only):**
```javascript
{{ $json.body.session_id }}
```

**Updated (both triggers):**
```javascript
{{ $json.sessionId || $json.body.session_id || 'chatbot-session' }}
```

**Explanation:**
- First tries `sessionId` (chatbot format)
- Falls back to `body.session_id` (webhook format)
- Uses 'chatbot-session' as final fallback

---

#### Field 4: request_id
**Current (webhook only):**
```javascript
{{ $json.body.request_id }}
```

**Updated (both triggers):**
```javascript
{{ $json.body.request_id || Date.now().toString() }}
```

**Explanation:**
- Tries `body.request_id` (webhook format)
- Generates unique timestamp-based ID if not provided (chatbot case)

---

### Save and Test

1. **Click "Save"** in the Edit Fields node
2. **Save the workflow** (Ctrl+S or Cmd+S)

---

## Testing the Integration

### Test 1: Chatbot Trigger

1. Click the **Chatbot trigger node**
2. Click **"Listen for Test Event"** or **"Execute Node"**
3. Type a test query in the chatbot interface
4. Submit the query
5. **Verify:**
   - ✅ Edit Fields node extracts the query successfully
   - ✅ OpenAI Embeddings node processes without errors
   - ✅ Workflow completes successfully
   - ✅ Response contains workflow recommendations

### Test 2: Webhook Trigger (Backward Compatibility)

```bash
curl -X POST "http://n8n.tip.localhost:5678/webhook/invoke-n8n-expert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n8n-expert-secret-token-2025" \
  -d '{
    "query": "How do I sync data between Google Sheets?",
    "user_id": "test-user",
    "session_id": "test-session",
    "request_id": "test-request"
  }'
```

**Verify:**
- ✅ HTTP 200 response
- ✅ Returns workflow recommendations
- ✅ All nodes execute successfully

---

## Alternative Solution: IF Node Branching

If OR operators don't work in your n8n version, use this alternative approach:

### Architecture
```
Webhook Trigger ────┐
                    ├──> IF Node ──┬──> Edit Fields (Chatbot) ──┐
Chatbot Trigger ────┘               └──> Edit Fields (Webhook) ──┴──> Rest of workflow
```

### Implementation

1. **Add an IF node** after both triggers
2. **Configure the IF node:**
   - **Condition:** `{{ $json.chatInput !== undefined }}`
   - **True branch:** Chatbot data detected
   - **False branch:** Webhook data detected

3. **Create two Edit Fields nodes:**

   **Edit Fields (Chatbot)** - True branch:
   ```javascript
   query: {{ $json.chatInput }}
   user_id: {{ $json.user?.id || 'chatbot-user' }}
   session_id: {{ $json.sessionId || 'chatbot-session' }}
   request_id: {{ Date.now().toString() }}
   ```

   **Edit Fields (Webhook)** - False branch:
   ```javascript
   query: {{ $json.body.query }}
   user_id: {{ $json.body.user_id }}
   session_id: {{ $json.body.session_id }}
   request_id: {{ $json.body.request_id }}
   ```

4. **Merge the branches** before the OpenAI Embeddings node

---

## Debugging Tips

### Error: "Cannot read properties of null (reading 'replace')"

**Cause:** The OpenAI Embeddings node is receiving `null` instead of a string

**Check:**
1. Click the Edit Fields node in the execution view
2. Look at the output data
3. Verify the `query` field contains the actual text (not null or undefined)

**Common causes:**
- Wrong field path in Edit Fields configuration
- Trigger not sending expected data format
- Typo in field name

### Error: Workflow executes but returns empty results

**Check:**
1. Verify the query text is being extracted correctly
2. Check Supabase Vector Store node receives the embedding
3. Verify vector search returns matching workflows
4. Check OpenAI Chat Model receives context data

---

## Verification Checklist

Before considering the integration complete:

- [ ] Edit Fields node updated with OR operators
- [ ] Workflow saved successfully
- [ ] Chatbot trigger tested and working
- [ ] Webhook trigger tested and still working
- [ ] Both paths reach OpenAI Embeddings with valid query text
- [ ] Vector search returns relevant workflows
- [ ] AI response generation works correctly
- [ ] No errors in execution log

---

## Configuration Summary

**Modified Node:** Edit Fields (connected to both triggers)

**Updated Fields:**
| Field | Old Value | New Value |
|-------|-----------|-----------|
| query | `{{ $json.body.query }}` | `{{ $json.chatInput \|\| $json.body.query }}` |
| user_id | `{{ $json.body.user_id }}` | `{{ $json.user?.id \|\| $json.body.user_id \|\| 'chatbot-user' }}` |
| session_id | `{{ $json.body.session_id }}` | `{{ $json.sessionId \|\| $json.body.session_id \|\| 'chatbot-session' }}` |
| request_id | `{{ $json.body.request_id }}` | `{{ $json.body.request_id \|\| Date.now().toString() }}` |

**Impact:**
- ✅ Enables chatbot trigger support
- ✅ Maintains backward compatibility with webhook trigger
- ✅ Provides sensible defaults for missing values
- ✅ No changes required to other workflow nodes

---

## Support Resources

- **n8n Executions:** http://n8n.tip.localhost:5678 → Executions tab
- **Troubleshooting Log:** See TROUBLESHOOTING_LOG.md for all resolved issues
- **n8n Documentation:** https://docs.n8n.io/

---

**Last Updated:** October 25, 2025
**Status:** ⚠️ Solution provided, awaiting implementation and testing
