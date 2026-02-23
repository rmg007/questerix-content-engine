"""
Functional tests for document parser module.
Tests file parsing with real and mock files.
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch
from PIL import Image

from src.parsers.document_parser import DocumentParser


class TestDocumentParser:
    """Test suite for DocumentParser class."""

    @pytest.fixture
    def sample_pdf_content(self):
        """Sample PDF content for testing."""
        return "This is a sample PDF document.\nPage 1 content.\n\nPage 2 content."

    @pytest.fixture
    def sample_docx_content(self):
        """Sample DOCX content for testing."""
        return [
            "Chapter 1: Introduction",
            "This is the first paragraph.",
            "Chapter 2: Methods",
            "This is the second paragraph with more details."
        ]

    @pytest.fixture
    def sample_image(self):
        """Create a sample image file for testing."""
        # Create a simple 100x100 red image
        img = Image.new('RGB', (100, 100), color='red')
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        img.save(temp_file.name, 'PNG')
        temp_file.close()
        yield temp_file.name
        # Cleanup
        os.unlink(temp_file.name)

    @pytest.fixture
    def temp_text_file(self):
        """Create a temporary text file for testing."""
        content = "This is a test text file.\nWith multiple lines.\nAnd various content."
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        temp_file.write(content)
        temp_file.close()
        yield temp_file.name
        # Cleanup
        os.unlink(temp_file.name)

    class TestSupportedFormats:
        """Test supported file format detection."""

        def test_supported_formats_list(self):
            """Test that all expected formats are supported."""
            parser = DocumentParser()
            expected_formats = {'.pdf', '.docx', '.png', '.jpg', '.jpeg'}
            assert set(parser.SUPPORTED_FORMATS.keys()) == expected_formats

        def test_format_method_mapping(self):
            """Test that each format maps to a valid method."""
            parser = DocumentParser()
            for ext, method_name in parser.SUPPORTED_FORMATS.items():
                assert hasattr(parser, method_name), f"Method {method_name} not found for {ext}"

    class TestFileValidation:
        """Test file validation and error handling."""

        def test_nonexistent_file(self):
            """Test error handling for nonexistent files."""
            parser = DocumentParser()
            with pytest.raises(FileNotFoundError, match="File not found"):
                parser.parse("/nonexistent/file.pdf")

        def test_unsupported_format(self, temp_text_file):
            """Test error handling for unsupported file formats."""
            parser = DocumentParser()
            with pytest.raises(ValueError, match="Unsupported file format"):
                parser.parse(temp_text_file)  # .txt is not supported

        @patch('src.parsers.document_parser.Path')
        def test_case_insensitive_extension(self, mock_path):
            """Test that file extensions are handled case-insensitively."""
            mock_path.return_value.exists.return_value = True
            mock_path.return_value.suffix = '.PDF'
            
            parser = DocumentParser()
            with patch.object(parser, 'parse_pdf') as mock_parse_pdf:
                mock_parse_pdf.return_value = "content"
                
                result = parser.parse("test.PDF")
                
                mock_parse_pdf.assert_called_once_with("test.PDF")
                assert result == "content"

    class TestPDFParsing:
        """Test PDF file parsing."""

        def setup_method(self):
            """Mock Path.exists and suffix for all tests in this class."""
            self.path_patcher = patch('src.parsers.document_parser.Path')
            self.mock_path = self.path_patcher.start()
            self.mock_path.return_value.exists.return_value = True
            self.mock_path.return_value.suffix = '.pdf'
            self.mock_path.return_value.name = 'test.pdf'

        def teardown_method(self):
            """Stop Path patcher."""
            self.path_patcher.stop()

        @patch('src.parsers.document_parser.PdfReader')
        def test_pdf_parsing_success(self, mock_pdf_reader, sample_pdf_content):
            """Test successful PDF parsing."""
            # Mock PDF reader and pages
            mock_page1 = Mock()
            mock_page1.extract_text.return_value = "Page 1 content."
            mock_page2 = Mock()
            mock_page2.extract_text.return_value = "Page 2 content."
            
            mock_reader = Mock()
            mock_reader.pages = [mock_page1, mock_page2]
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("test.pdf")
            
            assert "Page 1 content." in result
            assert "Page 2 content." in result
            assert result.count("\n\n") >= 1  # Pages separated by double newlines

        @patch('src.parsers.document_parser.PdfReader')
        def test_pdf_empty_pages(self, mock_pdf_reader):
            """Test PDF with empty pages."""
            mock_empty_page = Mock()
            mock_empty_page.extract_text.return_value = "   "  # Whitespace only
            mock_content_page = Mock()
            mock_content_page.extract_text.return_value = "Real content"
            
            mock_reader = Mock()
            mock_reader.pages = [mock_empty_page, mock_content_page]
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("test.pdf")
            
            assert "Real content" in result
            assert "   " not in result  # Empty page content should be filtered out

        @patch('src.parsers.document_parser.PdfReader')
        def test_pdf_single_page(self, mock_pdf_reader):
            """Test PDF with single page."""
            mock_page = Mock()
            mock_page.extract_text.return_value = "Single page content"
            
            mock_reader = Mock()
            mock_reader.pages = [mock_page]
            mock_reader.__len__ = Mock(return_value=1)
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("test.pdf")
            
            assert result == "Single page content"

        @patch('src.parsers.document_parser.PdfReader')
        def test_pdf_extraction_error(self, mock_pdf_reader):
            """Test PDF parsing error handling."""
            mock_pdf_reader.side_effect = Exception("PDF extraction failed")
            
            parser = DocumentParser()
            with pytest.raises(Exception, match="PDF extraction failed"):
                parser.parse("corrupt.pdf")

        def test_pdf_missing_dependency(self):
            """Test error when PyPDF2 is not installed."""
            with patch('src.parsers.document_parser.PdfReader', None):
                parser = DocumentParser()
                with pytest.raises(ImportError, match="PyPDF2 is required"):
                    parser.parse_pdf("test.pdf")

        @patch('src.parsers.document_parser.PdfReader')
        def test_pdf_large_document(self, mock_pdf_reader):
            """Test parsing large PDF with many pages."""
            # Create 100 mock pages
            pages = []
            for i in range(100):
                mock_page = Mock()
                mock_page.extract_text.return_value = f"Page {i+1} content"
                pages.append(mock_page)
            
            mock_reader = Mock()
            mock_reader.pages = pages
            mock_reader.__len__ = Mock(return_value=100)
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("large.pdf")
            
            assert "Page 1 content" in result
            assert "Page 100 content" in result
            assert result.count("Page") == 100

    class TestDOCXParsing:
        """Test DOCX file parsing."""

        def setup_method(self):
            """Mock Path.exists and suffix for all tests in this class."""
            self.path_patcher = patch('src.parsers.document_parser.Path')
            self.mock_path = self.path_patcher.start()
            self.mock_path.return_value.exists.return_value = True
            self.mock_path.return_value.suffix = '.docx'

        def teardown_method(self):
            """Stop Path patcher."""
            self.path_patcher.stop()

        @patch('src.parsers.document_parser.Document')
        def test_docx_parsing_success(self, mock_document_class, sample_docx_content):
            """Test successful DOCX parsing."""
            # Mock document and paragraphs
            mock_paragraphs = []
            for content in sample_docx_content:
                mock_para = Mock()
                mock_para.text = content
                mock_paragraphs.append(mock_para)
            
            mock_doc = Mock()
            mock_doc.paragraphs = mock_paragraphs
            mock_document_class.return_value = mock_doc
            
            parser = DocumentParser()
            result = parser.parse("test.docx")
            
            assert "Chapter 1: Introduction" in result
            assert "Chapter 2: Methods" in result
            assert result.count("\n\n") == len(sample_docx_content) - 1

        @patch('src.parsers.document_parser.Document')
        def test_docx_empty_paragraphs(self, mock_document_class):
            """Test DOCX with empty paragraphs."""
            mock_paragraphs = [
                Mock(text="First paragraph"),
                Mock(text="   "),  # Whitespace only
                Mock(text=""),      # Empty string
                Mock(text="Second paragraph")
            ]
            
            mock_doc = Mock()
            mock_doc.paragraphs = mock_paragraphs
            mock_document_class.return_value = mock_doc
            
            parser = DocumentParser()
            result = parser.parse("test.docx")
            
            assert "First paragraph" in result
            assert "Second paragraph" in result
            assert "   " not in result  # Empty paragraphs filtered out
            assert result.count("\n\n") == 1  # Only 2 real paragraphs

        @patch('src.parsers.document_parser.Document')
        def test_docx_extraction_error(self, mock_document_class):
            """Test DOCX parsing error handling."""
            mock_document_class.side_effect = Exception("DOCX extraction failed")
            
            parser = DocumentParser()
            with pytest.raises(Exception, match="DOCX extraction failed"):
                parser.parse("corrupt.docx")

        def test_docx_missing_dependency(self):
            """Test error when python-docx is not installed."""
            with patch('src.parsers.document_parser.Document', None):
                parser = DocumentParser()
                with pytest.raises(ImportError, match="python-docx is required"):
                    parser.parse_docx("test.docx")

        @patch('src.parsers.document_parser.Document')
        def test_docx_single_paragraph(self, mock_document_class):
            """Test DOCX with single paragraph."""
            mock_para = Mock()
            mock_para.text = "Single paragraph content"
            
            mock_doc = Mock()
            mock_doc.paragraphs = [mock_para]
            mock_document_class.return_value = mock_doc
            
            parser = DocumentParser()
            result = parser.parse("single.docx")
            
            assert result == "Single paragraph content"

    class TestImageParsing:
        """Test image file parsing."""

        def setup_method(self):
            """Mock Path.exists and suffix for all tests in this class."""
            self.path_patcher = patch('src.parsers.document_parser.Path')
            self.mock_path = self.path_patcher.start()
            self.mock_path.return_value.exists.return_value = True
            self.mock_path.return_value.suffix = '.png'

        def teardown_method(self):
            """Stop Path patcher."""
            self.path_patcher.stop()

        @patch('src.parsers.document_parser.Image')
        @patch('src.parsers.document_parser.Path')
        def test_image_parsing_success(self, mock_path, mock_image):
            """Test successful image parsing (placeholder)."""
            mock_path.return_value.name = "test.png"
            mock_path.return_value.suffix = ".png"
            
            mock_img = Mock()
            mock_img.size = (1920, 1080)
            mock_image.open.return_value = mock_img
            
            parser = DocumentParser()
            result = parser.parse("test.png")
            
            assert "[IMAGE:" in result
            assert "test.png" in result
            assert "1920x1080" in result
            assert "Gemini Vision" in result

        @patch('src.parsers.document_parser.Image')
        def test_image_different_sizes(self, mock_image):
            """Test images with different dimensions."""
            test_cases = [
                (100, 100, "square"),
                (1920, 1080, "landscape"),
                (1080, 1920, "portrait"),
                (50, 200, "tall"),
            ]
            
            for width, height, description in test_cases:
                mock_img = Mock()
                mock_img.size = (width, height)
                mock_image.open.return_value = mock_img
                
                parser = DocumentParser()
                result = parser.parse(f"test_{description}.png")
                
                assert f"{width}x{height}" in result

        @patch('src.parsers.document_parser.Image')
        def test_image_parsing_error(self, mock_image):
            """Test image parsing error handling."""
            mock_image.open.side_effect = Exception("Image corrupted")
            
            parser = DocumentParser()
            with pytest.raises(Exception, match="Image corrupted"):
                parser.parse("corrupt.png")

        def test_image_missing_dependency(self):
            """Test error when Pillow is not installed."""
            with patch('src.parsers.document_parser.Image', None):
                parser = DocumentParser()
                with pytest.raises(ImportError, match="Pillow is required"):
                    parser.parse_image("test.png")

    class TestMetadataExtraction:
        """Test metadata extraction functionality."""

        @patch('src.parsers.document_parser.PdfReader')
        @patch('src.parsers.document_parser.Path')
        def test_pdf_metadata_extraction(self, mock_path, mock_pdf_reader):
            """Test PDF metadata extraction."""
            # Mock path stats
            mock_path.return_value.name = "test.pdf"
            mock_path.return_value.suffix = ".pdf"
            mock_path.return_value.stat.return_value.st_size = 1024
            
            # Mock PDF reader with metadata
            mock_reader = Mock()
            mock_reader.pages = [Mock()]  # 1 page
            mock_reader.__len__ = Mock(return_value=1)
            mock_reader.metadata = {
                "/Title": "Test Document",
                "/Author": "Test Author",
                "/Subject": "Test Subject"
            }
            mock_pdf_reader.return_value = mock_reader
            
            metadata = DocumentParser.get_metadata("test.pdf")
            
            assert metadata["filename"] == "test.pdf"
            assert metadata["file_size"] == 1024
            assert metadata["extension"] == ".pdf"
            assert metadata["page_count"] == 1
            assert metadata["pdf_metadata"]["title"] == "Test Document"
            assert metadata["pdf_metadata"]["author"] == "Test Author"

        @patch('src.parsers.document_parser.PdfReader')
        @patch('src.parsers.document_parser.Path')
        def test_pdf_metadata_missing(self, mock_path, mock_pdf_reader):
            """Test PDF with missing metadata."""
            mock_path.return_value.name = "test.pdf"
            mock_path.return_value.suffix = ".pdf"
            mock_path.return_value.stat.return_value.st_size = 512
            
            mock_reader = Mock()
            mock_reader.pages = [Mock()]
            mock_reader.__len__ = Mock(return_value=1)
            mock_reader.metadata = None  # No metadata
            mock_pdf_reader.return_value = mock_reader
            
            metadata = DocumentParser.get_metadata("test.pdf")
            
            assert "pdf_metadata" not in metadata

        @patch('src.parsers.document_parser.PdfReader')
        @patch('src.parsers.document_parser.Path')
        def test_pdf_metadata_extraction_error(self, mock_path, mock_pdf_reader):
            """Test PDF metadata extraction error handling."""
            mock_path.return_value.name = "test.pdf"
            mock_path.return_value.suffix = ".pdf"
            mock_path.return_value.stat.return_value.st_size = 1024
            
            mock_reader = Mock()
            mock_reader.pages = [Mock()]
            mock_reader.__len__ = Mock(return_value=1)
            mock_reader.metadata = Mock()
            mock_reader.metadata.get.side_effect = Exception("Metadata error")
            mock_pdf_reader.return_value = mock_reader
            
            # Should not raise error, just log warning
            metadata = DocumentParser.get_metadata("test.pdf")
            
            assert metadata["filename"] == "test.pdf"
            assert "pdf_metadata" not in metadata

        @patch('src.parsers.document_parser.Path')
        def test_non_pdf_metadata(self, mock_path):
            """Test metadata extraction for non-PDF files."""
            mock_path.return_value.name = "test.docx"
            mock_path.return_value.suffix = ".docx"
            mock_path.return_value.stat.return_value.st_size = 2048
            
            metadata = DocumentParser.get_metadata("test.docx")
            
            assert metadata["filename"] == "test.docx"
            assert metadata["file_size"] == 2048
            assert metadata["extension"] == ".docx"
            assert "page_count" not in metadata
            assert "pdf_metadata" not in metadata

    class TestIntegration:
        """Integration tests combining multiple features."""

        def setup_method(self):
            """Mock Path.exists for all tests in this class."""
            self.path_patcher = patch('src.parsers.document_parser.Path')
            self.mock_path = self.path_patcher.start()
            
            # Simple mock that handles common extensions and names
            def mock_suffix_side_effect():
                if not self.mock_path.call_args: 
                    return '.pdf'
                filename = str(self.mock_path.call_args[0][0])
                if '.' in filename:
                    return '.' + filename.rsplit('.', 1)[1]
                return ''
            
            def mock_name_side_effect():
                if not self.mock_path.call_args: 
                    return 'test.pdf'
                return Path(str(self.mock_path.call_args[0][0])).name
            
            def mock_exists_side_effect():
                if not self.mock_path.call_args: 
                    return True
                filename = str(self.mock_path.call_args[0][0])
                if "nonexistent" in filename: 
                    return False
                return True

            p = self.mock_path.return_value
            p.exists.side_effect = mock_exists_side_effect
            type(p).suffix = property(lambda x: mock_suffix_side_effect())
            type(p).name = property(lambda x: mock_name_side_effect())
            p.stat.return_value.st_size = 1024

        def teardown_method(self):
            """Stop Path patcher."""
            self.path_patcher.stop()

        @patch('src.parsers.document_parser.PdfReader')
        def test_full_pdf_workflow(self, mock_pdf_reader):
            """Test complete PDF parsing workflow."""
            # Setup realistic PDF content
            pages = []
            for i in range(5):
                mock_page = Mock()
                mock_page.extract_text.return_value = f"Chapter {i+1} content"
                pages.append(mock_page)
            
            mock_reader = Mock()
            mock_reader.pages = pages
            mock_reader.__len__ = Mock(return_value=5)
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("textbook.pdf")
            
            # Verify content extraction
            assert "Chapter 1" in result
            assert "Chapter 5" in result
            
            # Verify metadata
            metadata = DocumentParser.get_metadata("textbook.pdf")
            assert metadata["page_count"] == 5

        @patch('src.parsers.document_parser.Image.open')
        def test_image_workflow_with_real_file(self, mock_image_open, sample_image):
            """Test image workflow with actual file handling."""
            mock_img = Mock()
            mock_img.size = (800, 600)
            mock_image_open.return_value = mock_img
            
            parser = DocumentParser()
            result = parser.parse(sample_image)
            
            assert "[IMAGE:" in result
            assert "800x600" in result
            assert Path(sample_image).name in result

        def test_error_recovery(self):
            """Test error recovery and graceful degradation."""
            parser = DocumentParser()
            
            # Test with various error conditions
            error_cases = [
                ("/nonexistent/file.pdf", FileNotFoundError),
                ("test.xyz", ValueError),  # Unsupported format
            ]
            
            for file_path, expected_error in error_cases:
                with pytest.raises(expected_error):
                    parser.parse(file_path)

    class TestPerformance:
        """Performance and efficiency tests."""

        def setup_method(self):
            """Mock Path.exists for all tests in this class."""
            self.path_patcher = patch('src.parsers.document_parser.Path')
            self.mock_path = self.path_patcher.start()
            self.mock_path.return_value.exists.return_value = True
            
            # Configure suffix mock
            def mock_suffix_side_effect():
                if not self.mock_path.call_args: 
                    return '.pdf'
                filename = self.mock_path.call_args[0][0]
                if str(filename).endswith('.pdf'): 
                    return '.pdf'
                if str(filename).endswith('.docx'): 
                    return '.docx'
                return '.pdf'
                
            type(self.mock_path.return_value).suffix = property(lambda x: mock_suffix_side_effect())

        def teardown_method(self):
            """Stop Path patcher."""
            self.path_patcher.stop()

        @patch('src.parsers.document_parser.PdfReader')
        def test_large_text_extraction(self, mock_pdf_reader):
            """Test handling of large text content."""
            # Create pages with large content
            large_content = "A" * 10000  # 10KB per page
            pages = []
            for i in range(10):  # 100KB total
                mock_page = Mock()
                mock_page.extract_text.return_value = f"Page {i+1}: {large_content}"
                pages.append(mock_page)
            
            mock_reader = Mock()
            mock_reader.pages = pages
            mock_reader.__len__ = Mock(return_value=10)
            mock_pdf_reader.return_value = mock_reader
            
            parser = DocumentParser()
            result = parser.parse("large.pdf")
            
            assert len(result) > 100000  # Should contain all content
            assert result.count("Page") == 10

        @patch('src.parsers.document_parser.Document')
        def test_many_docx_paragraphs(self, mock_document_class):
            """Test DOCX with many paragraphs."""
            # Create many paragraphs
            mock_paragraphs = []
            for i in range(1000):
                mock_para = Mock()
                mock_para.text = f"Paragraph {i+1} content"
                mock_paragraphs.append(mock_para)
            
            mock_doc = Mock()
            mock_doc.paragraphs = mock_paragraphs
            mock_document_class.return_value = mock_doc
            
            parser = DocumentParser()
            result = parser.parse("many_paragraphs.docx")
            
            assert result.count("Paragraph") == 1000
            assert result.count("\n\n") == 999
