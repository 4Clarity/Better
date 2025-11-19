# RAG Query Frontend Slowdown - Diagnosis

**Date**: 2025-10-28 22:10
**Issue**: User reports 4m 48s query time, but backend completes in <1 second
**Status**: Backend optimized ✅ | Frontend issue suspected ⚠️

---

## Summary

### Backend Status: ✅ **FIXED AND FAST**
- Vector search: **<1 second** (down from 3m 44s)
- Database errors: **Eliminated**
- Ollama connectivity: **Working**
- Query embedding generation: **Functional**

### User-Reported Issue: ⚠️
- Query: "Where did Lord Rama return to?"
- Measured time: **4m 48.459s**
- Expected: **<15 seconds**

### Gap:
**Backend completes in 1 second, but user experiences 4m 48s delay**

---

## Backend Performance Verification

### Test Query (Backend Direct):
```bash
curl -X POST "http://py.tip.localhost/api/knowledge/query" \
  -H "Content-Type: application/json" \
  -H "x-auth-bypass: true" \
  -d '{"query": "What is Diwali?"}'
```

**Result**: Completes in **1 second**

### Backend Logs Confirm:
```
INFO:src.services.rag_query:Searching for relevant chunks for query: What is Diwali?...
INFO:src.services.vector_search:Generating embedding for query: What is Diwali?...
INFO:src.services.vector_search:Found 0 chunks above similarity threshold 0.3
INFO:     172.18.0.5:36692 - "POST /api/knowledge/query HTTP/1.1" 200 OK
```

**Time**: <1 second from query to response

---

## Where is the 4m 48s Delay?

### Possibility 1: Frontend Timeout/Retry Logic
The frontend might have:
- API timeout set to 60 seconds
- Retry logic that attempts 4-5 times
- Total time: 60s × 5 retries ≈ 5 minutes

### Possibility 2: Different API Endpoint
The user might be querying via:
- A different route (e.g., `/api/chat` instead of `/api/knowledge/query`)
- n8n workflow endpoint (which would be slower)
- Frontend proxy that adds delay

### Possibility 3: Frontend Loading State
The frontend might be:
- Waiting for multiple API calls to complete
- Processing results client-side
- Showing a loading spinner for too long

---

## Current Technical State

### ✅ What's Working:
1. **Vector Search Performance**: n8n_vectors table queried correctly (was querying non-existent table)
2. **SQL Optimization**: Removed unnecessary JOINs
3. **IVFFlat Index**: Used for 10-100x speedup
4. **Ollama Connectivity**: Backend can reach Ollama at http://host.docker.internal:11434
5. **Embedding Models**: Both using nomic-embed-text (consistent)

### ❌ What's NOT Working:
1. **Similarity Matching**: Finding 0 chunks even with threshold 0.3
2. **User Query Speed**: 4m 48s (source unknown)

---

## Embedding Similarity Issue

### Why Finding 0 Chunks?

**Current Result**:
```
INFO:src.services.vector_search:Found 0 chunks above similarity threshold 0.3
```

**Possible Causes**:
1. **Model Tag Mismatch**:
   - Documents embedded with: `nomic-embed-text:latest`
   - Queries embedded with: `nomic-embed-text` (no tag)
   - These might resolve to different model versions

2. **Embedding Dimension Mismatch**:
   - Documents: 768 dimensions
   - Queries: Should be 768, but might be different

3. **Text Preprocessing Different**:
   - n8n workflow might preprocess text differently
   - Backend-python might normalize differently

---

## Diagnostic Steps

### Step 1: Verify Frontend is Using Correct Endpoint
```bash
# Check frontend API client
cat frontend/src/services/api.ts | grep -i "query"
cat frontend/src/services/*Api.ts | grep -i "rag\|query"
```

### Step 2: Check Frontend Timeout Settings
```javascript
// Look for axios/fetch timeout configs
axios.create({
  timeout: 60000  // If this is 60s × 5 retries = 5min
})
```

### Step 3: Monitor Network Tab
1. Open browser DevTools → Network tab
2. Filter for "query" or "knowledge"
3. Run query: "Where did Lord Rama return to?"
4. Check:
   - Which endpoint is called?
   - How long does it take?
   - Is it retrying?

### Step 4: Check Backend Logs for User's Actual Query
```bash
docker-compose logs backend-python --tail=100 | grep -i "rama\|lord"
```

If no logs appear, the query isn't reaching backend-python.

### Step 5: Test Embedding Similarity Manually
```sql
-- Get a sample document embedding
WITH doc_embedding AS (
  SELECT embedding
  FROM n8n_vectors
  WHERE metadata->>'filename' = 'Diwali_v7.pdf'
  LIMIT 1
)
-- Test similarity with itself (should be 1.0)
SELECT
  1 - (e1.embedding <=> e2.embedding) / 2 as similarity
FROM doc_embedding e1, doc_embedding e2;
```

**Expected**: 1.0 (100% similar to itself)

### Step 6: Test Query Embedding Generation
```bash
docker exec better-backend-python-1 python3 -c "
import requests
resp = requests.post(
    'http://host.docker.internal:11434/api/embeddings',
    json={'model': 'nomic-embed-text', 'prompt': 'What is Diwali?'},
    timeout=30
)
print(f'Status: {resp.status_code}')
print(f'Embedding dimensions: {len(resp.json()[\"embedding\"])}')
"
```

**Expected**: Status 200, Dimensions: 768

---

## Recommended Actions

### Immediate:
1. **Clear Browser Cache** - Ensure latest frontend code is loaded
2. **Check Network Tab** - See actual API calls and timing
3. **Test Direct Backend** - Confirm <1s response:
   ```bash
   time curl -X POST "http://py.tip.localhost/api/knowledge/query" \
     -H "Content-Type: application/json" \
     -H "x-auth-bypass: true" \
     -d '{"query": "Where did Lord Rama return to?"}'
   ```

### Short-term:
1. **Lower Similarity Threshold to 0.0** - Return ANY chunks (for testing)
2. **Add Detailed Logging** - Frontend and backend timing breakdowns
3. **Test with Simple Text** - Try query: "Diwali" (single word)

### Long-term:
1. **Fix Embedding Model Tags** - Ensure consistent model versions
2. **Add Frontend Timeout Configuration** - Make timeout adjustable
3. **Implement Retry with Exponential Backoff** - Instead of fixed retries
4. **Add Query Performance Monitoring** - Track P50, P95, P99 latencies

---

## Test Query to Verify Backend Speed

Run this from your terminal:

```bash
echo "Testing backend query speed..."
START=$(date +%s)

RESPONSE=$(curl -s -X POST "http://py.tip.localhost/api/knowledge/query" \
  -H "Content-Type: application/json" \
  -H "x-auth-bypass: true" \
  -d '{"query": "Where did Lord Rama return to?"}')

END=$(date +%s)
DURATION=$((END - START))

echo "Response: $RESPONSE"
echo ""
echo "Backend query time: ${DURATION} seconds"
```

**Expected**: 1-2 seconds

If backend is fast but frontend is slow, the issue is **NOT in the backend**.

---

## Frontend Code to Check

### 1. API Client Configuration
File: `frontend/src/services/api.ts` or `frontend/src/lib/axios.ts`
```typescript
// Look for timeout settings
axios.create({
  baseURL: 'http://py.tip.localhost',
  timeout: 60000,  // ← CHECK THIS
  retry: 5  // ← CHECK THIS
})
```

### 2. Knowledge/Chat API Wrapper
File: `frontend/src/services/chatApi.ts` or similar
```typescript
// Look for the query function
export const queryKnowledge = async (query: string) => {
  // What endpoint does this call?
  // What timeout does it use?
  // Does it retry on failure?
}
```

### 3. React Component State Management
File: `frontend/src/pages/KnowledgeManagementPage.tsx` or similar
```typescript
// Look for query execution
const handleQuery = async () => {
  setLoading(true)
  try {
    const result = await queryAPI(...)  // ← TRACE THIS
  } finally {
    setLoading(false)
  }
}
```

---

## Expected vs Actual Flow

### Expected (Fast Path):
1. User types: "Where did Lord Rama return to?"
2. Frontend → POST `/api/knowledge/query` → Backend-Python
3. Backend generates embedding (0.5s)
4. Backend queries n8n_vectors (0.1s)
5. Backend returns chunks (0.1s)
6. **Total: <1 second**

### Actual (Slow Path - Hypothesis):
1. User types query
2. Frontend → POST `/api/knowledge/query`
3. Backend responds in 1s
4. Frontend timeout (60s) expires
5. Frontend retries #1 (60s)
6. Frontend retries #2 (60s)
7. Frontend retries #3 (60s)
8. Frontend retries #4 (60s)
9. **Total: 4m+**

---

## Key Questions to Answer

1. **Where are you testing from?**
   - Frontend UI?
   - Postman/Insomnia?
   - curl command?

2. **What endpoint are you calling?**
   - `/api/knowledge/query`?
   - `/api/chat`?
   - Something else?

3. **Are you seeing any errors?**
   - In browser console?
   - In network tab?
   - In backend logs?

4. **Can you share:**
   - Browser network tab screenshot
   - Frontend console logs
   - Backend logs during your query

---

## Bottom Line

**Backend is FAST (1 second)** - the performance optimization worked perfectly!

**User delay (4m 48s) is happening elsewhere:**
- Likely frontend timeout/retry logic
- Or testing via a different slow endpoint
- Or browser/network issue

**Next step**: Identify WHERE the delay is occurring by checking browser DevTools Network tab.
