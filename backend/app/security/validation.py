"""Input validation and sanitization utilities."""

import re
import html
import bleach
from typing import Any, List, Optional, Union
from pathlib import Path

# Optional import for file type detection
try:
    import magic  # noqa: F401 - Used conditionally in validate_file_upload

    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False


class InputValidationError(Exception):
    """Exception raised when input validation fails."""

    pass


class FileValidationError(Exception):
    """Exception raised when file validation fails."""

    pass


def sanitize_input(input_str: str, allowed_tags: Optional[List[str]] = None) -> str:
    """
    Sanitize input string by removing potentially dangerous content.

    Args:
        input_str: The input string to sanitize
        allowed_tags: List of allowed HTML tags (defaults to none)

    Returns:
        Sanitized string
    """
    if not isinstance(input_str, str):
        raise InputValidationError("Input must be a string")

    # HTML encode the input
    sanitized = html.escape(input_str)

    # If HTML tags are allowed, use bleach for more sophisticated cleaning
    if allowed_tags:
        sanitized = bleach.clean(input_str, tags=allowed_tags, strip=True)

    return sanitized


def validate_input(value: Any, input_type: str, **kwargs) -> bool:
    """
    Validate input based on type and additional constraints.

    Args:
        value: The value to validate
        input_type: Type of validation ('email', 'username', 'password', etc.)
        **kwargs: Additional validation parameters

    Returns:
        True if validation passes

    Raises:
        InputValidationError: If validation fails
    """
    if value is None:
        raise InputValidationError("Value cannot be None")

    if input_type == "email":
        return _validate_email(str(value))
    elif input_type == "username":
        return _validate_username(str(value), **kwargs)
    elif input_type == "password":
        return _validate_password(str(value), **kwargs)
    elif input_type == "phone":
        return _validate_phone(str(value))
    elif input_type == "url":
        return _validate_url(str(value))
    elif input_type == "alphanumeric":
        return _validate_alphanumeric(str(value), **kwargs)
    else:
        raise InputValidationError(f"Unknown input type: {input_type}")


def _validate_email(email: str) -> bool:
    """Validate email format."""
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        raise InputValidationError("Invalid email format")
    return True


def _validate_username(
    username: str, min_length: int = 3, max_length: int = 50
) -> bool:
    """Validate username format and length."""
    if len(username) < min_length:
        raise InputValidationError(f"Username must be at least {min_length} characters")
    if len(username) > max_length:
        raise InputValidationError(f"Username must be at most {max_length} characters")

    # Only allow alphanumeric characters, underscores, and hyphens
    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        raise InputValidationError(
            "Username can only contain letters, numbers, underscores, and hyphens"
        )
    return True


def _validate_password(
    password: str, min_length: int = 8, require_special: bool = True
) -> bool:
    """Validate password strength."""
    if len(password) < min_length:
        raise InputValidationError(f"Password must be at least {min_length} characters")

    if require_special:
        if not re.search(r"[A-Z]", password):
            raise InputValidationError(
                "Password must contain at least one uppercase letter"
            )
        if not re.search(r"[a-z]", password):
            raise InputValidationError(
                "Password must contain at least one lowercase letter"
            )
        if not re.search(r"[0-9]", password):
            raise InputValidationError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise InputValidationError(
                "Password must contain at least one special character"
            )

    return True


def _validate_phone(phone: str) -> bool:
    """Validate phone number format."""
    # Allow international format with optional + and various separators
    phone_pattern = r"^\+?[\d\s\-\(\)]+$"
    if not re.match(phone_pattern, phone):
        raise InputValidationError("Invalid phone number format")
    return True


def _validate_url(url: str) -> bool:
    """Validate URL format."""
    url_pattern = r"^https?://[^\s/$.?#].[^\s]*$"
    if not re.match(url_pattern, url):
        raise InputValidationError("Invalid URL format")
    return True


def _validate_alphanumeric(value: str, allow_spaces: bool = False) -> bool:
    """Validate that value contains only alphanumeric characters."""
    pattern = r"^[a-zA-Z0-9\s]+$" if allow_spaces else r"^[a-zA-Z0-9]+$"
    if not re.match(pattern, value):
        raise InputValidationError("Value must contain only alphanumeric characters")
    return True


def validate_file_upload(
    file_path: Union[str, Path],
    allowed_extensions: List[str],
    max_size_mb: int = 10,
    allowed_mime_types: Optional[List[str]] = None,
) -> bool:
    """
    Validate uploaded file based on extension, size, and MIME type.

    Args:
        file_path: Path to the uploaded file
        allowed_extensions: List of allowed file extensions (e.g., ['.pdf', '.docx'])
        max_size_mb: Maximum file size in megabytes
        allowed_mime_types: List of allowed MIME types

    Returns:
        True if validation passes

    Raises:
        FileValidationError: If validation fails
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileValidationError("File does not exist")

    # Check file extension
    file_extension = file_path.suffix.lower()
    if file_extension not in [ext.lower() for ext in allowed_extensions]:
        raise FileValidationError(f"File extension {file_extension} not allowed")

    # Check file size
    file_size_mb = file_path.stat().st_size / (1024 * 1024)
    if file_size_mb > max_size_mb:
        raise FileValidationError(
            f"File size {file_size_mb:.2f}MB exceeds limit of {max_size_mb}MB"
        )

    # Check MIME type using python-magic if available
    if allowed_mime_types:
        if not HAS_MAGIC:
            raise FileValidationError(
                "MIME type validation requested but python-magic not available"
            )

        try:
            # Re-import magic here to satisfy type checker
            import magic  # type: ignore

            mime_type = magic.from_file(str(file_path), mime=True)
            if mime_type not in allowed_mime_types:
                raise FileValidationError(f"MIME type {mime_type} not allowed")
        except Exception as e:
            raise FileValidationError(f"Could not determine file MIME type: {e}")

    return True
