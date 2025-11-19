"""
Unit tests for n8n Integration API
Tests all endpoints with success and failure scenarios
"""

import pytest
import sys
import os
import base64
import json
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException

# Import the routes we're testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.routes.n8n_integration import (
    ExtractTextRequest,
    ExtractTextResponse,
    AnalyzeChunkingRequest,
    AnalyzeChunkingResponse,
    ChunkDocumentRequest,
    ChunkDocumentResponse,
    GenerateEmbeddingsRequest,
    GenerateEmbeddingsResponse,
    StoreChunksRequest,
    StoreChunksResponse,
    UpdateStatusRequest,
    UpdateStatusResponse,
    CheckDuplicateRequest,
    CheckDuplicateResponse,
    verify_n8n_api_key,
    N8N_API_KEY
)


class TestAuthentication:
    """Test suite for n8n API key authentication"""

    @pytest.mark.asyncio
    async def test_verify_api_key_success(self):
        """Test successful API key verification"""
        authorization = f"Bearer {N8N_API_KEY}"
        # Should not raise exception
        await verify_n8n_api_key(authorization)

    @pytest.mark.asyncio
    async def test_verify_api_key_missing_header(self):
        """Test API key verification with missing header"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_n8n_api_key(None)
        assert exc_info.value.status_code == 401
        assert "Authorization header missing" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_verify_api_key_invalid_format(self):
        """Test API key verification with invalid format"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_n8n_api_key("InvalidFormat")
        assert exc_info.value.status_code == 401
        assert "Invalid authorization format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_verify_api_key_wrong_token(self):
        """Test API key verification with wrong token"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_n8n_api_key("Bearer wrong-token")
        assert exc_info.value.status_code == 403
        assert "Invalid API key" in str(exc_info.value.detail)


class TestExtractTextEndpoint:
    """Test suite for /extract-text endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_document_processor')
    async def test_extract_text_success(self, mock_get_processor):
        """Test successful text extraction"""
        # Mock document processor
        from unittest.mock import AsyncMock
        mock_processor = Mock()
        mock_processor.extract_text = AsyncMock(return_value="Sample extracted text content")
        mock_get_processor.return_value = mock_processor

        # Import endpoint function
        from src.routes.n8n_integration import extract_text

        # Create request
        test_content = b"Sample PDF content"
        request = ExtractTextRequest(
            document_id="test-doc-123",
            file_content_base64=base64.b64encode(test_content).decode("utf-8"),
            mime_type="application/pdf"
        )

        # Call endpoint (bypassing auth dependency)
        response = await extract_text(request, None)

        # Assertions
        assert response.document_id == "test-doc-123"
        assert response.text_content == "Sample extracted text content"
        assert response.status == "success"
        assert response.content_length == len("Sample extracted text content")

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_document_processor')
    async def test_extract_text_invalid_base64(self, mock_get_processor):
        """Test text extraction with invalid base64 encoding"""
        from src.routes.n8n_integration import extract_text

        request = ExtractTextRequest(
            document_id="test-doc-123",
            file_content_base64="invalid-base64!!!",
            mime_type="application/pdf"
        )

        with pytest.raises(HTTPException) as exc_info:
            await extract_text(request, None)
        assert exc_info.value.status_code == 400
        assert "Invalid base64 encoding" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_document_processor')
    async def test_extract_text_empty_content(self, mock_get_processor):
        """Test text extraction with empty result"""
        from unittest.mock import AsyncMock
        mock_processor = Mock()
        mock_processor.extract_text = AsyncMock(return_value="")
        mock_get_processor.return_value = mock_processor

        from src.routes.n8n_integration import extract_text

        test_content = b"Empty content"
        request = ExtractTextRequest(
            document_id="test-doc-123",
            file_content_base64=base64.b64encode(test_content).decode("utf-8"),
            mime_type="application/pdf"
        )

        with pytest.raises(HTTPException) as exc_info:
            await extract_text(request, None)
        assert exc_info.value.status_code == 400
        assert "No text content extracted" in str(exc_info.value.detail)


class TestAnalyzeChunkingEndpoint:
    """Test suite for /analyze-chunking endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_chunking_analyzer')
    async def test_analyze_chunking_success(self, mock_get_analyzer):
        """Test successful chunking analysis"""
        # Mock chunking analyzer
        from unittest.mock import AsyncMock
        mock_analyzer = Mock()
        mock_strategy = {
            "recommended_chunk_size_range": [400, 800],
            "semantic_boundaries": ["paragraph", "section"],
            "overlap_tokens": 75,
            "special_handling": {},
            "rationale": "Technical document",
            "confidence_score": 0.9
        }
        mock_analyzer.analyze_document_for_chunking = AsyncMock(return_value=mock_strategy)
        mock_get_analyzer.return_value = mock_analyzer

        from src.routes.n8n_integration import analyze_chunking

        request = AnalyzeChunkingRequest(
            document_id="test-doc-123",
            text_content="Sample text for analysis",
            mime_type="application/pdf",
            filename="test.pdf"
        )

        response = await analyze_chunking(request, None)

        assert response.document_id == "test-doc-123"
        assert response.chunking_strategy == mock_strategy
        assert response.status == "success"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_chunking_analyzer')
    async def test_analyze_chunking_failure(self, mock_get_analyzer):
        """Test chunking analysis failure"""
        from unittest.mock import AsyncMock
        mock_analyzer = Mock()
        mock_analyzer.analyze_document_for_chunking = AsyncMock(return_value=None)
        mock_get_analyzer.return_value = mock_analyzer

        from src.routes.n8n_integration import analyze_chunking

        request = AnalyzeChunkingRequest(
            document_id="test-doc-123",
            text_content="Sample text",
            mime_type="application/pdf"
        )

        with pytest.raises(HTTPException) as exc_info:
            await analyze_chunking(request, None)
        assert exc_info.value.status_code == 500
        assert "Failed to determine chunking strategy" in str(exc_info.value.detail)


class TestChunkDocumentEndpoint:
    """Test suite for /chunk-document endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_document_processor')
    async def test_chunk_document_success(self, mock_get_processor):
        """Test successful document chunking"""
        from unittest.mock import AsyncMock
        mock_processor = Mock()
        mock_chunks = [
            {"chunk_index": 0, "content": "Chunk 1", "token_count": 100},
            {"chunk_index": 1, "content": "Chunk 2", "token_count": 120}
        ]
        mock_processor.chunk_text_intelligently = AsyncMock(return_value=mock_chunks)
        mock_get_processor.return_value = mock_processor

        from src.routes.n8n_integration import chunk_document

        request = ChunkDocumentRequest(
            document_id="test-doc-123",
            text_content="Sample text to chunk",
            chunking_strategy={"recommended_chunk_size_range": [400, 800]}
        )

        response = await chunk_document(request, None)

        assert response.document_id == "test-doc-123"
        assert response.chunk_count == 2
        assert len(response.chunks) == 2
        assert response.status == "success"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_document_processor')
    async def test_chunk_document_empty_result(self, mock_get_processor):
        """Test document chunking with empty result"""
        mock_processor = Mock()
        mock_processor.chunk_text_intelligently = Mock(return_value=[])
        mock_get_processor.return_value = mock_processor

        from src.routes.n8n_integration import chunk_document

        request = ChunkDocumentRequest(
            document_id="test-doc-123",
            text_content="Short text",
            chunking_strategy={}
        )

        with pytest.raises(HTTPException) as exc_info:
            await chunk_document(request, None)
        assert exc_info.value.status_code == 500


class TestGenerateEmbeddingsEndpoint:
    """Test suite for /generate-embeddings endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_embedding_service')
    async def test_generate_embeddings_success(self, mock_get_embedding):
        """Test successful embedding generation"""
        from unittest.mock import AsyncMock
        mock_service = Mock()
        mock_service.model = "nomic-embed-text"
        mock_embeddings = [[0.1] * 768, [0.2] * 768]
        mock_service.generate_embeddings_batch = AsyncMock(return_value=mock_embeddings)
        mock_get_embedding.return_value = mock_service

        from src.routes.n8n_integration import generate_embeddings

        request = GenerateEmbeddingsRequest(
            document_id="test-doc-123",
            chunks=[
                {"chunk_index": 0, "content": "Chunk 1"},
                {"chunk_index": 1, "content": "Chunk 2"}
            ]
        )

        response = await generate_embeddings(request, None)

        assert response.document_id == "test-doc-123"
        assert response.successful_count == 2
        assert response.failed_count == 0
        assert response.status == "success"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_embedding_service')
    async def test_generate_embeddings_partial_failure(self, mock_get_embedding):
        """Test embedding generation with partial failures"""
        from unittest.mock import AsyncMock
        mock_service = Mock()
        mock_service.model = "nomic-embed-text"
        mock_embeddings = [[0.1] * 768, None, [0.2] * 768]  # One failure
        mock_service.generate_embeddings_batch = AsyncMock(return_value=mock_embeddings)
        mock_get_embedding.return_value = mock_service

        from src.routes.n8n_integration import generate_embeddings

        request = GenerateEmbeddingsRequest(
            document_id="test-doc-123",
            chunks=[
                {"chunk_index": 0, "content": "Chunk 1"},
                {"chunk_index": 1, "content": "Chunk 2"},
                {"chunk_index": 2, "content": "Chunk 3"}
            ]
        )

        response = await generate_embeddings(request, None)

        assert response.successful_count == 2
        assert response.failed_count == 1
        assert response.status == "success"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_embedding_service')
    async def test_generate_embeddings_no_content(self, mock_get_embedding):
        """Test embedding generation with no chunk content"""
        from unittest.mock import AsyncMock
        from src.routes.n8n_integration import generate_embeddings

        # Mock service
        mock_service = Mock()
        mock_service.model = "nomic-embed-text"
        mock_service.generate_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])
        mock_get_embedding.return_value = mock_service

        request = GenerateEmbeddingsRequest(
            document_id="test-doc-123",
            chunks=[{"chunk_index": 0}]  # No content field
        )

        # Should return empty string for missing content, which gets embedded
        response = await generate_embeddings(request, None)
        assert response.successful_count >= 0  # Should not crash


class TestStoreChunksEndpoint:
    """Test suite for /store-chunks endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_store_chunks_success(self, mock_release, mock_get_conn):
        """Test successful chunk storage"""
        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import store_chunks

        request = StoreChunksRequest(
            document_id="test-doc-123",
            chunks_with_embeddings=[
                {
                    "chunk_index": 0,
                    "content": "Chunk 1",
                    "token_count": 100,
                    "semantic_boundary_type": "paragraph",
                    "embedding": [0.1] * 768,
                    "vector_model": "nomic-embed-text",
                    "chunk_strategy_applied": {},
                    "thought_completeness_score": 0.85
                }
            ]
        )

        response = await store_chunks(request, None)

        assert response.document_id == "test-doc-123"
        assert response.stored_count == 1
        assert response.status == "success"
        mock_cursor.execute.assert_called()
        mock_conn.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_store_chunks_skip_no_embedding(self, mock_release, mock_get_conn):
        """Test chunk storage skips chunks without embeddings"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import store_chunks

        request = StoreChunksRequest(
            document_id="test-doc-123",
            chunks_with_embeddings=[
                {"chunk_index": 0, "content": "Chunk 1"}  # No embedding
            ]
        )

        response = await store_chunks(request, None)

        assert response.stored_count == 0
        assert response.status == "success"


class TestUpdateStatusEndpoint:
    """Test suite for /update-status endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_update_status_success(self, mock_release, mock_get_conn):
        """Test successful status update"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.rowcount = 1
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import update_status

        request = UpdateStatusRequest(
            document_id="test-doc-123",
            status="COMPLETED",
            n8n_workflow_id="n8n-exec-456"
        )

        response = await update_status(request, None)

        assert response.document_id == "test-doc-123"
        assert response.updated is True
        assert response.status == "success"
        mock_conn.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_update_status_document_not_found(self, mock_release, mock_get_conn):
        """Test status update for non-existent document"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.rowcount = 0  # No rows updated
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import update_status

        request = UpdateStatusRequest(
            document_id="non-existent-doc",
            status="COMPLETED"
        )

        with pytest.raises(HTTPException) as exc_info:
            await update_status(request, None)
        assert exc_info.value.status_code == 404


class TestCheckDuplicateEndpoint:
    """Test suite for /check-duplicate endpoint"""

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_check_duplicate_found(self, mock_release, mock_get_conn):
        """Test duplicate detection finds existing document"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "id": "existing-doc-123",
            "filename": "test.pdf",
            "original_name": "test.pdf",
            "upload_status": "COMPLETED",
            "created_at": "2025-10-20"
        }
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import check_duplicate

        request = CheckDuplicateRequest(
            content_hash="abc123hash",
            filename="test.pdf"
        )

        response = await check_duplicate(request, None)

        assert response.is_duplicate is True
        assert response.existing_document_id == "existing-doc-123"
        assert response.strategy == "create_version"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_check_duplicate_not_found(self, mock_release, mock_get_conn):
        """Test duplicate detection with no existing document"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import check_duplicate

        request = CheckDuplicateRequest(
            content_hash="abc123hash",
            filename="unique.pdf"
        )

        response = await check_duplicate(request, None)

        assert response.is_duplicate is False
        assert response.existing_document_id is None
        assert response.strategy == "proceed"

    @pytest.mark.asyncio
    @patch('src.routes.n8n_integration.get_db_connection')
    @patch('src.routes.n8n_integration.release_db_connection')
    async def test_check_duplicate_failed_status(self, mock_release, mock_get_conn):
        """Test duplicate detection with failed document"""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "id": "failed-doc-123",
            "filename": "test.pdf",
            "upload_status": "FAILED"
        }
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        from src.routes.n8n_integration import check_duplicate

        request = CheckDuplicateRequest(
            content_hash="abc123hash",
            filename="test.pdf"
        )

        response = await check_duplicate(request, None)

        assert response.is_duplicate is True
        assert response.strategy == "replace"


class TestPydanticModels:
    """Test suite for Pydantic request/response models"""

    def test_extract_text_request_validation(self):
        """Test ExtractTextRequest model validation"""
        request = ExtractTextRequest(
            document_id="test-123",
            file_content_base64="dGVzdCBjb250ZW50",
            mime_type="application/pdf"
        )
        assert request.document_id == "test-123"
        assert request.mime_type == "application/pdf"

    def test_analyze_chunking_request_validation(self):
        """Test AnalyzeChunkingRequest model validation"""
        request = AnalyzeChunkingRequest(
            document_id="test-123",
            text_content="Sample text",
            mime_type="text/plain"
        )
        assert request.filename == "document.txt"  # Default value

    def test_generate_embeddings_request_validation(self):
        """Test GenerateEmbeddingsRequest model validation"""
        request = GenerateEmbeddingsRequest(
            document_id="test-123",
            chunks=[{"content": "chunk 1"}]
        )
        assert len(request.chunks) == 1

    def test_update_status_request_optional_fields(self):
        """Test UpdateStatusRequest with optional fields"""
        request = UpdateStatusRequest(
            document_id="test-123",
            status="COMPLETED"
        )
        assert request.n8n_workflow_id is None
        assert request.error is None

    def test_check_duplicate_response_structure(self):
        """Test CheckDuplicateResponse model structure"""
        response = CheckDuplicateResponse(
            is_duplicate=True,
            existing_document_id="doc-123",
            strategy="create_version"
        )
        assert response.is_duplicate is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
