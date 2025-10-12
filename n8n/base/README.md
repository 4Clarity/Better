# n8n Document Ingestion Workflow

## Overview
This workflow handles document uploads through a webhook, saves files to the filesystem, and stores metadata in PostgreSQL.

## Files
- `document-ingestion-workflow.json` - Main workflow file (import into n8n)
- `setup-database.sql` - Database table creation script
- `test-upload.sh` - Test script to upload a document

## Workflow Steps

1. **Webhook - File Upload** (POST /webhook-test/file-upload)
   - Receives document via HTTP POST
   - Accepts multipart/form-data

2. **Extract File Metadata** (Code Node)
   - Extracts filename, size, mime type
   - Generates unique filename with timestamp
   - Prepares metadata for storage

3. **Write Binary File**
   - Saves file to `/data/uploads/` directory
   - Uses timestamped filename to prevent collisions

4. **PostgreSQL - Insert Metadata**
   - Stores document metadata in `documents` table
   - Returns document ID

5. **Webhook Response**
   - Returns JSON response with document ID and status

## Setup Instructions

### 1. Create Database Table
Run the SQL script:
```bash
docker exec better-db-1 psql -U user -d tip < n8n/base/setup-database.sql
```

### 2. Import Workflow into n8n
1. Open n8n at http://n8n.tip.localhost
2. Click "Import from File"
3. Select `document-ingestion-workflow.json`

### 3. Configure PostgreSQL Credentials
1. In n8n, go to Credentials
2. Add PostgreSQL credentials:
   - **Name:** TIP PostgreSQL
   - **Host:** db
   - **Port:** 5432
   - **Database:** tip
   - **User:** user
   - **Password:** password

### 4. Activate Workflow
Click "Active" toggle in n8n

## Testing

### Upload a Test File
```bash
cd n8n/base
chmod +x test-upload.sh
./test-upload.sh test-document.pdf
```

### Manual Upload with cURL
```bash
curl -X POST http://n8n.tip.localhost:5678/webhook-test/file-upload \
  -F "file=@/path/to/your/document.pdf"
```

## Webhook Endpoint

**URL:** `http://n8n.tip.localhost:5678/webhook-test/file-upload`
**Method:** POST
**Content-Type:** multipart/form-data

### Response Format
```json
{
  "success": true,
  "document_id": "uuid-here",
  "filename": "1234567890_document.pdf",
  "message": "Document uploaded successfully"
}
```

## File Storage

Files are stored at:
- **Container Path:** `/data/uploads/`
- **Host Path:** `/Users/richardroach/data/uploads/`

## Database Schema

See `setup-database.sql` for the `documents` table structure.

## Troubleshooting

### Workflow fails with "Unrecognized node type"
- Remove any unsupported nodes from the workflow
- Check that all required n8n community nodes are installed

### Files not saving
- Verify volume mount in docker-compose.yml
- Check `/data/uploads/` permissions in n8n container

### Database connection fails
- Verify PostgreSQL credentials in n8n
- Ensure database table exists
- Check that db container is running

## Next Steps

Enhance the workflow with:
- Document type validation
- Virus scanning
- OCR/text extraction
- Thumbnail generation
- Integration with knowledge management system
