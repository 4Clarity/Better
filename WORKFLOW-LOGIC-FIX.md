# n8n Workflow Logic Fix

## Problem Identified ✅

**Great news!** Authentication IS working. The issue is workflow routing logic.

### What's Happening

1. **"Check for Duplicates" node returns:**
   ```json
   {
     "is_duplicate": false,
     "existing_document_id": null,
     "strategy": "proceed"
   }
   ```

2. **"IF Duplicate SKIP" node evaluates INCORRECTLY**
   - Should go to FALSE branch (process document)
   - Instead goes to TRUE branch (skip processing)

3. **"Update Status (Duplicate Skipped)" node fails because:**
   - It's trying to access: `{{ $node['Webhook Trigger'].json.document_id }}`
   - But after "Check for Duplicates", the data context changed
   - Returns: `undefined`

## Backend Logic (Correct) ✅

The backend `/api/n8n/check-duplicate` returns:

| Scenario | is_duplicate | existing_document_id | strategy |
|----------|--------------|----------------------|----------|
| **New document** | `false` | `null` | `"proceed"` |
| **Currently processing** | `true` | `<id>` | `"skip"` |
| **Completed (create version)** | `true` | `<id>` | `"create_version"` |
| **Failed (replace)** | `true` | `<id>` | `"replace"` |

## Workflow Fix Required

### Fix 1: Correct the IF Node Condition

**Open n8n workflow → Click "IF Duplicate SKIP" node**

**Current condition** (likely incorrect):
```
Condition: is_duplicate == true
OR
Condition: strategy == "skip"
```

**Should be:**
```
Condition 1: is_duplicate = true (boolean)
AND
Condition 2: strategy = "skip" (string equals)
```

**OR more simply:**
```
Condition: strategy = "skip" (string equals)
```

This is because:
- If `strategy == "skip"`, then skip processing
- If `strategy == "proceed"`, then process normally (FALSE branch)
- If `strategy == "create_version"`, then process as new version (FALSE branch)
- If `strategy == "replace"`, then process as replacement (FALSE branch)

### Fix 2: Preserve Webhook Data

The "Update Status (Duplicate Skipped)" node needs the `document_id` from the webhook.

**Two options:**

**Option A: Reference Webhook Data Properly**

Change the node parameter from:
```
{{ $node['Webhook Trigger'].json.document_id }}
```

To:
```
{{ $node['Webhook Trigger'].json.body.document_id }}
```

OR try:
```
{{ $('Webhook Trigger').first().json.document_id }}
```

**Option B: Merge Data in IF Node**

Configure the IF node to include both:
- Data from "Check for Duplicates"
- Original webhook data

In n8n, you can set "Output Options" on the IF node to include data from previous nodes.

## Step-by-Step Fix in n8n UI

### Step 1: Fix IF Node Logic

1. Open workflow: "Document Chunking Analysis Pipeline"
2. Click node: **"IF Duplicate SKIP"**
3. Look at "Conditions":

**Current (probably):**
```
Condition: boolean
- value1: {{ $json.is_duplicate }}
- equals: true
```

**Change to:**
```
Condition: string
- value1: {{ $json.strategy }}
- equals: skip
```

4. Click "Execute Node" to test
5. Verify it routes correctly

### Step 2: Fix Update Status Node Data Access

1. Click node: **"Update Status (Duplicate Skipped)"**
2. In Body Parameters, find `document_id`
3. Change from:
   ```
   {{ $node['Webhook Trigger'].json.document_id }}
   ```
   To one of these (try each until one works):
   ```
   {{ $node['Webhook Trigger'].json.body.document_id }}
   ```
   OR
   ```
   {{ $('Webhook Trigger').first().json.document_id }}
   ```
   OR
   ```
   {{ $('Webhook Trigger').item.json.document_id }}
   ```

4. Click "Execute Node" to test

### Step 3: Fix Error Workflow (Still Important)

1. Click workflow settings (⚙️)
2. Error Workflow: Change from "Document Chunking Analysis Pipeline" to **"None"**
3. Save

### Step 4: Save and Reactivate

1. Save workflow
2. Toggle OFF
3. Toggle ON

## Testing After Fix

### Expected Behavior

**For NEW documents** (is_duplicate=false, strategy="proceed"):
1. ✓ Webhook Trigger
2. ✓ Check for Duplicates → returns `is_duplicate=false, strategy="proceed"`
3. ✓ IF Duplicate SKIP → evaluates to FALSE (proceed)
4. ✓ Extract Document Text
5. ✓ Analyze Chunking Strategy
6. ✓ Chunk Document
7. ✓ Generate Embeddings
8. ✓ Store Chunks in Database
9. ✓ Update Document Status (Success)

**For DUPLICATE documents** (is_duplicate=true, strategy="skip"):
1. ✓ Webhook Trigger
2. ✓ Check for Duplicates → returns `is_duplicate=true, strategy="skip"`
3. ✓ IF Duplicate SKIP → evaluates to TRUE (skip)
4. ✓ Update Status (Duplicate Skipped)

### Test Command

```bash
# Test with unique document (should process fully)
source ./n8n-helper.sh
n8n_trigger_webhook "document-processing" '{
  "document_id": "test-'$(date +%s)'",
  "filename": "unique-test-'$(date +%s)'.txt",
  "mime_type": "text/plain",
  "storage_path": "/tmp/test.txt",
  "content_hash": "hash-'$(date +%s)'",
  "file_content_base64": "VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQu"
}'

# Monitor execution
./monitor-n8n-workflow.sh check <execution_id>
```

## Understanding n8n Data Flow

### Data Context Changes

In n8n, each node receives data from the previous node:

```
Webhook Trigger
  ↓ outputs: { document_id, filename, mime_type, ... }
Check for Duplicates
  ↓ outputs: { is_duplicate, existing_document_id, strategy }
IF Duplicate SKIP
  ↓ TRUE branch: { is_duplicate, existing_document_id, strategy } (from Check for Duplicates)
  ↓ FALSE branch: { is_duplicate, existing_document_id, strategy } (from Check for Duplicates)
```

The original webhook data is NOT automatically passed through. You must reference it explicitly using:
- `$node['Node Name'].json.field`
- `$('Node Name').first().json.field`

### Accessing Earlier Node Data

Format: `{{ $node['Node Name'].json.field }}`

Examples:
```javascript
// From Webhook Trigger
{{ $node['Webhook Trigger'].json.document_id }}
{{ $node['Webhook Trigger'].json.filename }}

// From Check for Duplicates
{{ $node['Check for Duplicates'].json.is_duplicate }}
{{ $node['Check for Duplicates'].json.strategy }}

// Current node data (from previous node)
{{ $json.is_duplicate }}
{{ $json.strategy }}
```

## Your Observation Was Correct

> "Its like the strategy should only be Proceed if the existing_document_id is filled in."

**Actually, it's the opposite:**
- `strategy = "proceed"` when `existing_document_id = null` (new document)
- `strategy = "skip"` when `existing_document_id` has a value AND document is processing
- `strategy = "create_version"` when `existing_document_id` has a value AND document completed
- `strategy = "replace"` when `existing_document_id` has a value AND document failed

The backend logic is correct. The workflow IF logic needs to match it.

## Quick Reference: IF Node Configuration

**Correct configuration:**

```
Conditions:
  Mode: String
  Value 1: {{ $json.strategy }}
  Operation: Equal
  Value 2: skip
```

**Routing:**
- TRUE branch → Update Status (Duplicate Skipped)
- FALSE branch → Extract Document Text (continue processing)

## Additional Debugging

If still having issues after the fix, check these in n8n:

1. **Click "IF Duplicate SKIP" node**
2. **Click "Execute Node"** button
3. **Look at OUTPUT**:
   - TRUE output = documents going to skip branch
   - FALSE output = documents going to process branch

4. **Verify the input data**:
   - Should see: `is_duplicate`, `existing_document_id`, `strategy`
   - If you see other fields, the data flow is wrong

5. **Check connections**:
   - "Check for Duplicates" → "IF Duplicate SKIP" ✓
   - "IF Duplicate SKIP" TRUE → "Update Status (Duplicate Skipped)" ✓
   - "IF Duplicate SKIP" FALSE → "Extract Document Text" ✓

## Summary

**Authentication**: ✅ WORKING (great job setting that up!)
**Backend Logic**: ✅ CORRECT (returns proper values)
**Workflow Logic**: ❌ NEEDS FIX (IF node condition + data references)

**Two simple fixes in n8n UI:**
1. Change IF condition to check `strategy == "skip"`
2. Fix document_id reference in Update Status node

Then you're done! 🎉
