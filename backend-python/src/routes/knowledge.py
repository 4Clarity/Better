"""
Knowledge Management API Routes
Handles document upload, vector search, and RAG queries
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import uuid
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import os
import json
import re

from ..services.document_processor import get_document_processor
from ..services.vector_search import get_vector_search
from ..services.rag_query import get_rag_query_service
from ..services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Management"])

# File Upload Configuration
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'application/msword',  # .doc
    'text/plain',
    'text/markdown',
    'text/html'
}
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md', '.html'}


# Pydantic Models
class VectorSearchRequest(BaseModel):
    """Request model for vector similarity search"""
    query: str = Field(description="Search query text")
    limit: int = Field(default=5, ge=1, le=50, description="Maximum results")
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum similarity")
    security_classification: Optional[str] = Field(default=None, description="Security filter")


class RAGQueryRequest(BaseModel):
    """Request model for RAG query"""
    query: str = Field(description="User question")
    max_context_chunks: int = Field(default=5, ge=1, le=20, description="Max context chunks")
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Min similarity")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="LLM temperature")
    security_classification: Optional[str] = Field(default=None, description="Security filter")


class DocumentStatusResponse(BaseModel):
    """Response model for document processing status"""
    id: str
    filename: str
    upload_status: str
    chunk_count: int
    processing_error: Optional[str]


# Database connection pool
_db_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_db_connection_pool() -> pool.ThreadedConnectionPool:
    """
    Get or create database connection pool singleton

    Returns:
        ThreadedConnectionPool instance
    """
    global _db_connection_pool

    if _db_connection_pool is None:
        min_conn = int(os.getenv("DB_POOL_MIN_CONN", "2"))
        max_conn = int(os.getenv("DB_POOL_MAX_CONN", "10"))

        logger.info(f"Creating knowledge routes DB connection pool (min={min_conn}, max={max_conn})")

        _db_connection_pool = pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            host=os.getenv("DB_HOST", "db"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "tip"),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "password")
        )

    return _db_connection_pool


def get_db_connection():
    """Get database connection from pool"""
    return get_db_connection_pool().getconn()


def release_db_connection(conn):
    """Return database connection to pool"""
    if conn:
        get_db_connection_pool().putconn(conn)


# Background task for document processing
async def process_document_task(
    document_id: str,
    file_content: bytes,
    filename: str,
    mime_type: str
):
    """
    Background task to process uploaded document

    Args:
        document_id: Database document ID
        file_content: Raw file bytes
        filename: Original filename
        mime_type: MIME type
    """
    conn = None
    try:
        logger.info(f"Starting background processing for document {document_id}")

        # Update status to ANALYZING
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE knowledge_documents SET upload_status = 'ANALYZING' WHERE id = %s",
            (document_id,)
        )
        conn.commit()

        # Process document
        processor = get_document_processor()
        chunks, chunking_strategy = await processor.process_document(
            file_content=file_content,
            filename=filename,
            mime_type=mime_type,
            document_id=document_id
        )

        # Update status to EMBEDDING
        cursor.execute(
            """UPDATE knowledge_documents
               SET upload_status = 'EMBEDDING',
                   chunking_strategy = %s,
                   chunking_analysis_time_ms = %s
               WHERE id = %s""",
            (json.dumps(chunking_strategy), chunking_strategy.get('analysis_time_ms'), document_id)
        )
        conn.commit()

        # Save chunks to database
        for chunk in chunks:
            cursor.execute(
                """INSERT INTO knowledge_document_chunks (
                    id, document_id, chunk_index, content, token_count,
                    semantic_boundary_type, embedding, vector_model,
                    chunk_strategy_applied, thought_completeness_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    str(uuid.uuid4()),
                    chunk["document_id"],
                    chunk["chunk_index"],
                    chunk["content"],
                    chunk["token_count"],
                    chunk["semantic_boundary_type"],
                    chunk["embedding"],
                    chunk["vector_model"],
                    json.dumps(chunk["chunk_strategy_applied"]),
                    chunk["thought_completeness_score"]
                )
            )

        # Update status to COMPLETED
        cursor.execute(
            """UPDATE knowledge_documents
               SET upload_status = 'COMPLETED', chunk_count = %s
               WHERE id = %s""",
            (len(chunks), document_id)
        )
        conn.commit()

        logger.info(f"Successfully processed document {document_id} with {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")

        if conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE knowledge_documents
                   SET upload_status = 'FAILED', processing_error = %s
                   WHERE id = %s""",
                (str(e), document_id)
            )
            conn.commit()

    finally:
        release_db_connection(conn)


# API Endpoints

@router.get("/health")
async def health_check():
    """Health check for knowledge management services"""
    embedding_service = get_embedding_service()
    metadata = await embedding_service.get_embedding_metadata()

    return {
        "status": "healthy" if metadata["healthy"] else "degraded",
        "embedding_service": metadata
    }


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and other security issues

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for storage
    """
    # Remove any path components
    filename = os.path.basename(filename)
    # Replace unsafe characters with underscores
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    return filename


def validate_file_extension(filename: str) -> bool:
    """
    Validate file has an allowed extension

    Args:
        filename: Filename to validate

    Returns:
        True if extension is allowed
    """
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    security_classification: str = Form(default="UNCLASSIFIED")
):
    """
    Upload document for processing and embedding

    Args:
        file: Uploaded file
        uploaded_by: User ID who uploaded
        security_classification: Security level (UNCLASSIFIED, CONFIDENTIAL, etc.)

    Returns:
        Document ID and status
    """
    try:
        # Validate filename is present
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Sanitize filename to prevent path traversal attacks
        original_filename = file.filename
        safe_filename = sanitize_filename(original_filename)

        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        # Validate file extension
        if not validate_file_extension(safe_filename):
            allowed_exts = ', '.join(sorted(ALLOWED_EXTENSIONS))
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type. Allowed extensions: {allowed_exts}"
            )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_size > MAX_FILE_SIZE:
            max_size_mb = MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {max_size_mb}MB"
            )

        # Determine and validate MIME type
        mime_type = file.content_type or "application/octet-stream"

        if mime_type not in ALLOWED_MIME_TYPES:
            allowed_types = ', '.join(sorted(ALLOWED_MIME_TYPES))
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported MIME type: {mime_type}. Allowed types: {allowed_types}"
            )

        # Generate document ID
        document_id = str(uuid.uuid4())

        # Create document record in database
        conn = get_db_connection()
        cursor = conn.cursor()

        storage_path = f"knowledge/{security_classification.lower()}/{document_id}/{safe_filename}"

        cursor.execute(
            """INSERT INTO knowledge_documents (
                id, filename, original_name, file_size, mime_type, storage_path,
                upload_status, uploaded_by, security_classification
            ) VALUES (%s, %s, %s, %s, %s, %s, 'UPLOADED', %s, %s)""",
            (
                document_id,
                safe_filename,
                original_filename,
                file_size,
                mime_type,
                storage_path,
                uploaded_by,
                security_classification
            )
        )
        conn.commit()
        release_db_connection(conn)

        # Schedule background processing
        background_tasks.add_task(
            process_document_task,
            document_id,
            file_content,
            safe_filename,
            mime_type
        )

        logger.info(f"Document uploaded: {document_id} | Original: {original_filename} | Sanitized: {safe_filename} | Size: {file_size} bytes")

        return {
            "document_id": document_id,
            "filename": safe_filename,
            "original_name": original_filename,
            "file_size": file_size,
            "status": "UPLOADED",
            "message": "Document uploaded successfully. Processing in background."
        }

    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: str):
    """Get processing status for a document"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            """SELECT id, filename, upload_status, chunk_count, processing_error
               FROM knowledge_documents WHERE id = %s""",
            (document_id,)
        )

        result = cursor.fetchone()
        release_db_connection(conn)

        if not result:
            raise HTTPException(status_code=404, detail="Document not found")

        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def vector_search(request: VectorSearchRequest):
    """
    Perform vector similarity search

    Args:
        request: Search request with query and parameters

    Returns:
        List of similar chunks
    """
    try:
        search_service = get_vector_search()
        results = await search_service.search_similar_chunks(
            query_text=request.query,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold,
            security_classification=request.security_classification
        )

        return {
            "query": request.query,
            "results": results,
            "count": len(results)
        }

    except Exception as e:
        logger.error(f"Error during vector search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def rag_query(request: RAGQueryRequest):
    """
    Execute RAG query (Retrieval-Augmented Generation)

    Args:
        request: RAG query request

    Returns:
        Generated response with sources
    """
    try:
        rag_service = get_rag_query_service()
        result = await rag_service.query(
            user_query=request.query,
            max_context_chunks=request.max_context_chunks,
            similarity_threshold=request.similarity_threshold,
            security_classification=request.security_classification,
            temperature=request.temperature
        )

        return result

    except Exception as e:
        logger.error(f"Error during RAG query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_documents(
    limit: int = 50,
    offset: int = 0,
    security_classification: Optional[str] = None
):
    """List uploaded documents"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = "SELECT * FROM knowledge_documents"
        params = []

        if security_classification:
            query += " WHERE security_classification = %s"
            params.append(security_classification)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()
        release_db_connection(conn)

        return {
            "documents": [dict(row) for row in results],
            "count": len(results)
        }

    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
