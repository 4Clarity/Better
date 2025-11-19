"""
Duplicate Detection Service for RAG Knowledge Base
Handles duplicate detection via content hashing and fuzzy filename matching
"""

import hashlib
from typing import Optional, List, Dict
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging
import os

logger = logging.getLogger(__name__)


class DuplicateDetectorService:
    """Service for detecting duplicate documents via content hash and filename matching"""

    _connection_pool: Optional[pool.ThreadedConnectionPool] = None

    def __init__(self):
        """Initialize duplicate detector service"""
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
        Calculate SHA256 hash of file content for duplicate detection

        Args:
            file_content: Raw file bytes

        Returns:
            64-character hex digest of SHA256 hash
        """
        try:
            # Calculate SHA256 hash
            sha256_hash = hashlib.sha256(file_content)
            content_hash = sha256_hash.hexdigest()

            logger.debug(f"Calculated content hash: {content_hash[:16]}...")
            return content_hash

        except Exception as e:
            logger.error(f"Error calculating content hash: {str(e)}")
            raise

    async def check_duplicate(self, content_hash: str) -> Optional[Dict]:
        """
        Check if a document with the same content hash already exists

        Args:
            content_hash: SHA256 hash of file content (64 hex characters)

        Returns:
            Document data dict if duplicate found, None otherwise
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Query for existing document with same content hash
            query = """
                SELECT
                    id,
                    filename,
                    original_name,
                    file_size,
                    mime_type,
                    storage_path,
                    upload_status,
                    processing_error,
                    chunk_count,
                    content_hash,
                    version_number,
                    parent_document_id,
                    is_latest_version,
                    uploaded_by,
                    security_classification,
                    created_at,
                    updated_at
                FROM knowledge_documents
                WHERE content_hash = %s
                LIMIT 1;
            """

            cursor.execute(query, (content_hash,))
            result = cursor.fetchone()

            if result:
                logger.info(f"Duplicate found: {result['filename']} (ID: {result['id']})")
                return dict(result)
            else:
                logger.debug(f"No duplicate found for hash: {content_hash[:16]}...")
                return None

        except Exception as e:
            logger.error(f"Error checking for duplicate: {str(e)}")
            return None

        finally:
            self._release_db_connection(conn)

    async def find_similar_filename(self, filename: str, limit: int = 10) -> List[Dict]:
        """
        Find documents with similar filenames using fuzzy matching

        Args:
            filename: Filename to search for (partial match, case-insensitive)
            limit: Maximum number of results to return

        Returns:
            List of document data dicts with similar filenames
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Use ILIKE for case-insensitive partial matching
            # Add % wildcards for fuzzy matching
            search_pattern = f"%{filename}%"

            query = """
                SELECT
                    id,
                    filename,
                    original_name,
                    file_size,
                    mime_type,
                    storage_path,
                    upload_status,
                    chunk_count,
                    content_hash,
                    version_number,
                    is_latest_version,
                    uploaded_by,
                    security_classification,
                    created_at
                FROM knowledge_documents
                WHERE
                    filename ILIKE %s
                    OR original_name ILIKE %s
                ORDER BY created_at DESC
                LIMIT %s;
            """

            cursor.execute(query, (search_pattern, search_pattern, limit))
            results = cursor.fetchall()

            logger.info(f"Found {len(results)} documents with similar filename to '{filename}'")

            # Convert to list of dicts
            similar_documents = []
            for row in results:
                similar_documents.append(dict(row))

            return similar_documents

        except Exception as e:
            logger.error(f"Error finding similar filenames: {str(e)}")
            return []

        finally:
            self._release_db_connection(conn)


# Singleton instance
_duplicate_detector_service: Optional[DuplicateDetectorService] = None


def get_duplicate_detector() -> DuplicateDetectorService:
    """
    Get or create singleton duplicate detector service instance

    Returns:
        DuplicateDetectorService: Configured detector service
    """
    global _duplicate_detector_service
    if _duplicate_detector_service is None:
        _duplicate_detector_service = DuplicateDetectorService()
    return _duplicate_detector_service
