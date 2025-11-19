"""
mem0 Integration Service for Fact Extraction and Memory Management
Handles fact extraction, versioning, and intelligent context retrieval
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import json
import re

# mem0 imports
try:
    from mem0 import Memory
except ImportError:
    Memory = None

from .embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class Mem0Service:
    """
    Service for managing document facts and memories using mem0

    Features:
    - Automatic fact extraction from documents
    - Fact versioning and updates
    - Related fact detection
    - Confidence scoring
    - Context-aware fact retrieval
    - Fact importance ranking
    """

    def __init__(self, ollama_url: str = "http://host.docker.internal:11434"):
        """
        Initialize mem0 service

        Args:
            ollama_url: URL for Ollama LLM service
        """
        if Memory is None:
            raise ImportError(
                "mem0 is required for fact management. "
                "Install with: pip install mem0ai"
            )

        # Initialize mem0 with Ollama configuration
        config = {
            "llm": {
                "provider": "ollama",
                "config": {
                    "model": "llama3.2:latest",
                    "base_url": ollama_url,
                    "temperature": 0.1,
                    "max_tokens": 2000
                }
            },
            "embedder": {
                "provider": "ollama",
                "config": {
                    "model": "nomic-embed-text:latest",
                    "base_url": ollama_url
                }
            },
            "version": "v1.1"
        }

        try:
            self.memory = Memory.from_config(config)
            self.embedding_service = get_embedding_service()
            logger.info("Mem0Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize mem0: {str(e)}")
            raise

    async def extract_facts_from_text(
        self,
        text: str,
        document_id: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Extract structured facts from document text using mem0

        Args:
            text: Document text content
            document_id: Document ID for reference
            user_id: Optional user ID for user-specific memories
            metadata: Optional metadata to include with facts

        Returns:
            List of extracted fact dicts
        """
        try:
            # Use mem0 to add document content and extract memories
            logger.info(f"Extracting facts from document {document_id}")

            # Add document to mem0 with metadata
            mem0_metadata = {
                "document_id": document_id,
                "extraction_timestamp": datetime.utcnow().isoformat(),
                **(metadata or {})
            }

            # Add text to mem0 (this extracts and stores facts automatically)
            result = self.memory.add(
                messages=text,
                user_id=user_id or document_id,
                metadata=mem0_metadata
            )

            # Retrieve the extracted facts/memories
            memories = self.memory.get_all(user_id=user_id or document_id)

            # Process and structure facts
            extracted_facts = []
            for memory in memories.get('results', []):
                fact = await self._structure_fact(
                    memory=memory,
                    document_id=document_id,
                    source_text=text
                )
                extracted_facts.append(fact)

            logger.info(f"Extracted {len(extracted_facts)} facts from document {document_id}")
            return extracted_facts

        except Exception as e:
            logger.error(f"Error extracting facts: {str(e)}")
            raise

    async def _structure_fact(
        self,
        memory: Dict,
        document_id: str,
        source_text: str
    ) -> Dict:
        """
        Structure a mem0 memory into a fact record

        Args:
            memory: Raw memory from mem0
            document_id: Document ID
            source_text: Original source text

        Returns:
            Structured fact dict
        """
        fact_text = memory.get('memory', '')
        memory_id = memory.get('id')

        # Classify fact type
        fact_type = self._classify_fact_type(fact_text)

        # Calculate confidence score
        confidence_score = self._calculate_confidence(memory, source_text)

        # Generate embedding for fact
        embedding = await self.embedding_service.generate_embeddings(fact_text)

        return {
            "document_id": document_id,
            "fact_text": fact_text,
            "fact_type": fact_type,
            "memory_id": memory_id,
            "confidence_score": confidence_score,
            "embedding": embedding,
            "metadata": memory.get('metadata', {}),
            "created_at": datetime.utcnow(),
            "curation_status": "pending"
        }

    def _classify_fact_type(self, fact_text: str) -> str:
        """
        Classify fact into a category

        Args:
            fact_text: The fact text

        Returns:
            Fact type category
        """
        # Pattern-based classification
        patterns = {
            "date": r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b',
            "entity": r'\b([A-Z][a-z]+\s){1,3}(Inc|LLC|Corp|Ltd|Organization|Agency|Department)\b',
            "metric": r'\b\d+(\.\d+)?\s*(percent|%|dollars?|\$|million|billion|years?|months?|days?)\b',
            "definition": r'\b(is|means|refers to|defined as)\b',
            "process": r'\b(step|phase|stage|procedure|workflow)\b',
            "person": r'\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\b',
            "location": r'\b[A-Z][a-z]+,\s+[A-Z]{2}\b',
            "requirement": r'\b(must|shall|required to|mandatory|obligatory)\b'
        }

        for fact_type, pattern in patterns.items():
            if re.search(pattern, fact_text, re.IGNORECASE):
                return fact_type

        return "general"

    def _calculate_confidence(self, memory: Dict, source_text: str) -> float:
        """
        Calculate confidence score for extracted fact

        Args:
            memory: mem0 memory object
            source_text: Original source text

        Returns:
            Confidence score between 0 and 1
        """
        # Base confidence from mem0 metadata
        base_score = 0.7

        # Adjust based on memory metadata
        metadata = memory.get('metadata', {})

        # Higher confidence if explicitly stated in source
        fact_text = memory.get('memory', '')
        if fact_text.lower() in source_text.lower():
            base_score += 0.2

        # Adjust based on fact complexity (simpler facts = higher confidence)
        word_count = len(fact_text.split())
        if word_count < 15:
            base_score += 0.05
        elif word_count > 50:
            base_score -= 0.1

        # Cap at 1.0
        return min(base_score, 1.0)

    async def find_related_facts(
        self,
        fact_text: str,
        document_id: str,
        limit: int = 5,
        threshold: float = 0.7
    ) -> List[Dict]:
        """
        Find facts related to a given fact using semantic similarity

        Args:
            fact_text: The fact to find relations for
            document_id: Document ID to search within
            limit: Maximum number of related facts
            threshold: Minimum similarity threshold

        Returns:
            List of related fact dicts with similarity scores
        """
        try:
            # Search mem0 for related memories
            results = self.memory.search(
                query=fact_text,
                user_id=document_id,
                limit=limit
            )

            related_facts = []
            for result in results.get('results', []):
                similarity = result.get('score', 0)
                if similarity >= threshold:
                    related_facts.append({
                        "memory_id": result.get('id'),
                        "fact_text": result.get('memory'),
                        "similarity": similarity,
                        "metadata": result.get('metadata', {})
                    })

            return related_facts

        except Exception as e:
            logger.error(f"Error finding related facts: {str(e)}")
            return []

    async def update_fact(
        self,
        memory_id: str,
        new_text: str,
        user_id: str
    ) -> Dict:
        """
        Update an existing fact in mem0

        Args:
            memory_id: ID of the memory to update
            new_text: New fact text
            user_id: User ID

        Returns:
            Updated fact dict
        """
        try:
            # Update memory in mem0
            result = self.memory.update(
                memory_id=memory_id,
                data=new_text
            )

            logger.info(f"Updated fact {memory_id}")
            return result

        except Exception as e:
            logger.error(f"Error updating fact {memory_id}: {str(e)}")
            raise

    async def delete_fact(self, memory_id: str) -> bool:
        """
        Delete a fact from mem0

        Args:
            memory_id: ID of the memory to delete

        Returns:
            Boolean indicating success
        """
        try:
            self.memory.delete(memory_id=memory_id)
            logger.info(f"Deleted fact {memory_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting fact {memory_id}: {str(e)}")
            return False

    async def get_context_for_query(
        self,
        query: str,
        user_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Retrieve relevant facts/context for a query

        Args:
            query: User query
            user_id: User ID for personalized context
            limit: Maximum number of facts to retrieve

        Returns:
            List of relevant facts with metadata
        """
        try:
            # Search mem0 for relevant memories
            results = self.memory.search(
                query=query,
                user_id=user_id,
                limit=limit
            )

            context_facts = []
            for result in results.get('results', []):
                context_facts.append({
                    "memory_id": result.get('id'),
                    "fact_text": result.get('memory'),
                    "relevance_score": result.get('score'),
                    "metadata": result.get('metadata', {})
                })

            return context_facts

        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return []

    async def track_fact_usage(
        self,
        memory_id: str,
        increment: int = 1
    ) -> None:
        """
        Track how often a fact is accessed (for importance scoring)

        Args:
            memory_id: Memory ID to track
            increment: Amount to increment access count
        """
        try:
            # Note: This would need to be stored in the database
            # mem0 doesn't natively track access counts
            logger.debug(f"Tracking usage for fact {memory_id}: +{increment}")
            # Implementation would update database record

        except Exception as e:
            logger.error(f"Error tracking fact usage: {str(e)}")

    async def calculate_importance_score(
        self,
        memory_id: str,
        access_count: int,
        confidence_score: float,
        age_days: int
    ) -> float:
        """
        Calculate importance score for a fact

        Args:
            memory_id: Memory ID
            access_count: Number of times accessed
            confidence_score: Confidence in fact accuracy
            age_days: Age of fact in days

        Returns:
            Importance score between 0 and 1
        """
        # Importance = weighted combination of factors
        access_weight = 0.4
        confidence_weight = 0.4
        recency_weight = 0.2

        # Normalize access count (assume max 100 accesses)
        access_score = min(access_count / 100, 1.0)

        # Recency score (newer = higher, decay over 365 days)
        recency_score = max(0, 1 - (age_days / 365))

        importance = (
            access_weight * access_score +
            confidence_weight * confidence_score +
            recency_weight * recency_score
        )

        return round(importance, 2)


# Singleton instance
_mem0_service: Optional[Mem0Service] = None


def get_mem0_service(ollama_url: str = "http://host.docker.internal:11434") -> Mem0Service:
    """
    Get or create singleton mem0 service instance

    Args:
        ollama_url: URL for Ollama service

    Returns:
        Mem0Service: Configured service instance
    """
    global _mem0_service
    if _mem0_service is None:
        _mem0_service = Mem0Service(ollama_url=ollama_url)
    return _mem0_service
