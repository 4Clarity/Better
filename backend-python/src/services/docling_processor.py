"""
Enhanced Document Processing Service using Docling
Provides advanced document understanding with layout awareness, table extraction, and image handling
"""

import io
import hashlib
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import logging
import json

# Docling imports
try:
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
except ImportError:
    DocumentConverter = None
    PdfFormatOption = None
    InputFormat = None
    PdfPipelineOptions = None
    PyPdfiumDocumentBackend = None

logger = logging.getLogger(__name__)


class DoclingProcessor:
    """
    Enhanced document processor using Docling for advanced document understanding

    Features:
    - Layout-aware text extraction (preserves document structure)
    - Table detection and extraction to structured data
    - Image and figure detection with captions
    - Section hierarchy understanding
    - Metadata extraction (document properties, formatting)
    """

    def __init__(self):
        """Initialize Docling processor with configuration"""
        if DocumentConverter is None:
            raise ImportError(
                "docling is required for enhanced document processing. "
                "Install with: pip install docling"
            )

        # Initialize Docling converter with optimized settings
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False  # Disable OCR for performance (enable if needed)
        pipeline_options.do_table_structure = True  # Enable table extraction

        # Docling v2 API: use format_options with PdfFormatOption
        self.converter = DocumentConverter(
            allowed_formats=[
                InputFormat.PDF,
                InputFormat.DOCX,
                InputFormat.PPTX,
                InputFormat.HTML,
                InputFormat.IMAGE
            ],
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options,
                    backend=PyPdfiumDocumentBackend
                )
            }
        )

        logger.info("DoclingProcessor initialized successfully")

    def _calculate_content_hash(self, content: bytes) -> str:
        """
        Calculate SHA256 hash of document content for version tracking

        Args:
            content: Raw document bytes

        Returns:
            Hex string of content hash
        """
        return hashlib.sha256(content).hexdigest()

    async def extract_with_docling(
        self,
        file_content: bytes,
        filename: str,
        mime_type: str
    ) -> Dict[str, Any]:
        """
        Extract comprehensive document information using Docling

        Args:
            file_content: Raw file bytes
            filename: Original filename
            mime_type: MIME type of document

        Returns:
            Dict containing:
                - text_content: Full extracted text
                - tables: List of extracted tables as dataframes
                - images: List of image metadata
                - sections: Document section hierarchy
                - metadata: Docling extraction metadata
                - content_hash: SHA256 hash of content
        """
        try:
            # Calculate content hash for versioning
            content_hash = self._calculate_content_hash(file_content)

            # Determine input format from MIME type
            input_format = self._mime_to_input_format(mime_type)

            # Docling v2 requires file path, not BytesIO - save to temporary file
            file_suffix = Path(filename).suffix or '.tmp'
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as tmp_file:
                tmp_file.write(file_content)
                tmp_path = tmp_file.name

            try:
                # Convert document using Docling v2 API (expects file path)
                logger.info(f"Processing {filename} with Docling (format: {input_format})")
                result = self.converter.convert(tmp_path)

                # Extract text content
                text_content = result.document.export_to_text()

                # Extract tables
                tables = []
                for i, table in enumerate(result.document.tables):
                    try:
                        # Convert table to structured format
                        df = table.export_to_dataframe()
                        tables.append({
                            "table_index": i,
                            "data": df.to_dict('records'),  # Convert to list of dicts
                            "columns": df.columns.tolist(),
                            "row_count": len(df),
                            "caption": getattr(table, 'caption', None),
                            "bbox": getattr(table, 'bbox', None)  # Bounding box if available
                        })
                    except Exception as e:
                        logger.warning(f"Failed to extract table {i} from {filename}: {str(e)}")

                # Extract images/figures
                images = []
                for i, img in enumerate(result.document.pictures):
                    images.append({
                        "image_index": i,
                        "description": getattr(img, 'caption', None),
                        "bbox": getattr(img, 'bbox', None),
                        "page": getattr(img, 'page', None)
                    })

                # Extract section hierarchy
                sections = self._extract_sections(result.document)

                # Compile metadata
                docling_metadata = {
                    "tables_count": len(tables),
                    "images_count": len(images),
                    "sections_count": len(sections),
                    "total_pages": getattr(result.document, 'page_count', None),
                    "has_toc": bool(sections),
                    "extraction_timestamp": datetime.utcnow().isoformat(),
                    "docling_version": getattr(result, 'version', 'unknown')
                }

                logger.info(
                    f"Docling extraction complete for {filename}: "
                    f"{len(text_content)} chars, {len(tables)} tables, {len(images)} images"
                )

                return {
                    "text_content": text_content,
                    "tables": tables,
                    "images": images,
                    "sections": sections,
                    "metadata": docling_metadata,
                    "content_hash": content_hash
                }

            finally:
                # Clean up temporary file
                try:
                    Path(tmp_path).unlink(missing_ok=True)
                    logger.debug(f"Cleaned up temporary file: {tmp_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file {tmp_path}: {str(cleanup_error)}")

        except Exception as e:
            logger.error(f"Error processing {filename} with Docling: {str(e)}")
            raise

    def _mime_to_input_format(self, mime_type: str) -> str:
        """
        Map MIME type to Docling InputFormat

        Args:
            mime_type: MIME type string

        Returns:
            Docling InputFormat enum value
        """
        mime_to_format = {
            "application/pdf": InputFormat.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": InputFormat.DOCX,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": InputFormat.PPTX,
            "text/html": InputFormat.HTML,
            "image/png": InputFormat.IMAGE,
            "image/jpeg": InputFormat.IMAGE,
            "image/jpg": InputFormat.IMAGE
        }

        return mime_to_format.get(mime_type, InputFormat.PDF)

    def _extract_sections(self, document) -> List[Dict]:
        """
        Extract hierarchical section structure from document

        Args:
            document: Docling document object

        Returns:
            List of section dicts with hierarchy
        """
        sections = []

        try:
            # Attempt to extract section hierarchy
            # Note: This is implementation-dependent on Docling's API
            if hasattr(document, 'headings'):
                for i, heading in enumerate(document.headings):
                    sections.append({
                        "section_index": i,
                        "title": heading.text,
                        "level": getattr(heading, 'level', 1),
                        "page": getattr(heading, 'page', None)
                    })
        except Exception as e:
            logger.debug(f"Section extraction not available: {str(e)}")

        return sections

    async def process_tables_for_storage(
        self,
        tables: List[Dict],
        document_id: str
    ) -> List[Dict]:
        """
        Prepare extracted tables for database storage

        Args:
            tables: List of table dicts from Docling extraction
            document_id: Document ID for foreign key reference

        Returns:
            List of rows ready for document_rows table insertion
        """
        rows_for_storage = []

        for table in tables:
            table_data = table.get('data', [])

            for row_index, row_data in enumerate(table_data):
                rows_for_storage.append({
                    "dataset_id": document_id,
                    "row_data": row_data,  # JSONB column
                    "table_index": table.get('table_index'),
                    "row_index": row_index,
                    "source_type": "table_extraction"
                })

        return rows_for_storage

    async def create_document_version(
        self,
        document_id: str,
        version_number: int,
        content_hash: str,
        docling_metadata: Dict
    ) -> Dict:
        """
        Create version record for document

        Args:
            document_id: Original document ID
            version_number: Sequential version number
            content_hash: SHA256 hash of content
            docling_metadata: Metadata from Docling extraction

        Returns:
            Version record dict for database insertion
        """
        return {
            "document_id": document_id,
            "version_number": version_number,
            "content_hash": content_hash,
            "docling_metadata": docling_metadata,
            "created_at": datetime.utcnow()
        }

    async def extract_text_fallback(
        self,
        file_content: bytes,
        mime_type: str
    ) -> str:
        """
        Fallback text extraction using basic methods
        Used when Docling fails or for unsupported formats

        Args:
            file_content: Raw file bytes
            mime_type: MIME type

        Returns:
            Extracted text
        """
        try:
            if mime_type.startswith("text/"):
                return file_content.decode('utf-8')
            else:
                raise ValueError(f"No fallback available for {mime_type}")
        except Exception as e:
            logger.error(f"Fallback extraction failed: {str(e)}")
            raise

    async def should_use_docling(self, mime_type: str) -> bool:
        """
        Determine if Docling should be used for this file type

        Args:
            mime_type: MIME type of document

        Returns:
            Boolean indicating whether to use Docling
        """
        docling_supported = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/html",
            "image/png",
            "image/jpeg",
            "image/jpg"
        ]

        return mime_type in docling_supported


# Singleton instance
_docling_processor: Optional[DoclingProcessor] = None


def get_docling_processor() -> DoclingProcessor:
    """
    Get or create singleton Docling processor instance

    Returns:
        DoclingProcessor: Configured processor service
    """
    global _docling_processor
    if _docling_processor is None:
        _docling_processor = DoclingProcessor()
    return _docling_processor
