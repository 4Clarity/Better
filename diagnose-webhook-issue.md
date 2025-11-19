//# n8n Webhook Registration Issue Diagnosis

## Current Status
- ✅ Workflow IS active: "Document Chunking Analysis Pipeline" (ID: S1reDEFte3H0mHZZ)
- ❌ Webhook IS NOT registered: "POST document-processing" returns 404
- ✅ docker-compose.yml is fixed and n8n restarted successfully

## Problem
The workflow activates successfully, but the webhook doesn't register. This indicates the **Webhook Trigger node has a configuration issue**.

## Most Common Causes

### 1. Webhook Trigger Node is Disabled
- Node appears grey/faded in the workflow
- Small pause icon on the node
- **Fix:** Click the node → Settings → Enable the node

### 2. Incorrect Path Configuration
- Path field is empty
- Path contains leading/trailing slashes
- Path contains special characters
- **Fix:** Path should be exactly: `document-processing` (no slashes)

### 3. Wrong Response Mode
- Response mode not set correctly
- **Fix:** Should be "When Last Node Finishes" or "Using 'Respond to Webhook' Node"

### 4. Workflow Has Validation Errors
- Red error icons on nodes
- Credentials missing or invalid
- **Fix:** Check all nodes for red error indicators

## Step-by-Step Fix in n8n UI

### Go to n8n: http://n8n.tip.localhost

1. **Open the workflow:**
   - Click "Workflows" in left sidebar
   - Open "Document Chunking Analysis Pipeline"

2. **Check Webhook Trigger node (first node):**
   - Click the "Webhook Trigger" node
   - Look for ANY red error icons or warnings
   - Verify these settings:

   ```
   ✓ HTTP Method: POST
   ✓ Path: document-processing (EXACTLY - no slashes)
   ✓ Respond: When Last Node Finishes
   ✓ Options → Response Mode: responseNode (or lastNode)
   ✓ Authentication: None
   ```

3. **Check if node is enabled:**
   - The node should NOT be grey/faded
   - There should be NO pause icon on it
   - If greyed out: Click node → Settings → Enable

4. **Save the workflow:**
   - Click "Save" button
   - Even if nothing changed

5. **Re-activate the workflow:**
   - Toggle Active OFF
   - Wait 2 seconds
   - Toggle Active ON
   - **Watch for success message**

6. **Check for errors at bottom of screen:**
   - Look at bottom status bar
   - Any red error messages?
   - Screenshot them if present

## Commands to Run After Fixing

Test if webhook is now registered:

```bash
docker-compose exec backend-python python -c "import requests; r = requests.post('http://n8n:5678/webhook/document-processing', json={'test': 'ping'}, timeout=3); print(f'HTTP {r.status_code}')"
```

**Expected:** `HTTP 200` (or anything other than 404)

Or run the full check:
```bash
./check-n8n-status.sh
```

## If Still Not Working

### Export and Inspect the Workflow JSON

1. In n8n, click the workflow menu (⋮ three dots)
2. Click "Export Workflow"
3. Save the JSON file
4. Send me the JSON or open it and look for the webhook trigger node:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "???",  // <-- What does this say?
        "responseMode": "???"  // <-- What does this say?
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    }
  ]
}
```

### Check n8n Logs During Activation

Open two terminal windows:

**Terminal 1 - Watch logs:**
```bash
docker-compose logs -f n8n | grep -i "webhook\|error\|activated"
```

**Terminal 2 - Re-activate workflow:**
```bash
docker-compose exec n8n n8n update:workflow --id=S1reDEFte3H0mHZZ --active=false
sleep 2
docker-compose exec n8n n8n update:workflow --id=S1reDEFte3H0mHZZ --active=true
```

Watch Terminal 1 for any error messages about webhook registration.

## What To Tell Me

If still not working after these steps, tell me:

1. **Webhook Trigger node settings:**
   - Path field value: ???
   - HTTP Method: ???
   - Respond: ???
   - Any error icons? (yes/no)

2. **Node status:**
   - Is the node greyed out/faded? (yes/no)
   - Does it have a pause icon? (yes/no)

3. **Workflow errors:**
   - Any red error messages at bottom of screen?
   - Any nodes with red error indicators?

4. **Logs during activation:**
   - What do you see in logs when toggling Active ON?
   - Any error messages?
