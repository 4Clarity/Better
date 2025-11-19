"""
Embedding Service for RAG Knowledge Base
Uses Ollama's nomic-embed-text model to generate 768-dimensional embeddings
"""

import requests
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class OllamaEmbeddingService:
    """Service for generating embeddings using Ollama's nomic-embed-text model"""

    def __init__(
        self,
        ollama_url: str = "http://host.docker.internal:11434",
        model: str = "nomic-embed-text",
        dimension: int = 768
    ):
        """
        Initialize Ollama Embedding Service

        Args:
            ollama_url: Ollama API base URL
            model: Embedding model name (default: nomic-embed-text)
            dimension: Expected embedding dimension (default: 768)
        """
        self.ollama_url = ollama_url
        self.model = model
        self.dimension = dimension
        self.embeddings_endpoint = f"{ollama_url}/api/embeddings"

    async def health_check(self) -> bool:
        """
        Check if Ollama service is available

        Returns:
            bool: True if service is healthy, False otherwise
        """
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {str(e)}")
            return False

    async def verify_model_available(self) -> bool:
        """
        Verify that the embedding model is available in Ollama

        Returns:
            bool: True if model is available, False otherwise
        """
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(m.get("name", "").startswith(self.model) for m in models)
            return False
        except Exception as e:
            logger.error(f"Model verification failed: {str(e)}")
            return False

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text string

        Args:
            text: Input text to embed

        Returns:
            List[float]: 768-dimensional embedding vector, or None if failed
        """
        try:
            response = requests.post(
                self.embeddings_endpoint,
                json={
                    "model": self.model,
                    "prompt": text
                },
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                embedding = data.get("embedding", [])

                # Validate dimension
                if len(embedding) != self.dimension:
                    logger.warning(
                        f"Unexpected embedding dimension: {len(embedding)} "
                        f"(expected {self.dimension})"
                    )

                return embedding
            else:
                logger.error(
                    f"Embedding generation failed: {response.status_code} - {response.text}"
                )
                return None

        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None

    async def generate_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 10
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in batches

        Args:
            texts: List of input texts to embed
            batch_size: Number of texts to process at once (default: 10)

        Returns:
            List of embedding vectors (same order as input, None for failures)
        """
        embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.info(f"Processing embedding batch {i//batch_size + 1} ({len(batch)} texts)")

            for text in batch:
                embedding = await self.generate_embedding(text)
                embeddings.append(embedding)

        return embeddings

    async def get_embedding_metadata(self) -> Dict[str, any]:
        """
        Get metadata about the embedding service configuration

        Returns:
            Dict containing model name, dimension, and service status
        """
        is_healthy = await self.health_check()
        model_available = await self.verify_model_available() if is_healthy else False

        return {
            "service": "OllamaEmbeddingService",
            "model": self.model,
            "dimension": self.dimension,
            "ollama_url": self.ollama_url,
            "healthy": is_healthy,
            "model_available": model_available
        }


# Singleton instance
_embedding_service: Optional[OllamaEmbeddingService] = None


def get_embedding_service() -> OllamaEmbeddingService:
    """
    Get or create singleton embedding service instance

    Returns:
        OllamaEmbeddingService: Configured embedding service
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = OllamaEmbeddingService()
    return _embedding_service
