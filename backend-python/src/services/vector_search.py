"""
Vector Search Service for RAG Knowledge Base
Performs semantic similarity search using pgvector
"""

from typing import List, Dict, Optional
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging
import os

from .embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class VectorSearchService:
    """Service for vector similarity search in knowledge base"""

    _connection_pool: Optional[pool.ThreadedConnectionPool] = None

    def __init__(self):
        """Initialize vector search service"""
        self.embedding_service = get_embedding_service()
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

    async def search_similar_chunks(
        self,
        query_text: str,
        limit: int = 5,
        similarity_threshold: float = 0.7,
        security_classification: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for semantically similar chunks using vector similarity

        Args:
            query_text: User query text
            limit: Maximum number of results to return
            similarity_threshold: Minimum cosine similarity (0-1)
            security_classification: Filter by security level (optional)

        Returns:
            List of similar chunks with metadata
        """
        try:
            # Step 1: Generate embedding for query
            logger.info(f"Generating embedding for query: {query_text[:100]}...")
            query_embedding = await self.embedding_service.generate_embedding(query_text)

            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []

            # Step 2: Perform vector similarity search
            results = await self._vector_similarity_search(
                query_embedding=query_embedding,
                limit=limit,
                similarity_threshold=similarity_threshold,
                security_classification=security_classification
            )

            return results

        except Exception as e:
            logger.error(f"Error during vector search: {str(e)}")
            return []

    async def _vector_similarity_search(
        self,
        query_embedding: List[float],
        limit: int,
        similarity_threshold: float,
        security_classification: Optional[str]
    ) -> List[Dict]:
        """
        Execute vector similarity search query

        Args:
            query_embedding: Query vector
            limit: Max results
            similarity_threshold: Min similarity
            security_classification: Security filter

        Returns:
            List of matching chunks with similarity scores
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Build query with security filter
            security_filter = ""
            params = [query_embedding, limit]

            if security_classification:
                security_filter = "AND kd.security_classification = %s"
                params.insert(1, security_classification)

            # Cosine similarity search using <=> operator
            # Lower distance = higher similarity (0 = identical, 2 = opposite)
            # Convert to similarity score: 1 - (distance / 2)
            query = f"""
                SELECT
                    kc.id,
                    kc.content,
                    kc.chunk_index,
                    kc.token_count,
                    kc.semantic_boundary_type,
                    kc.vector_model,
                    kc.thought_completeness_score,
                    kc.document_id,
                    kd.filename,
                    kd.original_name,
                    kd.mime_type,
                    kd.security_classification,
                    kd.created_at,
                    (1 - (kc.embedding <=> %s::vector) / 2) as similarity_score
                FROM knowledge_document_chunks kc
                JOIN knowledge_documents kd ON kc.document_id = kd.id
                WHERE kc.embedding IS NOT NULL
                {security_filter}
                ORDER BY kc.embedding <=> %s::vector
                LIMIT %s;
            """

            # Execute with query embedding twice (for similarity calculation and ordering)
            cursor.execute(query, [query_embedding, *params])
            results = cursor.fetchall()

            # Filter by similarity threshold and format results
            filtered_results = []
            for row in results:
                similarity = float(row['similarity_score'])

                if similarity >= similarity_threshold:
                    filtered_results.append({
                        "chunk_id": row['id'],
                        "content": row['content'],
                        "chunk_index": row['chunk_index'],
                        "token_count": row['token_count'],
                        "semantic_boundary_type": row['semantic_boundary_type'],
                        "vector_model": row['vector_model'],
                        "thought_completeness_score": float(row['thought_completeness_score']) if row['thought_completeness_score'] else None,
                        "document_id": row['document_id'],
                        "filename": row['filename'],
                        "original_name": row['original_name'],
                        "mime_type": row['mime_type'],
                        "security_classification": row['security_classification'],
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                        "similarity_score": similarity
                    })

            logger.info(f"Found {len(filtered_results)} chunks above similarity threshold {similarity_threshold}")
            return filtered_results

        except Exception as e:
            logger.error(f"Database error during vector search: {str(e)}")
            return []

        finally:
            self._release_db_connection(conn)

    async def get_chunk_by_id(self, chunk_id: str) -> Optional[Dict]:
        """
        Retrieve specific chunk by ID

        Args:
            chunk_id: Chunk ID

        Returns:
            Chunk data or None if not found
        """
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            query = """
                SELECT
                    kc.id,
                    kc.content,
                    kc.chunk_index,
                    kc.token_count,
                    kc.semantic_boundary_type,
                    kc.vector_model,
                    kc.thought_completeness_score,
                    kc.document_id,
                    kd.filename,
                    kd.original_name,
                    kd.mime_type
                FROM knowledge_document_chunks kc
                JOIN knowledge_documents kd ON kc.document_id = kd.id
                WHERE kc.id = %s;
            """

            cursor.execute(query, (chunk_id,))
            result = cursor.fetchone()

            if result:
                return dict(result)
            return None

        except Exception as e:
            logger.error(f"Error retrieving chunk {chunk_id}: {str(e)}")
            return None

        finally:
            self._release_db_connection(conn)


# Singleton instance
_vector_search_service: Optional[VectorSearchService] = None


def get_vector_search() -> VectorSearchService:
    """
    Get or create singleton vector search service instance

    Returns:
        VectorSearchService: Configured search service
    """
    global _vector_search_service
    if _vector_search_service is None:
        _vector_search_service = VectorSearchService()
    return _vector_search_service
