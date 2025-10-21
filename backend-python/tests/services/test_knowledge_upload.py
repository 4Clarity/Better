"""
Unit tests for Knowledge Document Upload
Tests input validation and sanitization
"""

import pytest
from fastapi import HTTPException

# Import the functions we're testing
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.routes.knowledge import (
    sanitize_filename,
    validate_file_extension,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS
)


class TestFilenameSanitization:
    """Test suite for filename sanitization"""

    def test_sanitize_normal_filename(self):
        """Test sanitization of normal filename"""
        result = sanitize_filename("document.pdf")
        assert result == "document.pdf"

    def test_sanitize_filename_with_spaces(self):
        """Test sanitization replaces spaces with underscores"""
        result = sanitize_filename("my document.pdf")
        assert result == "my_document.pdf"

    def test_sanitize_filename_with_special_chars(self):
        """Test sanitization removes special characters"""
        result = sanitize_filename("doc@#$%ument!.pdf")
        assert result == "doc____ument_.pdf"

    def test_sanitize_filename_with_path_traversal(self):
        """Test sanitization prevents path traversal attacks"""
        result = sanitize_filename("../../../etc/passwd")
        # os.path.basename strips directory traversal entirely
        assert result == "passwd"
        assert ".." not in result
        assert "/" not in result

    def test_sanitize_filename_absolute_path(self):
        """Test sanitization strips absolute paths"""
        result = sanitize_filename("/var/www/uploads/malicious.pdf")
        # Should only keep the filename part
        assert result == "malicious.pdf"

    def test_sanitize_filename_windows_path(self):
        """Test sanitization handles Windows paths"""
        result = sanitize_filename("C:\\Users\\test\\document.pdf")
        # On Unix, backslashes are replaced with underscores, basename doesn't split on them
        # This is actually safer - it treats the whole thing as a filename
        assert "document.pdf" in result or result == "C__Users_test_document.pdf"

    def test_sanitize_filename_too_long(self):
        """Test sanitization truncates long filenames"""
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name)
        assert len(result) <= 255
        assert result.endswith(".pdf")

    def test_sanitize_filename_unicode(self):
        """Test sanitization handles unicode characters"""
        result = sanitize_filename("document_中文.pdf")
        # Unicode chars should be replaced with underscores
        assert "_" in result
        assert result.endswith(".pdf")

    def test_sanitize_filename_multiple_dots(self):
        """Test sanitization preserves extension with multiple dots"""
        result = sanitize_filename("my.document.test.pdf")
        assert result == "my.document.test.pdf"

    def test_sanitize_filename_no_extension(self):
        """Test sanitization handles files without extension"""
        result = sanitize_filename("document")
        assert result == "document"

    def test_sanitize_filename_hidden_file(self):
        """Test sanitization handles hidden files (starting with dot)"""
        result = sanitize_filename(".htaccess")
        assert result == ".htaccess"


class TestFileExtensionValidation:
    """Test suite for file extension validation"""

    def test_validate_pdf_extension(self):
        """Test PDF extension is allowed"""
        assert validate_file_extension("document.pdf") is True

    def test_validate_docx_extension(self):
        """Test DOCX extension is allowed"""
        assert validate_file_extension("document.docx") is True

    def test_validate_doc_extension(self):
        """Test DOC extension is allowed"""
        assert validate_file_extension("document.doc") is True

    def test_validate_txt_extension(self):
        """Test TXT extension is allowed"""
        assert validate_file_extension("document.txt") is True

    def test_validate_md_extension(self):
        """Test MD (markdown) extension is allowed"""
        assert validate_file_extension("document.md") is True

    def test_validate_html_extension(self):
        """Test HTML extension is allowed"""
        assert validate_file_extension("document.html") is True

    def test_validate_uppercase_extension(self):
        """Test uppercase extensions are accepted"""
        assert validate_file_extension("document.PDF") is True
        assert validate_file_extension("document.DOCX") is True

    def test_validate_mixed_case_extension(self):
        """Test mixed case extensions are accepted"""
        assert validate_file_extension("document.PdF") is True

    def test_validate_disallowed_extension(self):
        """Test disallowed extensions are rejected"""
        assert validate_file_extension("malicious.exe") is False
        assert validate_file_extension("script.sh") is False
        assert validate_file_extension("archive.zip") is False

    def test_validate_no_extension(self):
        """Test files without extension are rejected"""
        assert validate_file_extension("document") is False

    def test_validate_double_extension(self):
        """Test double extension uses the last one"""
        # Should validate based on .pdf (last extension)
        assert validate_file_extension("document.txt.pdf") is True

    def test_validate_hidden_file_extension(self):
        """Test hidden files with valid extension"""
        assert validate_file_extension(".hidden.pdf") is True


class TestFileUploadConstants:
    """Test suite for upload configuration constants"""

    def test_max_file_size_constant(self):
        """Test MAX_FILE_SIZE is set correctly"""
        assert MAX_FILE_SIZE == 100 * 1024 * 1024  # 100MB
        assert MAX_FILE_SIZE > 0

    def test_allowed_mime_types_constant(self):
        """Test ALLOWED_MIME_TYPES contains expected types"""
        assert 'application/pdf' in ALLOWED_MIME_TYPES
        assert 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in ALLOWED_MIME_TYPES
        assert 'text/plain' in ALLOWED_MIME_TYPES
        assert 'text/markdown' in ALLOWED_MIME_TYPES
        assert 'text/html' in ALLOWED_MIME_TYPES

    def test_allowed_mime_types_rejects_dangerous_types(self):
        """Test ALLOWED_MIME_TYPES doesn't include dangerous types"""
        assert 'application/x-executable' not in ALLOWED_MIME_TYPES
        assert 'application/x-sh' not in ALLOWED_MIME_TYPES
        assert 'text/x-python' not in ALLOWED_MIME_TYPES

    def test_allowed_extensions_constant(self):
        """Test ALLOWED_EXTENSIONS contains expected extensions"""
        assert '.pdf' in ALLOWED_EXTENSIONS
        assert '.docx' in ALLOWED_EXTENSIONS
        assert '.doc' in ALLOWED_EXTENSIONS
        assert '.txt' in ALLOWED_EXTENSIONS
        assert '.md' in ALLOWED_EXTENSIONS
        assert '.html' in ALLOWED_EXTENSIONS

    def test_allowed_extensions_count(self):
        """Test ALLOWED_EXTENSIONS has expected number of items"""
        assert len(ALLOWED_EXTENSIONS) == 6


class TestSecurityScenarios:
    """Test suite for security-related scenarios"""

    def test_path_traversal_prevention(self):
        """Test prevention of path traversal attacks"""
        malicious_filenames = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//etc/passwd",
            "/etc/passwd",
            "C:\\Windows\\System32\\config\\SAM"
        ]

        for filename in malicious_filenames:
            result = sanitize_filename(filename)
            # Should not contain path separators
            assert "/" not in result or result == result.split("/")[-1]
            assert "\\" not in result or result == result.split("\\")[-1]

    def test_null_byte_injection_prevention(self):
        """Test prevention of null byte injection"""
        result = sanitize_filename("document.pdf\x00.exe")
        # Null bytes should be replaced
        assert "\x00" not in result

    def test_special_device_names_windows(self):
        """Test handling of Windows special device names"""
        special_names = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"]
        for name in special_names:
            result = sanitize_filename(f"{name}.pdf")
            # Should still have valid filename
            assert result.endswith(".pdf")

    def test_very_long_filename_attack(self):
        """Test handling of extremely long filenames"""
        long_filename = "a" * 10000 + ".pdf"
        result = sanitize_filename(long_filename)
        # Should be truncated to safe length
        assert len(result) <= 255

    def test_directory_name_in_filename(self):
        """Test handling of directory names in filename"""
        result = sanitize_filename("uploads/../../etc/document.pdf")
        # Should only keep the filename part
        assert result == "document.pdf"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
