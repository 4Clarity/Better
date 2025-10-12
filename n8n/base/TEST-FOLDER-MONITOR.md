# Folder Monitor Workflow - Testing Guide

## Current Status

**Fix Applied**: Updated Merge Paths node to use `$node['Generate Metadata'].json.field` syntax instead of `$('Generate Metadata').item.json.field`

**File**: `folder-monitor-v2-simple.json`

**Issue Fixed**: Delete Original node was receiving "undefined" for file paths

## Testing Steps

### 1. Re-import Updated Workflow

**IMPORTANT**: You must re-import the workflow to apply the fix!

1. In n8n, go to Workflows
2. Delete or deactivate the old "Folder Monitor v2 - Simple" workflow
3. Click "Import from File"
4. Select: `/Users/richardroach/Documents/Builder_Projects/Better/n8n/base/folder-monitor-v2-simple.json`
5. Configure PostgreSQL credentials if needed
6. **DO NOT activate yet** - test manually first

### 2. Manual Test Execution

A test file has been created: `/Users/richardroach/data/uploads/test-delete-original.txt`

**To test manually:**

1. Open the imported workflow in n8n
2. Click "Execute Workflow" (top right)
3. Watch each node execute
4. **Check for errors** in the Delete Original node

**Expected behavior:**
- All nodes should complete successfully ✅
- No "undefined" error in Delete Original ✅
- File should be moved to `/processed/` with timestamp prefix ✅
- Original file should be deleted ✅

### 3. Verify Results

Run these commands to verify:

```bash
# Check if file was processed and moved
ls -lh /Users/richardroach/data/uploads/processed/ | grep test-delete-original

# Check if original was deleted (should show "No such file")
ls -lh /Users/richardroach/data/uploads/test-delete-original.txt

# Check database entry
docker exec better-db-1 psql -U user -d tip -c \
  "SELECT filename, original_filename, file_path, metadata->>'source' FROM documents WHERE original_filename = 'test-delete-original.txt' ORDER BY upload_date DESC LIMIT 1;"
```

### 4. Activate Automatic Processing

Once manual test passes:

1. Toggle workflow to "Active" (top right in n8n)
2. Create another test file:
   ```bash
   echo "Auto-test $(date)" > /Users/richardroach/data/uploads/auto-test.txt
   ```
3. Wait up to 5 minutes for next poll
4. Verify file was processed automatically

## Current Files in System

**Uploads folder** (waiting to be processed):
- `test-folder-monitor.txt` (44B) - From earlier test
- `test-delete-original.txt` (56B) - Fresh test file
- Several PDF and other files with timestamp prefixes (already renamed but not moved)

**Processed folder**:
- `1759783440272_tpackage-json.json`
- `1759808954535_test-folder-monitor.txt`
- `1759809030394_test-folder-monitor.txt`

**Database**: 5 files tracked with `source: 'folder_monitor'`

## Workflow Flow

```
Every 5 minutes
    ↓
List Files (BusyBox-compatible command)
    ↓
Parse Files (extract filenames)
    ↓
Filter Unprocessed (check for timestamp prefix)
    ↓
Read File (load binary data)
    ↓
Generate Metadata (timestamp, paths, file info)
    ↓
Write Renamed File (save as {timestamp}_{filename})
    ↓
Save to Database (store metadata)
    ↓
Merge Paths (combine DB response with file paths) ⚠️ FIXED
    ↓
Move to Processed (mv renamed → /processed/)
    ↓
Delete Original (rm original file) ⚠️ SHOULD NOW WORK
```

## Troubleshooting

### If Delete Original still fails:

1. Check n8n execution log for exact error message
2. Verify the Merge Paths node output shows all three paths:
   - `file_path_original`
   - `file_path_renamed`
   - `file_path_processed`
3. Check if the workflow was actually re-imported (old version might still be running)

### If files aren't being detected:

1. Verify workflow is Active
2. Check schedule trigger is set to 5 minutes
3. Wait for next execution (check Executions list)
4. Verify file doesn't already have timestamp prefix (would be filtered out)

### Database Query Errors:

If "Check If Already Processed" fails:
- Verify PostgreSQL credentials are configured
- Check database connection in n8n settings
- Ensure `documents` table exists

## Next Steps After Successful Test

1. ✅ Confirm Delete Original works
2. ✅ Activate workflow for automatic processing
3. ✅ Monitor executions for any errors
4. ✅ Update main documentation with working configuration
5. ⚠️ Consider cleanup of timestamped files in /uploads/ folder
6. ⚠️ Consider adding error notifications (email/webhook)

## Files to Clean Up

There are timestamped files in `/uploads/` that should be in `/processed/`:
- `1759781548904_LOTO EMPLOYEE TRAINING.pdf`
- `1759782466296_PW_PoolCoverMeasurement_Roach.pdf`
- `1759783206988_CLAUDE4.txt`
- ... and others

These were likely created during earlier testing. Once workflow is confirmed working, you can manually move them:

```bash
cd /Users/richardroach/data/uploads
for file in [0-9]*_*; do
  mv "$file" processed/ 2>/dev/null
done
```
