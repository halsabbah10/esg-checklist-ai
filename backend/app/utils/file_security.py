"""
Secure file upload utilities for ESG Checklist AI
"""

import pathlib
import re
import uuid
from datetime import datetime
from typing import Dict, Optional, Set

from fastapi import HTTPException, UploadFile, status
from werkzeug.utils import secure_filename

from ..config import get_settings

# Get centralized settings
settings = get_settings()

# MIME type mappings for validation
ALLOWED_MIME_TYPES: Dict[str, Set[str]] = {
    "pdf": {"application/pdf"},
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",  # Common fallback for Office files
    },
    "xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",  # Common fallback for Office files
        "application/vnd.ms-excel",  # Alternative Excel MIME type
    },
    "csv": {"text/csv", "application/csv", "text/plain"},
    "txt": {"text/plain", "application/octet-stream"},
}

# Security patterns
FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]+$")
MAX_FILENAME_LENGTH = 255


def get_allowed_extensions() -> Set[str]:
    """Get allowed file extensions from settings"""
    extensions_str = settings.allowed_file_extensions
    return {ext.strip().lstrip(".").lower() for ext in extensions_str.split(",")}


def get_max_file_size() -> int:
    """Get maximum file size in bytes from settings"""
    return settings.max_file_size_mb * 1024 * 1024


def validate_filename(filename: str) -> str:
    """
    Validate and sanitize filename

    Args:
        filename: Original filename

    Returns:
        Sanitized filename

    Raises:
        HTTPException: If filename is invalid
    """
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Filename cannot be empty"
        )

    if len(filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filename too long. Maximum length: {MAX_FILENAME_LENGTH} characters",
        )

    # Use werkzeug's secure_filename for sanitization
    secure_name = secure_filename(filename)
    if not secure_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid filename. Use only alphanumeric characters, dots, hyphens, and underscores"
            ),
        )

    return secure_name


def validate_file_extension(filename: str) -> str:
    """
    Validate file extension against allow-list

    Args:
        filename: Filename to validate

    Returns:
        File extension (lowercase)

    Raises:
        HTTPException: If extension is not allowed
    """
    path = pathlib.Path(filename)
    extension = path.suffix.lstrip(".").lower()

    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File must have an extension"
        )

    allowed_extensions = get_allowed_extensions()
    if extension not in allowed_extensions:
        allowed_list = ", ".join(f".{ext}" for ext in sorted(allowed_extensions))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '.{extension}' not allowed. Allowed: {allowed_list}",
        )

    return extension


def validate_mime_type(
    file_content: bytes, extension: str, content_type: Optional[str] = None
) -> None:
    """
    Validate MIME type matches file extension

    Args:
        file_content: First few bytes of file content
        extension: File extension
        content_type: Declared content type from upload

    Raises:
        HTTPException: If MIME type doesn't match extension
    """
    # Get expected MIME types for this extension
    expected_types = ALLOWED_MIME_TYPES.get(extension, set())

    if not expected_types:
        # Extension validation should have caught this, but double-check
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension: .{extension}",
        )

    # Validate declared content type if provided
    if content_type and content_type not in expected_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{content_type}' does not match file extension '.{extension}'",
        )

    # Validate actual file content (basic magic number check)
    if extension == "pdf" and not file_content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File content does not match PDF format"
        )
    if extension == "docx" and not file_content.startswith(b"PK"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match DOCX format",
        )
    if extension == "xlsx" and not file_content.startswith(b"PK"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match XLSX format",
        )


def validate_file_size(file_size: int) -> None:
    """
    Validate file size against maximum limit

    Args:
        file_size: Size of file in bytes

    Raises:
        HTTPException: If file is too large
    """
    max_size = get_max_file_size()

    if file_size > max_size:
        max_mb = settings.max_file_size_mb
        actual_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({actual_mb:.1f}MB). Maximum allowed: {max_mb}MB",
        )


async def validate_upload_file(file: UploadFile) -> tuple[str, str]:
    """
    Comprehensive validation of uploaded file

    Args:
        file: FastAPI UploadFile object

    Returns:
        Tuple of (sanitized_filename, file_extension)

    Raises:
        HTTPException: If file validation fails
    """
    # Validate filename exists
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a filename"
        )

    # Sanitize and validate filename
    secure_name = validate_filename(file.filename)

    # Validate file extension
    extension = validate_file_extension(secure_name)

    # Read file content for validation
    content = await file.read()
    file_size = len(content)

    # Reset file pointer for later use
    await file.seek(0)

    # Validate file size
    validate_file_size(file_size)

    # Validate MIME type
    validate_mime_type(content, extension, file.content_type)

    return secure_name, extension


def generate_secure_filepath(filename: str, user_id: int, checklist_id: int) -> pathlib.Path:
    """
    Generate a secure file path with sanitized components

    Args:
        filename: Sanitized filename
        user_id: User ID
        checklist_id: Checklist ID

    Returns:
        Secure file path
    """
    # Get upload directory from settings
    upload_dir = pathlib.Path(settings.upload_path)

    # Create timestamp-based subdirectory for organization
    date_subdir = datetime.now().strftime("%Y/%m")

    # Create full directory path
    full_dir = upload_dir / date_subdir

    # Generate secure filename with user and checklist context
    path = pathlib.Path(filename)
    stem = path.stem
    suffix = path.suffix

    # Create unique filename to prevent conflicts
    unique_id = str(uuid.uuid4())[:8]
    secure_filename = f"{user_id}_{checklist_id}_{unique_id}_{stem}{suffix}"

    return full_dir / secure_filename
