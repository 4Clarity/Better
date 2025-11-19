"""
RAG Query Service for Knowledge Base
Combines vector search with LLM generation for context-aware responses
"""

import requests
from typing import List, Dict, Optional
import logging

from .vector_search import get_vector_search
from .embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class RAGQueryService:
    """Service for Retrieval-Augmented Generation queries"""

    def __init__(
        self,
        ollama_url: str = "http://host.docker.internal:11434",
        model: str = "gemma3:1b"
    ):
        """
        Initialize RAG Query Service

        Args:
            ollama_url: Ollama API base URL
            model: LLM model for generation (default: gemma3:1b - fast, lightweight)
        """
        self.ollama_url = ollama_url
        self.model = model
        self.generate_endpoint = f"{ollama_url}/api/generate"
        self.vector_search = get_vector_search()
        self.embedding_service = get_embedding_service()

    async def query(
        self,
        user_query: str,
        max_context_chunks: int = 5,
        similarity_threshold: float = 0.3,
        security_classification: Optional[str] = None,
        temperature: float = 0.7,
        include_sources: bool = True
    ) -> Dict:
        """
        Execute RAG query: retrieve relevant chunks and generate response

        Args:
            user_query: User's question or query
            max_context_chunks: Maximum number of context chunks to retrieve
            similarity_threshold: Minimum similarity for chunk retrieval
            security_classification: Filter chunks by security level
            temperature: LLM temperature (0.0-1.0)
            include_sources: Include source citations in response

        Returns:
            Dict containing generated response, sources, and metadata
        """
        try:
            # Step 1: Retrieve relevant chunks via vector search
            logger.info(f"Searching for relevant chunks for query: {user_query[:100]}...")
            relevant_chunks = await self.vector_search.search_similar_chunks(
                query_text=user_query,
                limit=max_context_chunks,
                similarity_threshold=similarity_threshold,
                security_classification=security_classification
            )

            if not relevant_chunks:
                return {
                    "response": "I couldn't find any relevant information in the knowledge base to answer your question.",
                    "sources": [],
                    "chunks_retrieved": 0,
                    "success": False,
                    "error": "No relevant chunks found"
                }

            logger.info(f"Retrieved {len(relevant_chunks)} relevant chunks")

            # Step 2: Build context from retrieved chunks
            context = self._build_context(relevant_chunks)

            # Step 3: Generate response using LLM with context
            logger.info("Generating LLM response with retrieved context")
            llm_response = await self._generate_with_context(
                user_query=user_query,
                context=context,
                temperature=temperature
            )

            # Step 4: Format response with sources
            sources = self._format_sources(relevant_chunks) if include_sources else []

            return {
                "response": llm_response,
                "sources": sources,
                "chunks_retrieved": len(relevant_chunks),
                "success": True,
                "model": self.model
            }

        except Exception as e:
            logger.error(f"Error during RAG query: {str(e)}")
            return {
                "response": "An error occurred while processing your query.",
                "sources": [],
                "chunks_retrieved": 0,
                "success": False,
                "error": str(e)
            }

    def _build_context(self, chunks: List[Dict]) -> str:
        """
        Build formatted context string from retrieved chunks

        Args:
            chunks: List of retrieved chunks with metadata

        Returns:
            Formatted context string
        """
        context_parts = []

        for i, chunk in enumerate(chunks, 1):
            context_parts.append(
                f"[Source {i}: {chunk['original_name']} - Chunk {chunk['chunk_index']}]\n"
                f"{chunk['content']}\n"
            )

        return "\n".join(context_parts)

    async def _generate_with_context(
        self,
        user_query: str,
        context: str,
        temperature: float
    ) -> str:
        """
        Generate LLM response with retrieved context

        Args:
            user_query: User's question
            context: Retrieved context from knowledge base
            temperature: LLM temperature

        Returns:
            Generated response text
        """
        try:
            # Build RAG prompt
            prompt = f"""You are a helpful assistant with access to a knowledge base. Use the provided context to answer the user's question accurately and comprehensively.

Context from knowledge base:
{context}

User question: {user_query}

Instructions:
1. Answer the question based on the provided context
2. If the context doesn't contain enough information, say so clearly
3. Cite specific sources when possible (e.g., "According to Source 1...")
4. Be concise and accurate
5. If you're uncertain, express that uncertainty

Answer:"""

            # Call Ollama LLM
            response = requests.post(
                self.generate_endpoint,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                timeout=120  # 2 minutes
            )

            if response.status_code == 200:
                llm_response = response.json().get("response", "")
                return llm_response.strip()
            else:
                logger.error(f"LLM generation failed: {response.status_code} - {response.text}")
                return "Error generating response from language model."

        except Exception as e:
            logger.error(f"Error generating LLM response: {str(e)}")
            return "Error generating response from language model."

    def _format_sources(self, chunks: List[Dict]) -> List[Dict]:
        """
        Format source citations for response

        Args:
            chunks: Retrieved chunks with metadata

        Returns:
            List of formatted source citations
        """
        sources = []

        for chunk in chunks:
            sources.append({
                "document_name": chunk["original_name"],
                "chunk_index": chunk["chunk_index"],
                "similarity_score": round(chunk["similarity_score"], 3),
                "content_preview": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                "security_classification": chunk["security_classification"]
            })

        return sources

    async def stream_query(
        self,
        user_query: str,
        max_context_chunks: int = 5,
        similarity_threshold: float = 0.7,
        temperature: float = 0.7
    ):
        """
        Execute RAG query with streaming response

        Args:
            user_query: User's question
            max_context_chunks: Maximum chunks to retrieve
            similarity_threshold: Minimum similarity threshold
            temperature: LLM temperature

        Yields:
            Streaming response chunks
        """
        # Retrieve relevant chunks
        relevant_chunks = await self.vector_search.search_similar_chunks(
            query_text=user_query,
            limit=max_context_chunks,
            similarity_threshold=similarity_threshold
        )

        if not relevant_chunks:
            yield {"type": "error", "content": "No relevant information found"}
            return

        # Build context
        context = self._build_context(relevant_chunks)

        # Build RAG prompt
        prompt = f"""You are a helpful assistant with access to a knowledge base. Use the provided context to answer the user's question.

Context from knowledge base:
{context}

User question: {user_query}

Answer:"""

        # Stream LLM response
        try:
            response = requests.post(
                self.generate_endpoint,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {"temperature": temperature}
                },
                stream=True,
                timeout=120
            )

            for line in response.iter_lines():
                if line:
                    import json
                    data = json.loads(line)
                    if "response" in data:
                        yield {"type": "content", "content": data["response"]}

            # Send sources at the end
            yield {
                "type": "sources",
                "sources": self._format_sources(relevant_chunks)
            }

        except Exception as e:
            logger.error(f"Error during streaming query: {str(e)}")
            yield {"type": "error", "content": str(e)}


# Singleton instance
_rag_query_service: Optional[RAGQueryService] = None


def get_rag_query_service() -> RAGQueryService:
    """
    Get or create singleton RAG query service instance

    Returns:
        RAGQueryService: Configured RAG service
    """
    global _rag_query_service
    if _rag_query_service is None:
        _rag_query_service = RAGQueryService()
    return _rag_query_service
