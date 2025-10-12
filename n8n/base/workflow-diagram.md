# Document Ingestion Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Document Ingestion Workflow                      │
└─────────────────────────────────────────────────────────────────────┘

   HTTP POST                                                  Response
   with file                                                  with metadata
      │                                                            ▲
      │                                                            │
      ▼                                                            │
┌──────────────┐
│   Webhook    │  Receives file upload via POST
│  File Upload │  /webhook-test/file-upload
└──────┬───────┘
       │
       │ Binary data + request info
       │
       ▼
┌──────────────┐
│   Extract    │  JavaScript code extracts:
│    File      │  - Filename
│  Metadata    │  - File size
└──────┬───────┘  - MIME type
       │          - Extension
       │          - Timestamp
       │
       │ Metadata object + Binary data
       │
       ▼
┌──────────────┐
│  Write       │  Saves file to filesystem:
│   Binary     │  /data/uploads/{timestamp}_{filename}
│    File      │
└──────┬───────┘
       │
       │ File path + Metadata
       │
       ▼
┌──────────────┐
│ PostgreSQL   │  INSERT INTO documents
│   Insert     │  Returns document_id
│  Metadata    │
└──────┬───────┘
       │
       │ Document record with ID
       │
       ▼
┌──────────────┐
│   Webhook    │  Returns JSON:
│   Response   │  { success: true,
└──────────────┘    document_id: "...",
                    filename: "...",
                    message: "..." }


═══════════════════════════════════════════════════════════════════

Data Flow:

1. Client uploads file
   POST http://n8n.tip.localhost:5678/webhook-test/file-upload
   Content-Type: multipart/form-data
   Body: { file: <binary> }

2. Webhook receives and passes to next node

3. Extract Metadata processes:
   Input:  { binary: { file: <data> } }
   Output: {
     filename: "1696608000000_document.pdf",
     original_filename: "document.pdf",
     file_path: "/data/uploads/1696608000000_document.pdf",
     file_size: 12345,
     mime_type: "application/pdf",
     file_extension: "pdf",
     metadata: { upload_timestamp: "2025-10-06T..." }
   }

4. Write Binary File saves to disk

5. PostgreSQL stores metadata:
   documents table row created with UUID

6. Response sent back to client:
   {
     "success": true,
     "document_id": "uuid-here",
     "filename": "1696608000000_document.pdf",
     "message": "Document uploaded successfully"
   }

═══════════════════════════════════════════════════════════════════

Error Handling:

- File write fails → Error returned to client
- Database insert fails → File saved but no metadata
- Invalid file format → Can add validation in Extract Metadata
- Size limit exceeded → Can add in Extract Metadata

Enhancement Opportunities:

1. Add validation node after Extract Metadata
   - Check file type (whitelist: pdf, doc, docx, txt)
   - Check file size limit
   - Virus scanning integration

2. Add processing branch
   - OCR for PDFs
   - Text extraction
   - Thumbnail generation

3. Add notification
   - Email on upload
   - Slack notification
   - Webhook to other services

4. Add to Knowledge Management
   - Integration with existing KM system
   - Automatic categorization
   - Fact extraction trigger
```
