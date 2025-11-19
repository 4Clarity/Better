"""
Integration tests for RAG Document Upload and Vector Search Workflow
Tests the complete end-to-end flow: Upload → Process → Embed → Search
"""

import pytest
import asyncio
import io
import time
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Import the FastAPI app
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.main import app
from src.routes.knowledge import get_db_connection, release_db_connection


class TestRAGWorkflowIntegration:
    """Integration tests for complete RAG workflow"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_db_connection(self):
        """Mock database connection for integration tests"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    @pytest.fixture
    def sample_document_content(self):
        """Sample document content for testing"""
        return b"""Product Specification Document

Overview:
This document outlines the technical specifications for the new product line.

Features:
- Advanced machine learning capabilities
- Cloud-native architecture
- Real-time data processing
- Scalable microservices design

Technical Requirements:
The system must support at least 10,000 concurrent users with sub-second response times.
All data must be encrypted at rest and in transit using industry-standard protocols.
"""

    def test_document_upload_success(self, client, sample_document_content, mock_db_connection):
        """Test successful document upload"""
        mock_conn, mock_cursor = mock_db_connection

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                # Create a file-like object for upload
                files = {
                    'file': ('test_document.txt', io.BytesIO(sample_document_content), 'text/plain')
                }
                data = {
                    'uploaded_by': 'test-user-001',
                    'security_classification': 'UNCLASSIFIED'
                }

                response = client.post('/api/knowledge/upload', files=files, data=data)

                # Assertions
                assert response.status_code == 200
                result = response.json()
                assert 'document_id' in result
                assert result['filename'] == 'test_document.txt'
                assert result['status'] == 'UPLOADED'
                assert 'message' in result

    def test_document_upload_file_too_large(self, client):
        """Test upload rejection for file exceeding size limit"""
        # Create file content larger than 100MB
        large_content = b'x' * (101 * 1024 * 1024)  # 101MB

        files = {
            'file': ('large_file.txt', io.BytesIO(large_content), 'text/plain')
        }
        data = {
            'uploaded_by': 'test-user-001',
            'security_classification': 'UNCLASSIFIED'
        }

        response = client.post('/api/knowledge/upload', files=files, data=data)

        # Should reject with 413 status
        assert response.status_code == 413
        assert 'too large' in response.json()['detail'].lower()

    def test_document_upload_invalid_extension(self, client):
        """Test upload rejection for invalid file extension"""
        files = {
            'file': ('malicious.exe', io.BytesIO(b'executable content'), 'application/x-executable')
        }
        data = {
            'uploaded_by': 'test-user-001',
            'security_classification': 'UNCLASSIFIED'
        }

        response = client.post('/api/knowledge/upload', files=files, data=data)

        # Should reject with 415 status
        assert response.status_code == 415
        assert 'unsupported file type' in response.json()['detail'].lower()

    def test_document_upload_empty_file(self, client, mock_db_connection):
        """Test upload rejection for empty file"""
        mock_conn, mock_cursor = mock_db_connection

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                files = {
                    'file': ('empty.txt', io.BytesIO(b''), 'text/plain')
                }
                data = {
                    'uploaded_by': 'test-user-001',
                    'security_classification': 'UNCLASSIFIED'
                }

                response = client.post('/api/knowledge/upload', files=files, data=data)

                # Should reject with 400 status
                assert response.status_code == 400
                assert 'empty' in response.json()['detail'].lower()

    def test_document_upload_path_traversal_attack(self, client, sample_document_content, mock_db_connection):
        """Test upload sanitizes malicious filename with path traversal"""
        mock_conn, mock_cursor = mock_db_connection

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                # Attempt path traversal attack
                files = {
                    'file': ('../../../etc/passwd.txt', io.BytesIO(sample_document_content), 'text/plain')
                }
                data = {
                    'uploaded_by': 'test-user-001',
                    'security_classification': 'UNCLASSIFIED'
                }

                response = client.post('/api/knowledge/upload', files=files, data=data)

                # Should succeed but sanitize filename
                assert response.status_code == 200
                result = response.json()
                # Sanitized filename should not contain path separators
                assert '..' not in result['filename']
                assert '/' not in result['filename']
                assert result['filename'] == 'passwd.txt'

    def test_get_document_status_success(self, client, mock_db_connection):
        """Test retrieving document processing status"""
        mock_conn, mock_cursor = mock_db_connection

        # Mock successful status retrieval
        mock_cursor.fetchone.return_value = {
            'id': 'test-doc-id',
            'filename': 'test.txt',
            'upload_status': 'COMPLETED',
            'chunk_count': 5,
            'processing_error': None
        }

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                response = client.get('/api/knowledge/documents/test-doc-id/status')

                assert response.status_code == 200
                result = response.json()
                assert result['id'] == 'test-doc-id'
                assert result['upload_status'] == 'COMPLETED'
                assert result['chunk_count'] == 5

    def test_get_document_status_not_found(self, client, mock_db_connection):
        """Test retrieving status for non-existent document"""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                response = client.get('/api/knowledge/documents/nonexistent-id/status')

                assert response.status_code == 404
                assert 'not found' in response.json()['detail'].lower()

    def test_list_documents_success(self, client, mock_db_connection):
        """Test listing uploaded documents"""
        mock_conn, mock_cursor = mock_db_connection

        # Mock document list
        mock_cursor.fetchall.return_value = [
            {
                'id': 'doc-1',
                'filename': 'test1.txt',
                'upload_status': 'COMPLETED',
                'chunk_count': 5,
                'created_at': '2025-10-21T10:00:00'
            },
            {
                'id': 'doc-2',
                'filename': 'test2.pdf',
                'upload_status': 'ANALYZING',
                'chunk_count': 0,
                'created_at': '2025-10-21T11:00:00'
            }
        ]

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                response = client.get('/api/knowledge/documents?limit=10')

                assert response.status_code == 200
                result = response.json()
                assert 'documents' in result
                assert len(result['documents']) == 2
                assert result['documents'][0]['id'] == 'doc-1'
                assert result['documents'][1]['upload_status'] == 'ANALYZING'

    def test_list_documents_with_security_filter(self, client, mock_db_connection):
        """Test listing documents filtered by security classification"""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                response = client.get('/api/knowledge/documents?security_classification=CONFIDENTIAL')

                assert response.status_code == 200
                # Verify query included security filter
                call_args = mock_cursor.execute.call_args[0]
                sql_query = call_args[0]
                assert 'security_classification' in sql_query

    @pytest.mark.asyncio
    async def test_vector_search_success(self, client):
        """Test vector similarity search"""
        # Mock vector search service
        mock_results = [
            {
                'chunk_id': 'chunk-1',
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
            }
        ]

        with patch('src.routes.knowledge.get_vector_search') as mock_get_search:
            mock_service = MagicMock()
            mock_service.search_similar_chunks = AsyncMock(return_value=mock_results)
            mock_get_search.return_value = mock_service

            response = client.post(
                '/api/knowledge/search',
                json={
                    'query': 'React hooks tutorial',
                    'limit': 5,
                    'similarity_threshold': 0.7
                }
            )

            assert response.status_code == 200
            result = response.json()
            assert result['query'] == 'React hooks tutorial'
            assert len(result['results']) == 1
            assert result['results'][0]['similarity_score'] == 0.85
            assert result['count'] == 1

    @pytest.mark.asyncio
    async def test_vector_search_empty_results(self, client):
        """Test vector search returns empty results when no matches"""
        with patch('src.routes.knowledge.get_vector_search') as mock_get_search:
            mock_service = MagicMock()
            mock_service.search_similar_chunks = AsyncMock(return_value=[])
            mock_get_search.return_value = mock_service

            response = client.post(
                '/api/knowledge/search',
                json={
                    'query': 'nonexistent topic',
                    'limit': 5,
                    'similarity_threshold': 0.9
                }
            )

            assert response.status_code == 200
            result = response.json()
            assert result['count'] == 0
            assert result['results'] == []

    @pytest.mark.asyncio
    async def test_vector_search_with_security_classification(self, client):
        """Test vector search respects security classification filter"""
        with patch('src.routes.knowledge.get_vector_search') as mock_get_search:
            mock_service = MagicMock()
            mock_service.search_similar_chunks = AsyncMock(return_value=[])
            mock_get_search.return_value = mock_service

            response = client.post(
                '/api/knowledge/search',
                json={
                    'query': 'test query',
                    'limit': 5,
                    'similarity_threshold': 0.7,
                    'security_classification': 'CONFIDENTIAL'
                }
            )

            assert response.status_code == 200
            # Verify security_classification was passed to service
            mock_service.search_similar_chunks.assert_called_once()
            call_kwargs = mock_service.search_similar_chunks.call_args.kwargs
            assert call_kwargs['security_classification'] == 'CONFIDENTIAL'

    def test_health_check_endpoint(self, client):
        """Test knowledge management health check"""
        with patch('src.routes.knowledge.get_embedding_service') as mock_get_embedding:
            mock_service = MagicMock()
            mock_service.get_embedding_metadata = AsyncMock(return_value={
                'healthy': True,
                'model': 'nomic-embed-text',
                'dimension': 768
            })
            mock_get_embedding.return_value = mock_service

            response = client.get('/api/knowledge/health')

            assert response.status_code == 200
            result = response.json()
            assert result['status'] == 'healthy'
            assert 'embedding_service' in result

    def test_upload_to_search_workflow_simulation(self, client, sample_document_content, mock_db_connection):
        """
        Integration test simulating complete workflow:
        1. Upload document
        2. Check processing status
        3. Search for content
        """
        mock_conn, mock_cursor = mock_db_connection

        # Step 1: Upload document
        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                files = {
                    'file': ('workflow_test.txt', io.BytesIO(sample_document_content), 'text/plain')
                }
                data = {
                    'uploaded_by': 'test-user-001',
                    'security_classification': 'UNCLASSIFIED'
                }

                upload_response = client.post('/api/knowledge/upload', files=files, data=data)
                assert upload_response.status_code == 200
                document_id = upload_response.json()['document_id']

        # Step 2: Check status (simulating COMPLETED state)
        mock_cursor.fetchone.return_value = {
            'id': document_id,
            'filename': 'workflow_test.txt',
            'upload_status': 'COMPLETED',
            'chunk_count': 3,
            'processing_error': None
        }

        with patch('src.routes.knowledge.get_db_connection', return_value=mock_conn):
            with patch('src.routes.knowledge.release_db_connection'):
                status_response = client.get(f'/api/knowledge/documents/{document_id}/status')
                assert status_response.status_code == 200
                assert status_response.json()['upload_status'] == 'COMPLETED'

        # Step 3: Search for content from uploaded document
        mock_search_results = [
            {
                'chunk_id': 'chunk-1',
                'content': 'Product Specification Document\n\nOverview:\nThis document outlines...',
                'chunk_index': 0,
                'token_count': 100,
                'semantic_boundary_type': 'section',
                'vector_model': 'nomic-embed-text',
                'thought_completeness_score': 0.92,
                'document_id': document_id,
                'filename': 'workflow_test.txt',
                'original_name': 'workflow_test.txt',
                'mime_type': 'text/plain',
                'security_classification': 'UNCLASSIFIED',
                'created_at': '2025-10-21T10:00:00',
                'similarity_score': 0.88
            }
        ]

        with patch('src.routes.knowledge.get_vector_search') as mock_get_search:
            mock_service = MagicMock()
            mock_service.search_similar_chunks = AsyncMock(return_value=mock_search_results)
            mock_get_search.return_value = mock_service

            search_response = client.post(
                '/api/knowledge/search',
                json={
                    'query': 'product specifications',
                    'limit': 5,
                    'similarity_threshold': 0.7
                }
            )

            assert search_response.status_code == 200
            search_result = search_response.json()
            assert search_result['count'] == 1
            assert search_result['results'][0]['document_id'] == document_id
            assert 'Product Specification' in search_result['results'][0]['content']


class TestRAGErrorHandling:
    """Test error handling in RAG workflow"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    def test_upload_missing_file(self, client):
        """Test upload with missing file parameter"""
        data = {
            'uploaded_by': 'test-user-001',
            'security_classification': 'UNCLASSIFIED'
        }

        response = client.post('/api/knowledge/upload', data=data)

        # Should return 422 for missing required field
        assert response.status_code == 422

    def test_upload_invalid_mime_type(self, client):
        """Test upload rejects invalid MIME type"""
        # Use valid extension (.txt) but invalid MIME type to trigger MIME validation
        files = {
            'file': ('malicious.txt', io.BytesIO(b'executable content'), 'application/x-executable')
        }
        data = {
            'uploaded_by': 'test-user-001',
            'security_classification': 'UNCLASSIFIED'
        }

        response = client.post('/api/knowledge/upload', files=files, data=data)

        assert response.status_code == 415
        assert 'mime type' in response.json()['detail'].lower()

    def test_search_invalid_parameters(self, client):
        """Test search with invalid parameter values"""
        # Test with limit exceeding maximum
        response = client.post(
            '/api/knowledge/search',
            json={
                'query': 'test',
                'limit': 100,  # Exceeds max of 50
                'similarity_threshold': 0.7
            }
        )

        assert response.status_code == 422  # Validation error

    def test_search_invalid_similarity_threshold(self, client):
        """Test search with invalid similarity threshold"""
        # Test with threshold > 1.0
        response = client.post(
            '/api/knowledge/search',
            json={
                'query': 'test',
                'limit': 5,
                'similarity_threshold': 1.5  # Invalid, must be 0-1
            }
        )

        assert response.status_code == 422  # Validation error


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
