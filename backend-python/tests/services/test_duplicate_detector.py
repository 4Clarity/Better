"""
Unit tests for Duplicate Detector Service
Tests duplicate detection and content hashing functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from typing import Optional, List, Dict
import hashlib

# Import the service we're testing
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.services.duplicate_detector import DuplicateDetectorService, get_duplicate_detector


class TestDuplicateDetectorService:
    """Test suite for DuplicateDetectorService"""

    @pytest.fixture
    def duplicate_detector_service(self):
        """Create DuplicateDetectorService instance"""
        return DuplicateDetectorService()

    @pytest.fixture
    def sample_file_content(self):
        """Sample file content for testing"""
        return b"This is a sample PDF document content for testing duplicate detection."

    @pytest.fixture
    def sample_file_content_2(self):
        """Different sample file content"""
        return b"This is a completely different document with unique content."

    # ========================================================================
    # TEST: calculate_content_hash
    # ========================================================================

    def test_calculate_content_hash_returns_sha256_hex(self, duplicate_detector_service, sample_file_content):
        """Test that calculate_content_hash returns a 64-character SHA256 hex digest"""
        content_hash = duplicate_detector_service.calculate_content_hash(sample_file_content)

        # SHA256 produces 64 hex characters
        assert len(content_hash) == 64
        assert content_hash.isalnum()
        assert content_hash.islower() or content_hash.isupper()

    def test_calculate_content_hash_deterministic(self, duplicate_detector_service, sample_file_content):
        """Test that the same content always produces the same hash"""
        hash1 = duplicate_detector_service.calculate_content_hash(sample_file_content)
        hash2 = duplicate_detector_service.calculate_content_hash(sample_file_content)

        assert hash1 == hash2

    def test_calculate_content_hash_different_content_different_hash(
        self,
        duplicate_detector_service,
        sample_file_content,
        sample_file_content_2
    ):
        """Test that different content produces different hashes"""
        hash1 = duplicate_detector_service.calculate_content_hash(sample_file_content)
        hash2 = duplicate_detector_service.calculate_content_hash(sample_file_content_2)

        assert hash1 != hash2

    def test_calculate_content_hash_empty_content(self, duplicate_detector_service):
        """Test that empty content produces a valid hash"""
        empty_content = b""
        content_hash = duplicate_detector_service.calculate_content_hash(empty_content)

        # Should still return a valid 64-character hash
        assert len(content_hash) == 64
        # Hash of empty string is a known constant
        expected_empty_hash = hashlib.sha256(b"").hexdigest()
        assert content_hash == expected_empty_hash

    def test_calculate_content_hash_large_content(self, duplicate_detector_service):
        """Test that large content is hashed correctly"""
        # Create 10MB of test data
        large_content = b"x" * (10 * 1024 * 1024)
        content_hash = duplicate_detector_service.calculate_content_hash(large_content)

        assert len(content_hash) == 64
        assert content_hash.isalnum()

    # ========================================================================
    # TEST: check_duplicate
    # ========================================================================

    @pytest.mark.asyncio
    async def test_check_duplicate_returns_document_when_exists(self, duplicate_detector_service):
        """Test that check_duplicate returns document info when duplicate exists"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock database result
        mock_cursor.fetchone.return_value = {
            'id': 'doc-001',
            'filename': 'existing-document.pdf',
            'original_name': 'Original Document.pdf',
            'file_size': 524288,
            'mime_type': 'application/pdf',
            'storage_path': 'knowledge/unclassified/2025-10-23/user-123/existing-document.pdf',
            'upload_status': 'COMPLETED',
            'chunk_count': 15,
            'uploaded_by': 'user-123',
            'security_classification': 'UNCLASSIFIED',
            'created_at': '2025-10-23T10:00:00',
            'content_hash': 'abc123def456'
        }

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                result = await duplicate_detector_service.check_duplicate('abc123def456')

        # Assertions
        assert result is not None
        assert result['id'] == 'doc-001'
        assert result['filename'] == 'existing-document.pdf'
        assert result['content_hash'] == 'abc123def456'

        # Verify SQL query was executed
        mock_cursor.execute.assert_called_once()
        sql_query = mock_cursor.execute.call_args[0][0]
        assert 'content_hash' in sql_query
        assert 'knowledge_documents' in sql_query

    @pytest.mark.asyncio
    async def test_check_duplicate_returns_none_when_not_exists(self, duplicate_detector_service):
        """Test that check_duplicate returns None when no duplicate exists"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                result = await duplicate_detector_service.check_duplicate('nonexistent-hash')

        assert result is None

    @pytest.mark.asyncio
    async def test_check_duplicate_handles_database_error(self, duplicate_detector_service):
        """Test that check_duplicate handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                result = await duplicate_detector_service.check_duplicate('test-hash')

        # Should return None on error
        assert result is None

    # ========================================================================
    # TEST: find_similar_filename
    # ========================================================================

    @pytest.mark.asyncio
    async def test_find_similar_filename_exact_match(self, duplicate_detector_service):
        """Test that find_similar_filename finds exact filename matches"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {
                'id': 'doc-001',
                'filename': 'technical-guide.pdf',
                'original_name': 'Technical Guide.pdf',
                'file_size': 524288,
                'mime_type': 'application/pdf',
                'created_at': '2025-10-23T10:00:00',
                'uploaded_by': 'user-123'
            }
        ]

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                results = await duplicate_detector_service.find_similar_filename('technical-guide.pdf')

        assert len(results) == 1
        assert results[0]['filename'] == 'technical-guide.pdf'

    @pytest.mark.asyncio
    async def test_find_similar_filename_fuzzy_match(self, duplicate_detector_service):
        """Test that find_similar_filename finds fuzzy matches (case-insensitive, partial)"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock results for "technical" query (should match "Technical-Guide.pdf", "technical_doc.pdf", etc.)
        mock_cursor.fetchall.return_value = [
            {
                'id': 'doc-001',
                'filename': 'Technical-Guide.pdf',
                'original_name': 'Technical Guide.pdf',
                'file_size': 524288,
                'mime_type': 'application/pdf',
                'created_at': '2025-10-23T10:00:00',
                'uploaded_by': 'user-123'
            },
            {
                'id': 'doc-002',
                'filename': 'technical_documentation.pdf',
                'original_name': 'Technical Documentation.pdf',
                'file_size': 1048576,
                'mime_type': 'application/pdf',
                'created_at': '2025-10-22T09:00:00',
                'uploaded_by': 'user-456'
            }
        ]

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                results = await duplicate_detector_service.find_similar_filename('technical')

        assert len(results) == 2
        # Verify SQL used ILIKE for case-insensitive matching
        sql_query = mock_cursor.execute.call_args[0][0]
        assert 'ILIKE' in sql_query or 'ilike' in sql_query.lower()

    @pytest.mark.asyncio
    async def test_find_similar_filename_returns_empty_list_when_no_matches(self, duplicate_detector_service):
        """Test that find_similar_filename returns empty list when no matches found"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                results = await duplicate_detector_service.find_similar_filename('nonexistent-file.pdf')

        assert results == []

    @pytest.mark.asyncio
    async def test_find_similar_filename_handles_database_error(self, duplicate_detector_service):
        """Test that find_similar_filename handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                results = await duplicate_detector_service.find_similar_filename('test.pdf')

        # Should return empty list on error
        assert results == []

    @pytest.mark.asyncio
    async def test_find_similar_filename_limits_results(self, duplicate_detector_service):
        """Test that find_similar_filename respects result limit"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock 5 results
        mock_cursor.fetchall.return_value = [
            {'id': f'doc-{i}', 'filename': f'file-{i}.pdf', 'original_name': f'File {i}.pdf',
             'file_size': 1024, 'mime_type': 'application/pdf', 'created_at': '2025-10-23T10:00:00',
             'uploaded_by': 'user-123'}
            for i in range(5)
        ]

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                results = await duplicate_detector_service.find_similar_filename('file', limit=3)

        # Should query with limit
        sql_query = mock_cursor.execute.call_args[0][0]
        assert 'LIMIT' in sql_query

    # ========================================================================
    # TEST: Singleton pattern
    # ========================================================================

    def test_get_duplicate_detector_singleton(self):
        """Test that get_duplicate_detector returns singleton instance"""
        # Reset singleton
        import src.services.duplicate_detector
        src.services.duplicate_detector._duplicate_detector_service = None

        instance1 = get_duplicate_detector()
        instance2 = get_duplicate_detector()

        # Should be the same instance
        assert instance1 is instance2

    # ========================================================================
    # TEST: Integration scenarios
    # ========================================================================

    @pytest.mark.asyncio
    async def test_full_duplicate_check_workflow(self, duplicate_detector_service, sample_file_content):
        """Test complete workflow: hash calculation -> duplicate check"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Calculate hash
        content_hash = duplicate_detector_service.calculate_content_hash(sample_file_content)

        # Mock duplicate found
        mock_cursor.fetchone.return_value = {
            'id': 'doc-001',
            'filename': 'duplicate.pdf',
            'content_hash': content_hash,
            'original_name': 'Duplicate.pdf',
            'file_size': len(sample_file_content),
            'mime_type': 'application/pdf',
            'storage_path': 'knowledge/unclassified/2025-10-23/user-123/duplicate.pdf',
            'upload_status': 'COMPLETED',
            'chunk_count': 10,
            'uploaded_by': 'user-123',
            'security_classification': 'UNCLASSIFIED',
            'created_at': '2025-10-23T10:00:00'
        }

        with patch.object(duplicate_detector_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(duplicate_detector_service, '_release_db_connection'):
                duplicate = await duplicate_detector_service.check_duplicate(content_hash)

        # Verify duplicate was found
        assert duplicate is not None
        assert duplicate['content_hash'] == content_hash
        assert duplicate['id'] == 'doc-001'


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--cov=src.services.duplicate_detector', '--cov-report=term'])
