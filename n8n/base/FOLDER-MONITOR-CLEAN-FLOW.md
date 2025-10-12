# Folder Monitor - Clean Flow

## Overview
This workflow keeps the `/uploads/` folder clean by automatically moving files through a processing pipeline every 5 minutes.

## Folder Structure

```
/data/uploads/
├── received/     ← Files moved here first with timestamp
├── processed/    ← Final destination after processing
└── [files]       ← Upload folder (always cleaned out)
```

## Workflow Steps

```
Every 5 minutes
    ↓
1. List Files in /uploads/
    ↓
2. Parse File List (exclude subdirectories)
    ↓
3. Generate Paths (create timestamp filenames)
    ↓
4. Move to /received/ (with timestamp prefix)
    ↓
5. Read Binary File
    ↓
6. Process File Data (extract metadata)
    ↓
7. Save to Database
    ↓
8. Merge Paths
    ↓
9. Move to /processed/
```

## Key Features

✅ **Clean Uploads Folder** - Files immediately moved to `/received/`
✅ **Timestamp Naming** - `{timestamp}_{filename}` prevents collisions
✅ **No Database Check** - All files in `/uploads/` are new
✅ **Automatic Processing** - Runs every 5 minutes
✅ **Metadata Tracking** - Stores file info with `source: 'folder_monitor'`

## File Flow Example

1. **Upload**: User drops `report.pdf` into `/uploads/`
2. **Scheduler runs** (within 5 minutes)
3. **Move to received**: → `/received/1759812345678_report.pdf`
4. **Process**: Read file, extract metadata, save to DB
5. **Move to processed**: → `/processed/1759812345678_report.pdf`
6. **Result**: `/uploads/` is empty again

## Import Instructions

1. **Create folders** (if not exist):
   ```bash
   mkdir -p /Users/richardroach/data/uploads/received
   mkdir -p /Users/richardroach/data/uploads/processed
   ```

2. **Import workflow**:
   - In n8n, click "Import from File"
   - Select: `folder-monitor-workflow-fixed.json`
   - Configure PostgreSQL credentials

3. **Test manually first**:
   - Add a test file to `/uploads/`
   - Click "Execute Workflow"
   - Verify file moved to `/received/`, then `/processed/`
   - Check database for new entry

4. **Activate**:
   - Toggle to "Active" (top right)
   - Files will be processed automatically every 5 minutes

## Testing

### Manual Test

```bash
# Create test file
echo "Test document $(date)" > /Users/richardroach/data/uploads/manual-test.txt

# Wait for next run (up to 5 minutes) or execute manually in n8n

# Verify results
ls -lh /Users/richardroach/data/uploads/          # Should be empty
ls -lh /Users/richardroach/data/uploads/received/ # Should be empty (moved to processed)
ls -lh /Users/richardroach/data/uploads/processed/ | grep manual-test

# Check database
docker exec better-db-1 psql -U user -d tip -c \
  "SELECT filename, original_filename FROM documents WHERE original_filename = 'manual-test.txt';"
```

## Monitoring

### Check Uploads Folder (should always be empty)
```bash
ls -lh /Users/richardroach/data/uploads/
```

### Check Processed Files
```bash
ls -lht /Users/richardroach/data/uploads/processed/ | head -10
```

### Database Query
```sql
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

### Files stuck in /uploads/
- Check workflow is Active
- Check n8n execution logs for errors
- Manually execute workflow to see which node fails

### Files stuck in /received/
- Check "Move to Processed" node for errors
- Verify `/processed/` folder exists and has write permissions

### Permission errors
```bash
# Fix permissions in n8n container
docker exec better-n8n-1 chmod -R 777 /data/uploads/
```

## Comparison with Previous Version

| Feature | Old Version | New Version |
|---------|------------|-------------|
| Database Check | Yes (slow) | No (faster) |
| Delete Original | Yes | No (moved twice) |
| Upload Folder | Had files | Always clean |
| Intermediate Step | None | /received/ folder |
| File Detection | Timestamp prefix check | All files |

## Notes

- Files are **never deleted**, only moved
- Original filename preserved in database
- Timestamped filename used for storage
- `/uploads/` folder stays clean for easy monitoring
- `/received/` folder is temporary (files move to `/processed/`)
- Both webhook and folder monitor can run simultaneously

## Integration with Webhook Workflow

**Webhook workflow**: For API uploads (immediate processing)
**Folder monitor**: For manual file drops (periodic processing)

Both write to same database table and use same folder structure.
