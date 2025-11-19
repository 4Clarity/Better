"""
n8n Integration API Routes
Wraps existing Python services as HTTP endpoints for n8n workflow consumption
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import logging
import base64
import uuid
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import os
import json

from ..services.document_processor import get_document_processor
from ..services.chunking_analyzer import get_chunking_analyzer
from ..services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/n8n", tags=["n8n Integration"])

# Authentication
N8N_API_KEY = os.getenv("N8N_API_KEY", "n8n-integration-secret-key")


# Pydantic Models for Request/Response

class ExtractTextRequest(BaseModel):
    """Request model for text extraction"""
    document_id: str = Field(description="Document ID from database")
    file_content_base64: str = Field(description="Base64-encoded file content")
    mime_type: str = Field(description="MIME type of the document")


class ExtractTextResponse(BaseModel):
    """Response model for text extraction"""
    document_id: str
    text_content: str
    status: str
    content_length: int


class AnalyzeChunkingRequest(BaseModel):
    """Request model for chunking analysis"""
    document_id: str = Field(description="Document ID from database")
    text_content: str = Field(description="Extracted text content")
    mime_type: str = Field(description="MIME type of the document")
    filename: Optional[str] = Field(default="document.txt", description="Filename for context")


class AnalyzeChunkingResponse(BaseModel):
    """Response model for chunking analysis"""
    document_id: str
    chunking_strategy: Dict
    status: str


class ChunkDocumentRequest(BaseModel):
    """Request model for document chunking"""
    document_id: str = Field(description="Document ID from database")
    text_content: str = Field(description="Text content to chunk")
    chunking_strategy: Dict = Field(description="Chunking strategy from analysis")


class ChunkDocumentResponse(BaseModel):
    """Response model for document chunking"""
    document_id: str
    chunks: List[Dict]
    chunk_count: int
    status: str


class GenerateEmbeddingsRequest(BaseModel):
    """Request model for embedding generation"""
    document_id: str = Field(description="Document ID from database")
    chunks: List[Dict] = Field(description="Chunks with content to embed")


class GenerateEmbeddingsResponse(BaseModel):
    """Response model for embedding generation"""
    document_id: str
    chunks_with_embeddings: List[Dict]
    successful_count: int
    failed_count: int
    status: str


class StoreChunksRequest(BaseModel):
    """Request model for storing chunks in database"""
    document_id: str = Field(description="Document ID from database")
    chunks_with_embeddings: List[Dict] = Field(description="Chunks with embeddings to store")


class StoreChunksResponse(BaseModel):
    """Response model for storing chunks"""
    document_id: str
    stored_count: int
    status: str


class UpdateStatusRequest(BaseModel):
    """Request model for updating document status"""
    document_id: str = Field(description="Document ID from database")
    status: str = Field(description="New status value")
    n8n_workflow_id: Optional[str] = Field(default=None, description="n8n workflow execution ID")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class UpdateStatusResponse(BaseModel):
    """Response model for status update"""
    document_id: str
    updated: bool
    status: str


class CheckDuplicateRequest(BaseModel):
    """Request model for duplicate detection"""
    document_id: Optional[str] = Field(default=None, description="Document ID to check")
    content_hash: str = Field(description="Hash of document content")
    filename: str = Field(description="Filename for comparison")


class CheckDuplicateResponse(BaseModel):
    """Response model for duplicate detection"""
    is_duplicate: bool
    existing_document_id: Optional[str]
    strategy: str  # "skip", "create_version", "replace"


# Database connection pool
_db_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_db_connection_pool() -> pool.ThreadedConnectionPool:
    """Get or create database connection pool singleton"""
    global _db_connection_pool

    if _db_connection_pool is None:
        min_conn = int(os.getenv("DB_POOL_MIN_CONN", "2"))
        max_conn = int(os.getenv("DB_POOL_MAX_CONN", "10"))

        logger.info(f"Creating n8n integration DB connection pool (min={min_conn}, max={max_conn})")

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


# Authentication Dependency

async def verify_n8n_api_key(authorization: Optional[str] = Header(None)):
    """
    Verify n8n API key from Authorization header

    Args:
        authorization: Authorization header with Bearer token

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format. Use: Bearer <token>")

    token = authorization.replace("Bearer ", "")

    if token != N8N_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


# API Endpoints

@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text(
    request: ExtractTextRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Extract text from document

    Args:
        request: Extract text request with document data

    Returns:
        Extracted text content and status
    """
    try:
        logger.info(f"n8n: Extracting text from document {request.document_id}")

        # Decode base64 file content
        try:
            file_content = base64.b64decode(request.file_content_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 encoding: {str(e)}")

        # Extract text using document processor
        processor = get_document_processor()
        text_content = await processor.extract_text(file_content, request.mime_type)

        if not text_content:
            raise HTTPException(status_code=400, detail="No text content extracted from document")

        logger.info(f"n8n: Successfully extracted {len(text_content)} characters from document {request.document_id}")

        return ExtractTextResponse(
            document_id=request.document_id,
            text_content=text_content,
            status="success",
            content_length=len(text_content)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error extracting text from document {request.document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@router.post("/analyze-chunking", response_model=AnalyzeChunkingResponse)
async def analyze_chunking(
    request: AnalyzeChunkingRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Analyze document and recommend chunking strategy

    Args:
        request: Analyze chunking request with document data

    Returns:
        Recommended chunking strategy
    """
    try:
        logger.info(f"n8n: Analyzing chunking strategy for document {request.document_id}")

        # Analyze document using chunking analyzer
        analyzer = get_chunking_analyzer()
        chunking_strategy = await analyzer.analyze_document_for_chunking(
            document_text=request.text_content,
            mime_type=request.mime_type,
            filename=request.filename
        )

        if not chunking_strategy:
            raise HTTPException(status_code=500, detail="Failed to determine chunking strategy")

        logger.info(f"n8n: Successfully analyzed chunking strategy for document {request.document_id}")

        return AnalyzeChunkingResponse(
            document_id=request.document_id,
            chunking_strategy=chunking_strategy,
            status="success"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error analyzing chunking for document {request.document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chunking analysis failed: {str(e)}")


@router.post("/chunk-document", response_model=ChunkDocumentResponse)
async def chunk_document(
    request: ChunkDocumentRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Chunk document using recommended strategy

    Args:
        request: Chunk document request with text and strategy

    Returns:
        List of document chunks
    """
    try:
        logger.info(f"n8n: Chunking document {request.document_id}")

        # Chunk document using document processor
        processor = get_document_processor()
        chunks = await processor.chunk_text_intelligently(
            text=request.text_content,
            chunking_strategy=request.chunking_strategy
        )

        if not chunks:
            raise HTTPException(status_code=500, detail="Failed to chunk document")

        logger.info(f"n8n: Successfully created {len(chunks)} chunks for document {request.document_id}")

        return ChunkDocumentResponse(
            document_id=request.document_id,
            chunks=chunks,
            chunk_count=len(chunks),
            status="success"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error chunking document {request.document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document chunking failed: {str(e)}")


@router.post("/generate-embeddings", response_model=GenerateEmbeddingsResponse)
async def generate_embeddings(
    request: GenerateEmbeddingsRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Generate embeddings for document chunks

    Args:
        request: Generate embeddings request with chunks

    Returns:
        Chunks with embeddings added
    """
    try:
        logger.info(f"n8n: Generating embeddings for {len(request.chunks)} chunks from document {request.document_id}")

        # Extract text from chunks
        chunk_texts = [chunk.get("content", "") for chunk in request.chunks]

        if not chunk_texts:
            raise HTTPException(status_code=400, detail="No chunk content provided")

        # Generate embeddings using embedding service
        embedding_service = get_embedding_service()
        embeddings = await embedding_service.generate_embeddings_batch(chunk_texts)

        # Combine chunks with embeddings
        chunks_with_embeddings = []
        successful_count = 0
        failed_count = 0

        for chunk, embedding in zip(request.chunks, embeddings):
            if embedding:
                chunk["embedding"] = embedding
                chunk["vector_model"] = embedding_service.model
                chunks_with_embeddings.append(chunk)
                successful_count += 1
            else:
                failed_count += 1
                logger.warning(f"n8n: Failed to generate embedding for chunk {chunk.get('chunk_index')}")

        logger.info(f"n8n: Generated embeddings for {successful_count}/{len(request.chunks)} chunks from document {request.document_id}")

        return GenerateEmbeddingsResponse(
            document_id=request.document_id,
            chunks_with_embeddings=chunks_with_embeddings,
            successful_count=successful_count,
            failed_count=failed_count,
            status="success" if successful_count > 0 else "partial_failure"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error generating embeddings for document {request.document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.post("/store-chunks", response_model=StoreChunksResponse)
async def store_chunks(
    request: StoreChunksRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Store document chunks with embeddings in database

    Args:
        request: Store chunks request with chunks and embeddings

    Returns:
        Number of chunks stored
    """
    conn = None
    try:
        logger.info(f"n8n: Storing {len(request.chunks_with_embeddings)} chunks for document {request.document_id}")

        conn = get_db_connection()
        cursor = conn.cursor()

        stored_count = 0

        for chunk in request.chunks_with_embeddings:
            # Validate required fields
            if not chunk.get("embedding"):
                logger.warning(f"n8n: Skipping chunk {chunk.get('chunk_index')} - no embedding")
                continue

            # Insert chunk into database
            cursor.execute(
                """INSERT INTO knowledge_document_chunks (
                    id, document_id, chunk_index, content, token_count,
                    semantic_boundary_type, embedding, vector_model,
                    chunk_strategy_applied, thought_completeness_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    str(uuid.uuid4()),
                    request.document_id,
                    chunk.get("chunk_index", 0),
                    chunk.get("content", ""),
                    chunk.get("token_count", 0),
                    chunk.get("semantic_boundary_type", "paragraph"),
                    chunk.get("embedding"),
                    chunk.get("vector_model", "nomic-embed-text"),
                    json.dumps(chunk.get("chunk_strategy_applied", {})),
                    chunk.get("thought_completeness_score", 0.85)
                )
            )
            stored_count += 1

        conn.commit()
        release_db_connection(conn)

        logger.info(f"n8n: Successfully stored {stored_count} chunks for document {request.document_id}")

        return StoreChunksResponse(
            document_id=request.document_id,
            stored_count=stored_count,
            status="success"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error storing chunks for document {request.document_id}: {str(e)}")
        if conn:
            conn.rollback()
            release_db_connection(conn)
        raise HTTPException(status_code=500, detail=f"Chunk storage failed: {str(e)}")


@router.post("/update-status", response_model=UpdateStatusResponse)
async def update_status(
    request: UpdateStatusRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Update document processing status

    Args:
        request: Update status request with document ID and new status

    Returns:
        Status update confirmation
    """
    conn = None
    try:
        logger.info(f"n8n: Updating status for document {request.document_id} to {request.status}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Build update query dynamically based on provided fields
        update_fields = ["upload_status = %s"]
        params = [request.status]

        if request.n8n_workflow_id:
            update_fields.append("n8n_workflow_id = %s")
            params.append(request.n8n_workflow_id)

        if request.error:
            update_fields.append("processing_error = %s")
            params.append(request.error)

        params.append(request.document_id)

        query = f"UPDATE knowledge_documents SET {', '.join(update_fields)} WHERE id = %s"

        cursor.execute(query, params)

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Document {request.document_id} not found")

        conn.commit()
        release_db_connection(conn)

        logger.info(f"n8n: Successfully updated status for document {request.document_id}")

        return UpdateStatusResponse(
            document_id=request.document_id,
            updated=True,
            status="success"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error updating status for document {request.document_id}: {str(e)}")
        if conn:
            conn.rollback()
            release_db_connection(conn)
        raise HTTPException(status_code=500, detail=f"Status update failed: {str(e)}")


@router.post("/check-duplicate", response_model=CheckDuplicateResponse)
async def check_duplicate(
    request: CheckDuplicateRequest,
    _: None = Depends(verify_n8n_api_key)
):
    """
    Check if document is a duplicate

    Args:
        request: Check duplicate request with content hash and filename

    Returns:
        Duplicate detection result with recommended strategy
    """
    conn = None
    try:
        logger.info(f"n8n: Checking for duplicate: {request.filename} (hash: {request.content_hash[:16]}...)")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Search for existing documents with same hash or similar filename
        cursor.execute(
            """SELECT id, filename, original_name, upload_status, created_at
               FROM knowledge_documents
               WHERE filename = %s OR original_name = %s
               ORDER BY created_at DESC
               LIMIT 1""",
            (request.filename, request.filename)
        )

        existing_doc = cursor.fetchone()
        release_db_connection(conn)

        if existing_doc:
            # Document exists - recommend strategy based on status
            existing_status = existing_doc.get("upload_status")

            if existing_status == "COMPLETED":
                strategy = "create_version"  # Create a new version
            elif existing_status == "FAILED":
                strategy = "replace"  # Replace failed upload
            else:
                strategy = "skip"  # Skip if currently processing

            logger.info(f"n8n: Found duplicate document {existing_doc['id']}, strategy: {strategy}")

            return CheckDuplicateResponse(
                is_duplicate=True,
                existing_document_id=existing_doc["id"],
                strategy=strategy
            )
        else:
            # No duplicate found
            logger.info(f"n8n: No duplicate found for {request.filename}")

            return CheckDuplicateResponse(
                is_duplicate=False,
                existing_document_id=None,
                strategy="proceed"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n: Error checking duplicate: {str(e)}")
        if conn:
            release_db_connection(conn)
        raise HTTPException(status_code=500, detail=f"Duplicate check failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check for n8n integration endpoints"""
    try:
        # Check database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        release_db_connection(conn)
        db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        db_healthy = False

    # Check embedding service
    embedding_service = get_embedding_service()
    embedding_metadata = await embedding_service.get_embedding_metadata()

    return {
        "status": "healthy" if (db_healthy and embedding_metadata["healthy"]) else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "embedding_service": embedding_metadata
    }
