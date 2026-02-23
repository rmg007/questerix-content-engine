"""
Document parser for extracting text from PDF, DOCX, and images.
"""

from pathlib import Path
from typing import Dict, Any
import logging

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    from docx import Document
except ImportError:
    Document = None

try:
    from PIL import Image
except ImportError:
    Image = None

logger = logging.getLogger(__name__)


class DocumentParser:
    """
    Multi-format document parser.
    Extracts plain text from PDF, DOCX, and image files.
    """
    
    SUPPORTED_FORMATS = {
        '.pdf': 'parse_pdf',
        '.docx': 'parse_docx',
        '.png': 'parse_image',
        '.jpg': 'parse_image',
        '.jpeg': 'parse_image',
    }
    
    def parse(self, file_path: str) -> str:
        """
        Main entry point for parsing any supported document.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Extracted text content
            
        Raises:
            ValueError: If file format is not supported
            FileNotFoundError: If file doesn't exist
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        ext = path.suffix.lower()
        
        if ext not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported file format: {ext}. "
                f"Supported formats: {list(self.SUPPORTED_FORMATS.keys())}"
            )
        
        method_name = self.SUPPORTED_FORMATS[ext]
        method = getattr(self, method_name)
        
        logger.info(f"Parsing {ext} file: {file_path}")
        return method(file_path)

    def parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        if PdfReader is None:
            raise ImportError("PyPDF2 is required for PDF parsing. Install with: pip install PyPDF2")
        
        text_chunks = []
        
        try:
            reader = PdfReader(file_path)
            page_count = len(reader.pages)
            
            logger.info(f"Processing {page_count} pages...")
            
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text.strip():
                    text_chunks.append(text)
                    logger.debug(f"Extracted {len(text)} chars from page {page_num}")
        
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            raise
        
        full_text = "\n\n".join(text_chunks)
        logger.info(f"Total extracted: {len(full_text)} characters")
        
        return full_text

    def parse_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        if Document is None:
            raise ImportError("python-docx is required. Install with: pip install python-docx")
        
        try:
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            
            full_text = "\n\n".join(paragraphs)
            logger.info(f"Extracted {len(paragraphs)} paragraphs, {len(full_text)} characters")
            
            return full_text
        
        except Exception as e:
            logger.error(f"DOCX parsing error: {e}")
            raise

    def parse_image(self, file_path: str) -> str:
        """
        For images, we don't do OCR in Python (expensive).
        Instead, return a placeholder that signals the frontend to use Gemini Vision.
        """
        if Image is None:
            raise ImportError("Pillow is required. Install with: pip install Pillow")
        
        try:
            img = Image.open(file_path)
            width, height = img.size
            
            logger.info(f"Image detected: {width}x{height}. Use Gemini Vision for OCR.")
            
            return f"[IMAGE: {Path(file_path).name}, {width}x{height}px. Send to Gemini Vision for multimodal analysis.]"
        
        except Exception as e:
            logger.error(f"Image parsing error: {e}")
            raise

    @staticmethod
    def get_metadata(file_path: str) -> Dict[str, Any]:
        """Extract file metadata."""
        path = Path(file_path)
        
        # Default metadata for missing files
        default_metadata = {
            "filename": path.name,
            "file_size": 0,
            "extension": path.suffix.lower(),
            "exists": False
        }
        
        try:
            stat_info = path.stat()
            metadata = {
                "filename": path.name,
                "file_size": stat_info.st_size,
                "extension": path.suffix.lower(),
                "exists": True,
                "modified_time": stat_info.st_mtime,
                "created_time": stat_info.st_ctime
            }
        except FileNotFoundError:
            logger.warning(f"File not found for metadata extraction: {file_path}")
            return default_metadata
        except Exception as e:
            logger.error(f"Error accessing file metadata for {file_path}: {e}")
            return default_metadata
        
        # PDF-specific metadata
        if path.suffix.lower() == '.pdf' and PdfReader:
            try:
                reader = PdfReader(file_path)
                metadata["page_count"] = len(reader.pages)
                if reader.metadata:
                    metadata["pdf_metadata"] = {
                        "title": reader.metadata.get("/Title"),
                        "author": reader.metadata.get("/Author"),
                        "subject": reader.metadata.get("/Subject"),
                    }
            except Exception as e:
                logger.warning(f"Could not extract PDF metadata: {e}")
        
        return metadata
