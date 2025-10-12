# Folder Monitor Workflow

## Overview
Automatically monitors `/data/uploads/` folder and processes new files every 5 minutes.

## How It Works

```
Every 5 minutes
    ↓
List files in /uploads/
    ↓
Check if already in database
    ↓
If NEW file:
    → Read file
    → Rename with timestamp
    → Save to database
    → Move to /processed/
    → Delete original
```

## Workflow Steps

1. **Schedule Trigger** - Runs every 5 minutes
2. **List Files** - Find all files in `/data/uploads/`
3. **Parse File List** - Convert to array of filenames
4. **Check If Processed** - Query database to see if already processed
5. **Filter Unprocessed** - Only continue with new files
6. **Read Binary File** - Load file content
7. **Process File Data** - Extract metadata, generate timestamp filename
8. **Write Renamed File** - Save as `{timestamp}_{original_filename}`
9. **Save to Database** - Store metadata with `source: 'folder_monitor'`
10. **Merge Paths** - Combine database response with file paths
11. **Move to Processed** - Move timestamped file to `/processed/`
12. **Delete Original** - Remove original file from `/uploads/`

## Features

✅ **Automatic Processing** - Runs every 5 minutes
✅ **Duplicate Prevention** - Checks database before processing
✅ **Timestamp Naming** - Prevents filename collisions
✅ **Clean Up** - Removes original files after processing
✅ **Metadata Tracking** - Tags files with `source: 'folder_monitor'`

## Configuration

### Change Poll Interval

Edit the **Schedule Trigger** node:
- Current: Every 5 minutes
- Options: minutes, hours, days, weeks, custom cron

### Change Monitored Folder

Edit **List Files in Uploads** command:
```bash
find /data/uploads -maxdepth 1 -type f
```

## Testing

### Test with a new file:

1. Copy a file to uploads folder:
```bash
cp /path/to/test.pdf /Users/richardroach/data/uploads/
```

2. Wait 5 minutes (or manually execute workflow)

3. Verify:
```bash
# Check processed folder
ls -lh /Users/richardroach/data/uploads/processed/

# Check database
docker exec better-db-1 psql -U user -d tip -c \
  "SELECT filename, original_filename, metadata->>'source' as source FROM documents ORDER BY upload_date DESC LIMIT 5;"
```

## Import Instructions

1. **Import workflow:**
   - In n8n, click "Import from File"
   - Select: `folder-monitor-workflow.json`

2. **Configure PostgreSQL credentials:**
   - Click "Check If Already Processed" node
   - Select "TIP PostgreSQL" credential
   - Click "Save to Database" node
   - Select "TIP PostgreSQL" credential

3. **Activate workflow:**
   - Toggle to "Active" (top right)

4. **Test manually first:**
   - Click "Execute Workflow" to test
   - Add a test file to `/uploads/`
   - Watch the execution

## Monitoring

### Check Recent Executions

In n8n:
- Go to "Executions" (left sidebar)
- Filter by workflow name
- Check for errors

### View Processed Files

```bash
# List processed files
ls -lht /Users/richardroach/data/uploads/processed/ | head -10

# Count files
echo "Processed: $(ls -1 /Users/richardroach/data/uploads/processed/ | wc -l)"
echo "Pending: $(ls -1 /Users/richardroach/data/uploads/ | wc -l)"
```

### Database Query

```sql
-- Files processed by folder monitor
SELECT
  filename,
  original_filename,
  file_size,
  upload_date,
  metadata->>'source' as source
FROM documents
WHERE metadata->>'source' = 'folder_monitor'
ORDER BY upload_date DESC
LIMIT 10;
```

## Troubleshooting

### Files not being processed

1. Check workflow is Active
2. Check n8n execution logs for errors
3. Verify `/data/uploads/` is accessible in container:
   ```bash
   docker exec better-n8n-1 ls -la /data/uploads/
   ```

### Duplicate processing

The workflow checks the database before processing. If duplicates occur:
- Check the "Check If Already Processed" node query
- Verify database connection

### Permission errors

If move/delete fails:
```bash
# Fix permissions in n8n container
docker exec better-n8n-1 chmod -R 777 /data/uploads/
```

## Notes

- Original files are **deleted** after successful processing
- If processing fails, original file remains in `/uploads/`
- Processed files have timestamp prefix: `1759783440272_filename.pdf`
- Hidden files (starting with `.`) are ignored
- Subdirectories are ignored (`-maxdepth 1`)

## Comparison with Webhook Workflow

| Feature | Webhook Workflow | Folder Monitor |
|---------|-----------------|----------------|
| Trigger | HTTP POST | Every 5 minutes |
| Use Case | API uploads | Manual file drops |
| Speed | Immediate | Up to 5 min delay |
| File Source | Multipart upload | Existing file |
| Cleanup | N/A | Deletes original |

Both workflows can run simultaneously!
