"""
Revision Manager Service for RAG Knowledge Base
Handles document revision tracking, version history, and version comparisons
"""

import hashlib
from typing import Optional, List, Dict
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)


class RevisionManagerService:
    """Service for managing document revisions and version history"""

    _connection_pool: Optional[pool.ThreadedConnectionPool] = None

    def __init__(self):
        """Initialize revision manager service"""
        self.db_config = {
            "host": os.getenv("DB_HOST", "db"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "database": os.getenv("DB_NAME", "tip"),
            "user": os.getenv("DB_USER", "user"),
            "password": os.getenv("DB_PASSWORD", "password")
        }

    @classmethod
    def _get_connection_pool(cls) -> pool.ThreadedConnectionPool:
        """
        Get or create connection pool singleton

        Returns:
            ThreadedConnectionPool instance
        """
        if cls._connection_pool is None:
            min_conn = int(os.getenv("DB_POOL_MIN_CONN", "2"))
            max_conn = int(os.getenv("DB_POOL_MAX_CONN", "10"))

            logger.info(f"Creating database connection pool (min={min_conn}, max={max_conn})")

            cls._connection_pool = pool.ThreadedConnectionPool(
                minconn=min_conn,
                maxconn=max_conn,
                host=os.getenv("DB_HOST", "db"),
                port=int(os.getenv("DB_PORT", "5432")),
                database=os.getenv("DB_NAME", "tip"),
                user=os.getenv("DB_USER", "user"),
                password=os.getenv("DB_PASSWORD", "password")
            )

        return cls._connection_pool

    def _get_db_connection(self):
        """
        Get database connection from pool

        Returns:
            Database connection
        """
        return self._get_connection_pool().getconn()

    def _release_db_connection(self, conn):
        """
        Return database connection to pool

        Args:
            conn: Database connection to release
        """
        if conn:
            self._get_connection_pool().putconn(conn)

    def calculate_content_hash(self, file_content: bytes) -> str:
        """
        Calculate SHA256 hash of file content

        Args:
            file_content: Raw file bytes

        Returns:
            64-character hex digest of SHA256 hash
        """
        try:
            sha256_hash = hashlib.sha256(file_content)
            content_hash = sha256_hash.hexdigest()
            logger.debug(f"Calculated content hash: {content_hash[:16]}...")
            return content_hash
        except Exception as e:
            logger.error(f"Error calculating content hash: {str(e)}")
            raise

    async def create_revision(
        self,
        parent_id: str,
        new_file_content: bytes,
        revision_notes: str
    ) -> Optional[str]:
        """
        Create a new revision of an existing document

        Args:
            parent_id: ID of parent document to create revision from
            new_file_content: Raw bytes of new file content
            revision_notes: Notes explaining changes in this revision

        Returns:
            ID of newly created revision document, or None on failure
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Step 1: Get parent document details
            cursor.execute("""
                SELECT
                    id,
                    filename,
                    original_name,
                    mime_type,
                    version_number,
                    uploaded_by,
                    security_classification
                FROM knowledge_documents
                WHERE id = %s;
            """, (parent_id,))

            parent = cursor.fetchone()

            if not parent:
                logger.error(f"Parent document not found: {parent_id}")
                return None

            # Step 2: Calculate content hash for new revision
            content_hash = self.calculate_content_hash(new_file_content)

            # Step 3: Update parent document to mark as not latest version
            cursor.execute("""
                UPDATE knowledge_documents
                SET is_latest_version = false
                WHERE id = %s;
            """, (parent_id,))

            # Step 4: Insert new revision document
            new_version_number = parent['version_number'] + 1
            file_size = len(new_file_content)

            # Generate new filename with version suffix
            base_filename = parent['filename'].rsplit('.', 1)[0] if '.' in parent['filename'] else parent['filename']
            file_ext = parent['filename'].rsplit('.', 1)[1] if '.' in parent['filename'] else ''
            new_filename = f"{base_filename}-v{new_version_number}.{file_ext}" if file_ext else f"{base_filename}-v{new_version_number}"

            # Note: In a real implementation, you would also:
            # 1. Upload the file to MinIO storage
            # 2. Set the storage_path to the actual MinIO path
            # For now, we'll use a placeholder path
            storage_path = f"knowledge/revisions/{parent['uploaded_by']}/{new_filename}"

            insert_query = """
                INSERT INTO knowledge_documents (
                    filename,
                    original_name,
                    file_size,
                    mime_type,
                    storage_path,
                    upload_status,
                    content_hash,
                    version_number,
                    parent_document_id,
                    is_latest_version,
                    revision_notes,
                    uploaded_by,
                    security_classification,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING id;
            """

            cursor.execute(insert_query, (
                new_filename,
                parent['original_name'],  # Keep original name from parent
                file_size,
                parent['mime_type'],
                storage_path,
                'UPLOADED',  # Initial status
                content_hash,
                new_version_number,
                parent_id,
                True,  # This is now the latest version
                revision_notes,
                parent['uploaded_by'],
                parent['security_classification']
            ))

            # Get the new document ID
            result = cursor.fetchone()
            new_revision_id = result['id'] if result else None

            # Commit transaction
            conn.commit()

            logger.info(
                f"Created revision v{new_version_number} for document {parent_id} "
                f"(new ID: {new_revision_id})"
            )

            return new_revision_id

        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error creating revision: {str(e)}")
            return None

        finally:
            self._release_db_connection(conn)

    async def get_revision_history(self, document_id: str) -> List[Dict]:
        """
        Get complete version history for a document family (all versions)

        Args:
            document_id: ID of any document in the version family

        Returns:
            List of version records ordered by version_number (oldest to newest)
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Find the root document (version 1) for this document family
            # This handles cases where document_id might be a revision
            cursor.execute("""
                WITH RECURSIVE version_tree AS (
                    -- Base case: start with the given document
                    SELECT id, parent_document_id, version_number
                    FROM knowledge_documents
                    WHERE id = %s

                    UNION

                    -- Recursive case: traverse up to parent documents
                    SELECT kd.id, kd.parent_document_id, kd.version_number
                    FROM knowledge_documents kd
                    INNER JOIN version_tree vt ON kd.id = vt.parent_document_id
                )
                SELECT id FROM version_tree
                WHERE parent_document_id IS NULL
                LIMIT 1;
            """, (document_id,))

            root_doc = cursor.fetchone()

            if not root_doc:
                logger.warning(f"No root document found for {document_id}")
                return []

            root_id = root_doc['id']

            # Now get all versions in the family
            query = """
                WITH RECURSIVE version_family AS (
                    -- Base case: start with root document
                    SELECT
                        id,
                        filename,
                        original_name,
                        file_size,
                        mime_type,
                        version_number,
                        parent_document_id,
                        is_latest_version,
                        revision_notes,
                        content_hash,
                        uploaded_by,
                        security_classification,
                        created_at,
                        updated_at
                    FROM knowledge_documents
                    WHERE id = %s

                    UNION

                    -- Recursive case: get all child revisions
                    SELECT
                        kd.id,
                        kd.filename,
                        kd.original_name,
                        kd.file_size,
                        kd.mime_type,
                        kd.version_number,
                        kd.parent_document_id,
                        kd.is_latest_version,
                        kd.revision_notes,
                        kd.content_hash,
                        kd.uploaded_by,
                        kd.security_classification,
                        kd.created_at,
                        kd.updated_at
                    FROM knowledge_documents kd
                    INNER JOIN version_family vf ON kd.parent_document_id = vf.id
                )
                SELECT * FROM version_family
                ORDER BY version_number ASC;
            """

            cursor.execute(query, (root_id,))
            results = cursor.fetchall()

            logger.info(f"Found {len(results)} versions in document family")

            # Convert to list of dicts
            history = []
            for row in results:
                history.append(dict(row))

            return history

        except Exception as e:
            logger.error(f"Error getting revision history: {str(e)}")
            return []

        finally:
            self._release_db_connection(conn)

    async def get_version_diff(
        self,
        version1_id: str,
        version2_id: str
    ) -> Optional[Dict]:
        """
        Get comparison data between two document versions

        Args:
            version1_id: ID of first version (typically older)
            version2_id: ID of second version (typically newer)

        Returns:
            Dict with version comparison metadata, or None if either version not found
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Get both version details
            cursor.execute("""
                SELECT
                    id,
                    filename,
                    version_number,
                    file_size,
                    content_hash,
                    chunk_count,
                    revision_notes,
                    created_at
                FROM knowledge_documents
                WHERE id = %s;
            """, (version1_id,))

            version1 = cursor.fetchone()

            if not version1:
                logger.error(f"Version 1 not found: {version1_id}")
                return None

            cursor.execute("""
                SELECT
                    id,
                    filename,
                    version_number,
                    file_size,
                    content_hash,
                    chunk_count,
                    revision_notes,
                    created_at
                FROM knowledge_documents
                WHERE id = %s;
            """, (version2_id,))

            version2 = cursor.fetchone()

            if not version2:
                logger.error(f"Version 2 not found: {version2_id}")
                return None

            # Calculate differences
            file_size_change = version2['file_size'] - version1['file_size']
            chunk_count_change = (version2['chunk_count'] or 0) - (version1['chunk_count'] or 0)
            content_changed = version1['content_hash'] != version2['content_hash']

            # Calculate time difference
            if version1['created_at'] and version2['created_at']:
                if isinstance(version1['created_at'], str):
                    created_at_1 = datetime.fromisoformat(version1['created_at'].replace('Z', '+00:00'))
                    created_at_2 = datetime.fromisoformat(version2['created_at'].replace('Z', '+00:00'))
                else:
                    created_at_1 = version1['created_at']
                    created_at_2 = version2['created_at']

                time_difference = created_at_2 - created_at_1
                days_between = time_difference.days
            else:
                days_between = None

            diff = {
                "version1": version1_id,
                "version2": version2_id,
                "version1_number": version1['version_number'],
                "version2_number": version2['version_number'],
                "version1_filename": version1['filename'],
                "version2_filename": version2['filename'],
                "file_size_change": file_size_change,
                "chunk_count_change": chunk_count_change,
                "content_changed": content_changed,
                "revision_notes": version2['revision_notes'],
                "days_between_versions": days_between
            }

            logger.info(
                f"Version diff: v{version1['version_number']} -> v{version2['version_number']}, "
                f"size change: {file_size_change} bytes, chunk change: {chunk_count_change}"
            )

            return diff

        except Exception as e:
            logger.error(f"Error calculating version diff: {str(e)}")
            return None

        finally:
            self._release_db_connection(conn)


# Singleton instance
_revision_manager_service: Optional[RevisionManagerService] = None


def get_revision_manager() -> RevisionManagerService:
    """
    Get or create singleton revision manager service instance

    Returns:
        RevisionManagerService: Configured revision manager service
    """
    global _revision_manager_service
    if _revision_manager_service is None:
        _revision_manager_service = RevisionManagerService()
    return _revision_manager_service
