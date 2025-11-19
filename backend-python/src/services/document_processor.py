"""
Document Processing Service for RAG Knowledge Base
Handles document upload, text extraction, intelligent chunking, and embedding generation
"""

import io
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

# Document parsing libraries
try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from .chunking_analyzer import get_chunking_analyzer
from .embedding_service import get_embedding_service

# Enhanced processors
try:
    from .docling_processor import get_docling_processor
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False

try:
    from .mem0_service import get_mem0_service
    MEM0_AVAILABLE = True
except ImportError:
    MEM0_AVAILABLE = False

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Service for processing uploaded documents for RAG knowledge base"""

    def __init__(self):
        """Initialize document processor with required services"""
        self.chunking_analyzer = get_chunking_analyzer()
        self.embedding_service = get_embedding_service()

    async def extract_text_from_pdf(self, file_content: bytes) -> str:
        """
        Extract text from PDF file

        Args:
            file_content: Raw PDF file bytes

        Returns:
            Extracted text content
        """
        if PdfReader is None:
            raise ImportError("PyPDF2 is required for PDF processing. Install with: pip install PyPDF2")

        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)

            text_content = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)

            return "\n\n".join(text_content)

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise

    async def extract_text_from_docx(self, file_content: bytes) -> str:
        """
        Extract text from DOCX file

        Args:
            file_content: Raw DOCX file bytes

        Returns:
            Extracted text content
        """
        if DocxDocument is None:
            raise ImportError("python-docx is required for DOCX processing. Install with: pip install python-docx")

        try:
            docx_file = io.BytesIO(file_content)
            doc = DocxDocument(docx_file)

            text_content = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content.append(paragraph.text)

            return "\n\n".join(text_content)

        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            raise

    async def extract_text_from_html(self, file_content: bytes) -> str:
        """
        Extract text from HTML file

        Args:
            file_content: Raw HTML file bytes

        Returns:
            Extracted text content
        """
        if BeautifulSoup is None:
            raise ImportError("beautifulsoup4 is required for HTML processing. Install with: pip install beautifulsoup4")

        try:
            html_text = file_content.decode('utf-8')
            soup = BeautifulSoup(html_text, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text
            text = soup.get_text()

            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)

            return text

        except Exception as e:
            logger.error(f"Error extracting text from HTML: {str(e)}")
            raise

    async def extract_text(self, file_content: bytes, mime_type: str) -> str:
        """
        Extract text from document based on MIME type

        Args:
            file_content: Raw file bytes
            mime_type: MIME type of the document

        Returns:
            Extracted text content
        """
        if mime_type == "application/pdf":
            return await self.extract_text_from_pdf(file_content)
        elif mime_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            return await self.extract_text_from_docx(file_content)
        elif mime_type in ["text/html", "application/xhtml+xml"]:
            return await self.extract_text_from_html(file_content)
        elif mime_type.startswith("text/"):
            # Plain text files
            return file_content.decode('utf-8')
        else:
            raise ValueError(f"Unsupported MIME type: {mime_type}")

    async def chunk_text_intelligently(
        self,
        text: str,
        chunking_strategy: Dict
    ) -> List[Dict]:
        """
        Split text into chunks using LLM-recommended strategy

        Args:
            text: Full text to chunk
            chunking_strategy: Strategy dict from chunking analyzer

        Returns:
            List of chunk dicts with metadata
        """
        chunks = []

        # Extract strategy parameters
        min_size, max_size = chunking_strategy.get("recommended_chunk_size_range", [300, 600])
        overlap_tokens = chunking_strategy.get("overlap_tokens", 50)
        semantic_boundaries = chunking_strategy.get("semantic_boundaries", ["paragraph"])

        # Determine primary boundary type
        if "section" in semantic_boundaries:
            boundary_pattern = r'\n\n+'  # Section boundaries (multiple newlines)
        elif "paragraph" in semantic_boundaries:
            boundary_pattern = r'\n\n'  # Paragraph boundaries
        else:
            boundary_pattern = r'\.\s+'  # Sentence boundaries

        # Split by semantic boundaries
        segments = re.split(boundary_pattern, text)

        current_chunk = ""
        current_tokens = 0
        chunk_index = 0

        for segment in segments:
            segment = segment.strip()
            if not segment:
                continue

            # Rough token estimation (1 token ≈ 4 characters)
            segment_tokens = len(segment) // 4

            # Check if adding segment would exceed max size
            if current_tokens + segment_tokens > max_size and current_tokens >= min_size:
                # Save current chunk
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": current_chunk.strip(),
                    "token_count": current_tokens,
                    "semantic_boundary_type": semantic_boundaries[0] if semantic_boundaries else "paragraph"
                })

                # Start new chunk with overlap
                overlap_text = current_chunk[-overlap_tokens * 4:] if overlap_tokens > 0 else ""
                current_chunk = overlap_text + " " + segment
                current_tokens = (len(overlap_text) + len(segment)) // 4
                chunk_index += 1
            else:
                # Add segment to current chunk
                current_chunk += ("\n\n" if current_chunk else "") + segment
                current_tokens += segment_tokens

        # Add final chunk
        if current_chunk.strip():
            chunks.append({
                "chunk_index": chunk_index,
                "content": current_chunk.strip(),
                "token_count": current_tokens,
                "semantic_boundary_type": semantic_boundaries[0] if semantic_boundaries else "paragraph"
            })

        return chunks

    async def process_document(
        self,
        file_content: bytes,
        filename: str,
        mime_type: str,
        document_id: str
    ) -> Tuple[List[Dict], Dict]:
        """
        Full document processing pipeline

        Args:
            file_content: Raw file bytes
            filename: Original filename
            mime_type: MIME type
            document_id: Database ID for the document

        Returns:
            Tuple of (chunks with embeddings, chunking strategy metadata)
        """
        try:
            # Step 1: Extract text
            logger.info(f"Extracting text from {filename} ({mime_type})")
            text_content = await self.extract_text(file_content, mime_type)

            if not text_content or len(text_content.strip()) < 50:
                raise ValueError("Extracted text is too short or empty")

            # Step 2: Analyze and determine chunking strategy
            logger.info(f"Analyzing chunking strategy for {filename}")
            chunking_strategy = await self.chunking_analyzer.analyze_document_for_chunking(
                document_text=text_content,
                mime_type=mime_type,
                filename=filename
            )

            if not chunking_strategy:
                raise ValueError("Failed to determine chunking strategy")

            # Step 3: Chunk text intelligently
            logger.info(f"Chunking document using strategy: {chunking_strategy.get('rationale', 'N/A')}")
            chunks = await self.chunk_text_intelligently(text_content, chunking_strategy)

            logger.info(f"Created {len(chunks)} chunks from {filename}")

            # Step 4: Generate embeddings for each chunk
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            chunk_texts = [chunk["content"] for chunk in chunks]
            embeddings = await self.embedding_service.generate_embeddings_batch(chunk_texts)

            # Step 5: Combine chunks with embeddings
            processed_chunks = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                if embedding:  # Only include chunks with successful embeddings
                    processed_chunks.append({
                        "document_id": document_id,
                        "chunk_index": chunk["chunk_index"],
                        "content": chunk["content"],
                        "token_count": chunk["token_count"],
                        "semantic_boundary_type": chunk["semantic_boundary_type"],
                        "embedding": embedding,
                        "vector_model": self.embedding_service.model,
                        "chunk_strategy_applied": chunking_strategy,
                        "thought_completeness_score": 0.85  # Placeholder - could be LLM-assessed
                    })

            return processed_chunks, chunking_strategy

        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            raise

    async def process_document_enhanced(
        self,
        file_content: bytes,
        filename: str,
        mime_type: str,
        document_id: str,
        user_id: Optional[str] = None,
        enable_fact_extraction: bool = True
    ) -> Tuple[List[Dict], Dict, Optional[Dict]]:
        """
        Enhanced document processing pipeline using Docling and mem0

        Args:
            file_content: Raw file bytes
            filename: Original filename
            mime_type: MIME type
            document_id: Database ID for the document
            user_id: Optional user ID for fact extraction
            enable_fact_extraction: Whether to extract facts using mem0

        Returns:
            Tuple of (chunks with embeddings, chunking strategy metadata, docling result)
        """
        try:
            docling_result = None
            text_content = None

            # Check if we should use Docling for this file type
            if DOCLING_AVAILABLE:
                docling_processor = get_docling_processor()
                should_use_docling = await docling_processor.should_use_docling(mime_type)

                if should_use_docling:
                    logger.info(f"Using Docling for enhanced extraction of {filename}")
                    docling_result = await docling_processor.extract_with_docling(
                        file_content=file_content,
                        filename=filename,
                        mime_type=mime_type
                    )
                    text_content = docling_result.get('text_content')

                    # Store tables if present
                    tables = docling_result.get('tables', [])
                    if tables:
                        logger.info(f"Extracted {len(tables)} tables from {filename}")
                        # Tables will be stored separately by the caller

            # Fallback to standard extraction if Docling not used or failed
            if text_content is None:
                logger.info(f"Using standard extraction for {filename}")
                text_content = await self.extract_text(file_content, mime_type)

            if not text_content or len(text_content.strip()) < 50:
                raise ValueError("Extracted text is too short or empty")

            # Analyze and determine chunking strategy
            logger.info(f"Analyzing chunking strategy for {filename}")
            chunking_strategy = await self.chunking_analyzer.analyze_document_for_chunking(
                document_text=text_content,
                mime_type=mime_type,
                filename=filename
            )

            if not chunking_strategy:
                raise ValueError("Failed to determine chunking strategy")

            # Chunk text intelligently
            logger.info(f"Chunking document using strategy: {chunking_strategy.get('rationale', 'N/A')}")
            chunks = await self.chunk_text_intelligently(text_content, chunking_strategy)

            logger.info(f"Created {len(chunks)} chunks from {filename}")

            # Generate embeddings for each chunk
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            chunk_texts = [chunk["content"] for chunk in chunks]
            embeddings = await self.embedding_service.generate_embeddings_batch(chunk_texts)

            # Combine chunks with embeddings
            processed_chunks = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                if embedding:  # Only include chunks with successful embeddings
                    processed_chunks.append({
                        "document_id": document_id,
                        "chunk_index": chunk["chunk_index"],
                        "content": chunk["content"],
                        "token_count": chunk["token_count"],
                        "semantic_boundary_type": chunk["semantic_boundary_type"],
                        "embedding": embedding,
                        "vector_model": self.embedding_service.model,
                        "chunk_strategy_applied": chunking_strategy,
                        "thought_completeness_score": 0.85
                    })

            # Extract facts using mem0 if enabled
            if enable_fact_extraction and MEM0_AVAILABLE:
                try:
                    logger.info(f"Extracting facts from {filename} using mem0")
                    mem0_service = get_mem0_service()

                    # Extract facts from the full text
                    facts = await mem0_service.extract_facts_from_text(
                        text=text_content,
                        document_id=document_id,
                        user_id=user_id,
                        metadata={
                            "filename": filename,
                            "mime_type": mime_type,
                            "chunk_count": len(processed_chunks)
                        }
                    )

                    logger.info(f"Extracted {len(facts)} facts from {filename}")

                    # Add facts to docling_result if it exists
                    if docling_result is None:
                        docling_result = {}
                    docling_result['facts'] = facts

                except Exception as e:
                    logger.warning(f"Fact extraction failed for {filename}: {str(e)}")
                    # Don't fail the entire processing if fact extraction fails

            return processed_chunks, chunking_strategy, docling_result

        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            raise


# Singleton instance
_document_processor: Optional[DocumentProcessor] = None


def get_document_processor() -> DocumentProcessor:
    """
    Get or create singleton document processor instance

    Returns:
        DocumentProcessor: Configured processor service
    """
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor()
    return _document_processor
