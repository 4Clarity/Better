"""
LLM-Driven Chunking Analyzer Service
Uses Ollama LLM to analyze documents and recommend optimal chunking strategies
"""

import requests
import time
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class ChunkingStrategy(BaseModel):
    """Pydantic model for chunking strategy recommendations"""

    recommended_chunk_size_range: List[int] = Field(
        description="Recommended min and max chunk sizes in tokens [min, max]"
    )
    semantic_boundaries: List[str] = Field(
        description="Recommended semantic boundary types (e.g., paragraph, section, code_block)"
    )
    overlap_tokens: int = Field(
        description="Recommended overlap between chunks in tokens"
    )
    special_handling: Dict[str, str] = Field(
        description="Special handling rules for specific content types"
    )
    rationale: str = Field(
        description="LLM explanation for the recommended strategy"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="LLM confidence in the recommendation (0-1)"
    )


class ChunkingAnalyzerService:
    """Service for LLM-driven chunking strategy analysis"""

    def __init__(
        self,
        ollama_url: str = "http://host.docker.internal:11434",
        model: str = "gemma3:1b"
    ):
        """
        Initialize Chunking Analyzer Service

        Args:
            ollama_url: Ollama API base URL
            model: LLM model for analysis (default: gemma3:1b)
        """
        self.ollama_url = ollama_url
        self.model = model
        self.generate_endpoint = f"{ollama_url}/api/generate"

    async def analyze_document_for_chunking(
        self,
        document_text: str,
        mime_type: str,
        filename: str
    ) -> Optional[Dict]:
        """
        Analyze document and recommend optimal chunking strategy

        Args:
            document_text: Full text content of the document (or representative sample)
            mime_type: MIME type of the document
            filename: Original filename

        Returns:
            Dict containing chunking strategy or None if failed
        """
        start_time = time.time()

        try:
            # Prepare analysis prompt
            prompt = self._build_analysis_prompt(document_text, mime_type, filename)

            # Call Ollama LLM
            response = requests.post(
                self.generate_endpoint,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower temperature for more deterministic analysis
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                timeout=120  # 2 minutes for analysis
            )

            if response.status_code != 200:
                logger.error(f"LLM analysis failed: {response.status_code} - {response.text}")
                return None

            llm_response = response.json().get("response", "")
            analysis_time_ms = int((time.time() - start_time) * 1000)

            # Parse LLM response into structured strategy
            strategy = self._parse_llm_response(llm_response, document_text)

            if strategy:
                strategy["analysis_time_ms"] = analysis_time_ms
                return strategy

            return None

        except Exception as e:
            logger.error(f"Error during chunking analysis: {str(e)}")
            return None

    def _build_analysis_prompt(
        self,
        document_text: str,
        mime_type: str,
        filename: str
    ) -> str:
        """Build analysis prompt for LLM"""

        # Limit document sample to first 2000 characters to avoid overwhelming LLM
        doc_sample = document_text[:2000] + ("..." if len(document_text) > 2000 else "")

        prompt = f"""You are a document chunking expert. Analyze this document and recommend the optimal chunking strategy to preserve the integrity of thoughts and maintain semantic coherence.

Document Information:
- Filename: {filename}
- MIME Type: {mime_type}
- Content Sample (first 2000 chars):
{doc_sample}

Provide your analysis in this exact JSON format:
{{
    "recommended_chunk_size_range": [min_tokens, max_tokens],
    "semantic_boundaries": ["boundary_type1", "boundary_type2"],
    "overlap_tokens": number,
    "special_handling": {{
        "code_blocks": "strategy",
        "tables": "strategy",
        "lists": "strategy"
    }},
    "rationale": "your explanation here",
    "confidence_score": 0.0 to 1.0
}}

Guidelines:
1. For technical documents with code: larger chunks (400-800 tokens), preserve code blocks
2. For narrative text: medium chunks (300-600 tokens), respect paragraph boundaries
3. For structured data: smaller chunks (200-400 tokens), preserve table/list integrity
4. Always recommend overlap (50-100 tokens) for context continuity
5. Identify semantic boundaries: paragraph, section, code_block, table, list, heading

Respond ONLY with the JSON object, no additional text.
"""
        return prompt

    def _parse_llm_response(self, llm_response: str, document_text: str) -> Optional[Dict]:
        """
        Parse LLM response into structured chunking strategy

        Args:
            llm_response: Raw LLM response text
            document_text: Original document text for fallback estimation

        Returns:
            Structured chunking strategy dict or None if parsing failed
        """
        try:
            import json
            import re

            # Extract JSON from response (LLM might add extra text)
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                strategy = json.loads(json_str)

                # Validate required fields
                required_fields = [
                    "recommended_chunk_size_range",
                    "semantic_boundaries",
                    "overlap_tokens",
                    "special_handling",
                    "rationale",
                    "confidence_score"
                ]

                if all(field in strategy for field in required_fields):
                    return strategy

            logger.warning("LLM response missing required fields, using fallback strategy")
            return self._get_fallback_strategy(document_text)

        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return self._get_fallback_strategy(document_text)

    def _get_fallback_strategy(self, document_text: str) -> Dict:
        """
        Provide fallback chunking strategy if LLM analysis fails

        Args:
            document_text: Document text for heuristic analysis

        Returns:
            Default chunking strategy based on heuristics
        """
        # Simple heuristic: check for code patterns
        has_code = any(pattern in document_text for pattern in ["def ", "class ", "function ", "```"])

        if has_code:
            return {
                "recommended_chunk_size_range": [400, 800],
                "semantic_boundaries": ["paragraph", "section", "code_block"],
                "overlap_tokens": 75,
                "special_handling": {
                    "code_blocks": "preserve_complete",
                    "tables": "keep_together",
                    "lists": "preserve_with_context"
                },
                "rationale": "Fallback strategy: Technical document detected with code patterns",
                "confidence_score": 0.5
            }
        else:
            return {
                "recommended_chunk_size_range": [300, 600],
                "semantic_boundaries": ["paragraph", "section"],
                "overlap_tokens": 50,
                "special_handling": {
                    "code_blocks": "preserve_complete",
                    "tables": "keep_together",
                    "lists": "preserve_with_context"
                },
                "rationale": "Fallback strategy: General text document",
                "confidence_score": 0.5
            }


# Singleton instance
_chunking_analyzer: Optional[ChunkingAnalyzerService] = None


def get_chunking_analyzer() -> ChunkingAnalyzerService:
    """
    Get or create singleton chunking analyzer instance

    Returns:
        ChunkingAnalyzerService: Configured analyzer service
    """
    global _chunking_analyzer
    if _chunking_analyzer is None:
        _chunking_analyzer = ChunkingAnalyzerService()
    return _chunking_analyzer
