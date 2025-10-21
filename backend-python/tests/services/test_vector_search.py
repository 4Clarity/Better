"""
Unit tests for Vector Search Service
Tests semantic similarity search functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from typing import List, Dict

# Import the service we're testing
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.services.vector_search import VectorSearchService, get_vector_search


class TestVectorSearchService:
    """Test suite for VectorSearchService"""

    @pytest.fixture
    def mock_embedding_service(self):
        """Mock embedding service"""
        mock_service = Mock()
        mock_service.generate_embedding = AsyncMock(return_value=[0.1] * 768)
        return mock_service

    @pytest.fixture
    def vector_search_service(self, mock_embedding_service):
        """Create VectorSearchService instance with mocked dependencies"""
        with patch('src.services.vector_search.get_embedding_service', return_value=mock_embedding_service):
            service = VectorSearchService()
            return service

    @pytest.mark.asyncio
    async def test_search_similar_chunks_success(self, vector_search_service, mock_embedding_service):
        """Test successful vector similarity search"""
        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock database query results
        mock_cursor.fetchall.return_value = [
            {
                'id': 'chunk-1',
                'content': 'Test content about React hooks',
                'chunk_index': 0,
                'token_count': 50,
                'semantic_boundary_type': 'paragraph',
                'vector_model': 'nomic-embed-text',
                'thought_completeness_score': 0.95,
                'document_id': 'doc-1',
                'filename': 'react-guide.pdf',
                'original_name': 'react-guide.pdf',
                'mime_type': 'application/pdf',
                'security_classification': 'UNCLASSIFIED',
                'created_at': '2025-10-21T10:00:00',
                'similarity_score': 0.85
            },
            {
                'id': 'chunk-2',
                'content': 'Another test chunk',
                'chunk_index': 1,
                'token_count': 45,
                'semantic_boundary_type': 'section',
                'vector_model': 'nomic-embed-text',
                'thought_completeness_score': 0.90,
                'document_id': 'doc-1',
                'filename': 'react-guide.pdf',
                'original_name': 'react-guide.pdf',
                'mime_type': 'application/pdf',
                'security_classification': 'UNCLASSIFIED',
                'created_at': '2025-10-21T10:00:00',
                'similarity_score': 0.75
            }
        ]

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                results = await vector_search_service.search_similar_chunks(
                    query_text="React hooks tutorial",
                    limit=5,
                    similarity_threshold=0.7
                )

        # Assertions
        assert len(results) == 2
        assert results[0]['chunk_id'] == 'chunk-1'
        assert results[0]['similarity_score'] == 0.85
        assert results[1]['similarity_score'] == 0.75
        mock_embedding_service.generate_embedding.assert_called_once_with("React hooks tutorial")

    @pytest.mark.asyncio
    async def test_search_with_similarity_threshold_filtering(self, vector_search_service, mock_embedding_service):
        """Test that results below similarity threshold are filtered out"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock results with varying similarity scores
        mock_cursor.fetchall.return_value = [
            {
                'id': 'chunk-1',
                'content': 'High similarity content',
                'chunk_index': 0,
                'token_count': 50,
                'semantic_boundary_type': 'paragraph',
                'vector_model': 'nomic-embed-text',
                'thought_completeness_score': 0.95,
                'document_id': 'doc-1',
                'filename': 'test.pdf',
                'original_name': 'test.pdf',
                'mime_type': 'application/pdf',
                'security_classification': 'UNCLASSIFIED',
                'created_at': '2025-10-21T10:00:00',
                'similarity_score': 0.85  # Above threshold
            },
            {
                'id': 'chunk-2',
                'content': 'Low similarity content',
                'chunk_index': 1,
                'token_count': 45,
                'semantic_boundary_type': 'section',
                'vector_model': 'nomic-embed-text',
                'thought_completeness_score': 0.90,
                'document_id': 'doc-1',
                'filename': 'test.pdf',
                'original_name': 'test.pdf',
                'mime_type': 'application/pdf',
                'security_classification': 'UNCLASSIFIED',
                'created_at': '2025-10-21T10:00:00',
                'similarity_score': 0.65  # Below threshold
            }
        ]

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                results = await vector_search_service.search_similar_chunks(
                    query_text="test query",
                    limit=5,
                    similarity_threshold=0.7
                )

        # Only the result above threshold should be returned
        assert len(results) == 1
        assert results[0]['chunk_id'] == 'chunk-1'
        assert results[0]['similarity_score'] == 0.85

    @pytest.mark.asyncio
    async def test_search_with_security_classification_filter(self, vector_search_service, mock_embedding_service):
        """Test search with security classification filtering"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                await vector_search_service.search_similar_chunks(
                    query_text="test query",
                    limit=5,
                    similarity_threshold=0.7,
                    security_classification="CONFIDENTIAL"
                )

        # Verify the SQL query included security filter
        execute_call = mock_cursor.execute.call_args
        sql_query = execute_call[0][0]
        assert "security_classification" in sql_query

    @pytest.mark.asyncio
    async def test_search_empty_results(self, vector_search_service, mock_embedding_service):
        """Test search returns empty list when no results match"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                results = await vector_search_service.search_similar_chunks(
                    query_text="nonexistent query",
                    limit=5,
                    similarity_threshold=0.7
                )

        assert results == []

    @pytest.mark.asyncio
    async def test_search_embedding_generation_failure(self, vector_search_service):
        """Test search handles embedding generation failure gracefully"""
        # Mock embedding service to return None (failure)
        vector_search_service.embedding_service.generate_embedding = AsyncMock(return_value=None)

        results = await vector_search_service.search_similar_chunks(
            query_text="test query",
            limit=5,
            similarity_threshold=0.7
        )

        # Should return empty list on embedding failure
        assert results == []

    @pytest.mark.asyncio
    async def test_search_database_error_handling(self, vector_search_service, mock_embedding_service):
        """Test search handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                results = await vector_search_service.search_similar_chunks(
                    query_text="test query",
                    limit=5,
                    similarity_threshold=0.7
                )

        # Should return empty list on database error
        assert results == []

    @pytest.mark.asyncio
    async def test_get_chunk_by_id_success(self, vector_search_service):
        """Test retrieving specific chunk by ID"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {
            'id': 'chunk-1',
            'content': 'Test content',
            'chunk_index': 0,
            'token_count': 50,
            'semantic_boundary_type': 'paragraph',
            'vector_model': 'nomic-embed-text',
            'thought_completeness_score': 0.95,
            'document_id': 'doc-1',
            'filename': 'test.pdf',
            'original_name': 'test.pdf',
            'mime_type': 'application/pdf'
        }

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                result = await vector_search_service.get_chunk_by_id('chunk-1')

        assert result is not None
        assert result['id'] == 'chunk-1'
        assert result['content'] == 'Test content'

    @pytest.mark.asyncio
    async def test_get_chunk_by_id_not_found(self, vector_search_service):
        """Test retrieving non-existent chunk returns None"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        with patch.object(vector_search_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(vector_search_service, '_release_db_connection'):
                result = await vector_search_service.get_chunk_by_id('nonexistent')

        assert result is None

    @pytest.mark.asyncio
    async def test_connection_pool_creation(self, vector_search_service):
        """Test that connection pool is created with correct parameters"""
        with patch.dict(os.environ, {'DB_POOL_MIN_CONN': '3', 'DB_POOL_MAX_CONN': '15'}):
            with patch('src.services.vector_search.pool.ThreadedConnectionPool') as mock_pool:
                vector_search_service._connection_pool = None  # Reset pool
                pool = vector_search_service._get_connection_pool()

                # Verify pool was created with environment variable values
                mock_pool.assert_called_once()
                call_kwargs = mock_pool.call_args.kwargs
                assert call_kwargs['minconn'] == 3
                assert call_kwargs['maxconn'] == 15

    def test_get_vector_search_singleton(self):
        """Test that get_vector_search returns singleton instance"""
        # Reset singleton
        import src.services.vector_search
        src.services.vector_search._vector_search_service = None

        with patch('src.services.vector_search.get_embedding_service'):
            instance1 = get_vector_search()
            instance2 = get_vector_search()

            # Should be the same instance
            assert instance1 is instance2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
