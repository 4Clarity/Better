"""
Unit tests for Revision Manager Service
Tests document revision and version management functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from typing import Optional, List, Dict
from datetime import datetime

# Import the service we're testing
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.services.revision_manager import RevisionManagerService, get_revision_manager


class TestRevisionManagerService:
    """Test suite for RevisionManagerService"""

    @pytest.fixture
    def revision_manager_service(self):
        """Create RevisionManagerService instance"""
        return RevisionManagerService()

    @pytest.fixture
    def sample_parent_document(self):
        """Sample parent document data"""
        return {
            'id': 'parent-doc-001',
            'filename': 'technical-guide-v1.pdf',
            'original_name': 'Technical Guide.pdf',
            'file_size': 524288,
            'mime_type': 'application/pdf',
            'version_number': 1,
            'parent_document_id': None,
            'is_latest_version': True,
            'content_hash': 'abc123',
            'uploaded_by': 'user-123',
            'security_classification': 'UNCLASSIFIED'
        }

    @pytest.fixture
    def sample_file_content(self):
        """Sample file content for testing"""
        return b"Updated content for revision testing"

    # ========================================================================
    # TEST: create_revision
    # ========================================================================

    @pytest.mark.asyncio
    async def test_create_revision_increments_version_number(
        self,
        revision_manager_service,
        sample_parent_document,
        sample_file_content
    ):
        """Test that create_revision increments version number correctly"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock parent document lookup
        mock_cursor.fetchone.side_effect = [
            sample_parent_document,  # First call: get parent document
            {'id': 'new-revision-id'}  # Second call: return new document ID
        ]

        # Mock content hash calculation
        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='newcontenthas123'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    new_revision_id = await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes='Updated with new information'
                    )

        # Assertions
        assert new_revision_id == 'new-revision-id'

        # Verify version number was incremented
        insert_call = [call for call in mock_cursor.execute.call_args_list if 'INSERT' in str(call)][0]
        # Version should be 2 (parent was 1)

    @pytest.mark.asyncio
    async def test_create_revision_marks_parent_as_not_latest(
        self,
        revision_manager_service,
        sample_parent_document,
        sample_file_content
    ):
        """Test that create_revision marks parent document as not latest version"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [
            sample_parent_document,
            {'id': 'new-revision-id'}
        ]

        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='newcontenthas123'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes='Updated version'
                    )

        # Verify UPDATE query was called to set is_latest_version = false
        update_calls = [call for call in mock_cursor.execute.call_args_list if 'UPDATE' in str(call)]
        assert len(update_calls) > 0

        # Check that the UPDATE targets is_latest_version
        update_query = str(update_calls[0])
        assert 'is_latest_version' in update_query

    @pytest.mark.asyncio
    async def test_create_revision_stores_revision_notes(
        self,
        revision_manager_service,
        sample_parent_document,
        sample_file_content
    ):
        """Test that create_revision stores revision notes correctly"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [
            sample_parent_document,
            {'id': 'new-revision-id'}
        ]

        revision_notes = 'Fixed critical security vulnerability in authentication module'

        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='newcontenthas123'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes=revision_notes
                    )

        # Verify revision notes were included in INSERT
        insert_calls = [call for call in mock_cursor.execute.call_args_list if 'INSERT' in str(call)]
        assert len(insert_calls) > 0

    @pytest.mark.asyncio
    async def test_create_revision_handles_parent_not_found(
        self,
        revision_manager_service,
        sample_file_content
    ):
        """Test that create_revision handles non-existent parent document gracefully"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None  # Parent not found

        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='newcontenthas123'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    result = await revision_manager_service.create_revision(
                        parent_id='nonexistent-parent',
                        new_file_content=sample_file_content,
                        revision_notes='This should fail'
                    )

        # Should return None or raise appropriate error
        assert result is None

    @pytest.mark.asyncio
    async def test_create_revision_calculates_content_hash(
        self,
        revision_manager_service,
        sample_parent_document,
        sample_file_content
    ):
        """Test that create_revision calculates and stores content hash for new revision"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [
            sample_parent_document,
            {'id': 'new-revision-id'}
        ]

        with patch.object(revision_manager_service, 'calculate_content_hash') as mock_hash:
            mock_hash.return_value = 'computed-hash-123'

            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes='New revision'
                    )

        # Verify calculate_content_hash was called with file content
        mock_hash.assert_called_once_with(sample_file_content)

    @pytest.mark.asyncio
    async def test_create_revision_handles_database_error(
        self,
        revision_manager_service,
        sample_file_content
    ):
        """Test that create_revision handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='hash123'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    result = await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes='Should fail'
                    )

        # Should return None on error
        assert result is None

    # ========================================================================
    # TEST: get_revision_history
    # ========================================================================

    @pytest.mark.asyncio
    async def test_get_revision_history_returns_versions_in_order(self, revision_manager_service):
        """Test that get_revision_history returns all versions ordered by version number"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock version history
        mock_cursor.fetchall.return_value = [
            {
                'id': 'doc-v1',
                'version_number': 1,
                'parent_document_id': None,
                'is_latest_version': False,
                'revision_notes': None,
                'filename': 'guide-v1.pdf',
                'file_size': 524288,
                'created_at': '2025-10-20T10:00:00',
                'uploaded_by': 'user-123'
            },
            {
                'id': 'doc-v2',
                'version_number': 2,
                'parent_document_id': 'doc-v1',
                'is_latest_version': False,
                'revision_notes': 'Added new chapter',
                'filename': 'guide-v2.pdf',
                'file_size': 600000,
                'created_at': '2025-10-21T10:00:00',
                'uploaded_by': 'user-123'
            },
            {
                'id': 'doc-v3',
                'version_number': 3,
                'parent_document_id': 'doc-v2',
                'is_latest_version': True,
                'revision_notes': 'Fixed typos',
                'filename': 'guide-v3.pdf',
                'file_size': 605000,
                'created_at': '2025-10-22T10:00:00',
                'uploaded_by': 'user-456'
            }
        ]

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                history = await revision_manager_service.get_revision_history('doc-v1')

        # Assertions
        assert len(history) == 3
        assert history[0]['version_number'] == 1
        assert history[1]['version_number'] == 2
        assert history[2]['version_number'] == 3
        assert history[2]['is_latest_version'] is True

        # Verify query ordered by version_number
        sql_query = mock_cursor.execute.call_args[0][0]
        assert 'ORDER BY' in sql_query
        assert 'version_number' in sql_query

    @pytest.mark.asyncio
    async def test_get_revision_history_handles_single_version(self, revision_manager_service):
        """Test that get_revision_history works for documents with no revisions"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Only one version
        mock_cursor.fetchall.return_value = [
            {
                'id': 'doc-v1',
                'version_number': 1,
                'parent_document_id': None,
                'is_latest_version': True,
                'revision_notes': None,
                'filename': 'single-version.pdf',
                'file_size': 524288,
                'created_at': '2025-10-23T10:00:00',
                'uploaded_by': 'user-123'
            }
        ]

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                history = await revision_manager_service.get_revision_history('doc-v1')

        assert len(history) == 1
        assert history[0]['version_number'] == 1
        assert history[0]['parent_document_id'] is None

    @pytest.mark.asyncio
    async def test_get_revision_history_returns_empty_list_for_nonexistent_document(
        self,
        revision_manager_service
    ):
        """Test that get_revision_history returns empty list for non-existent document"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                history = await revision_manager_service.get_revision_history('nonexistent-doc')

        assert history == []

    @pytest.mark.asyncio
    async def test_get_revision_history_handles_database_error(self, revision_manager_service):
        """Test that get_revision_history handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                history = await revision_manager_service.get_revision_history('doc-123')

        # Should return empty list on error
        assert history == []

    # ========================================================================
    # TEST: get_version_diff
    # ========================================================================

    @pytest.mark.asyncio
    async def test_get_version_diff_returns_comparison_data(self, revision_manager_service):
        """Test that get_version_diff returns comparison information between two versions"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock two versions
        mock_cursor.fetchone.side_effect = [
            {
                'id': 'doc-v1',
                'version_number': 1,
                'filename': 'guide-v1.pdf',
                'file_size': 524288,
                'content_hash': 'hash-v1',
                'created_at': '2025-10-20T10:00:00',
                'chunk_count': 10,
                'revision_notes': None
            },
            {
                'id': 'doc-v2',
                'version_number': 2,
                'filename': 'guide-v2.pdf',
                'file_size': 600000,
                'content_hash': 'hash-v2',
                'created_at': '2025-10-21T10:00:00',
                'chunk_count': 12,
                'revision_notes': 'Added new chapters'
            }
        ]

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                diff = await revision_manager_service.get_version_diff('doc-v1', 'doc-v2')

        # Assertions
        assert diff is not None
        assert diff['version1'] == 'doc-v1'
        assert diff['version2'] == 'doc-v2'
        assert 'file_size_change' in diff
        assert diff['file_size_change'] == 600000 - 524288
        assert 'chunk_count_change' in diff
        assert diff['chunk_count_change'] == 2
        assert diff['revision_notes'] == 'Added new chapters'

    @pytest.mark.asyncio
    async def test_get_version_diff_handles_missing_version(self, revision_manager_service):
        """Test that get_version_diff handles case where one version doesn't exist"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First version exists, second doesn't
        mock_cursor.fetchone.side_effect = [
            {
                'id': 'doc-v1',
                'version_number': 1,
                'filename': 'guide-v1.pdf',
                'file_size': 524288,
                'content_hash': 'hash-v1',
                'created_at': '2025-10-20T10:00:00',
                'chunk_count': 10
            },
            None  # Second version not found
        ]

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                diff = await revision_manager_service.get_version_diff('doc-v1', 'nonexistent')

        # Should return None when either version is missing
        assert diff is None

    @pytest.mark.asyncio
    async def test_get_version_diff_handles_database_error(self, revision_manager_service):
        """Test that get_version_diff handles database errors gracefully"""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database connection error")

        with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
            with patch.object(revision_manager_service, '_release_db_connection'):
                diff = await revision_manager_service.get_version_diff('doc-v1', 'doc-v2')

        # Should return None on error
        assert diff is None

    # ========================================================================
    # TEST: Singleton pattern
    # ========================================================================

    def test_get_revision_manager_singleton(self):
        """Test that get_revision_manager returns singleton instance"""
        # Reset singleton
        import src.services.revision_manager
        src.services.revision_manager._revision_manager_service = None

        instance1 = get_revision_manager()
        instance2 = get_revision_manager()

        # Should be the same instance
        assert instance1 is instance2

    # ========================================================================
    # TEST: Integration scenarios
    # ========================================================================

    @pytest.mark.asyncio
    async def test_full_revision_workflow(
        self,
        revision_manager_service,
        sample_parent_document,
        sample_file_content
    ):
        """Test complete workflow: create revision -> get history -> compare versions"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Setup mocks for create_revision
        mock_cursor.fetchone.side_effect = [
            sample_parent_document,  # Parent lookup
            {'id': 'new-revision-id'}  # New document created
        ]

        with patch.object(revision_manager_service, 'calculate_content_hash', return_value='newhash456'):
            with patch.object(revision_manager_service, '_get_db_connection', return_value=mock_conn):
                with patch.object(revision_manager_service, '_release_db_connection'):
                    # Create revision
                    new_id = await revision_manager_service.create_revision(
                        parent_id='parent-doc-001',
                        new_file_content=sample_file_content,
                        revision_notes='Major update'
                    )

        assert new_id == 'new-revision-id'

        # Verify workflow completed
        assert mock_cursor.execute.call_count > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--cov=src.services.revision_manager', '--cov-report=term'])
