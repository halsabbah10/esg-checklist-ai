"""
Security module for ESG Checklist AI.
Provides comprehensive security features including token management,
input validation, rate limiting, and security headers.
"""

# Initialize exports list
__all__ = []

# Import token management functions
try:
    from .tokens import (  # noqa: F401
        create_access_token,
        verify_token,
        revoke_token,
        is_token_revoked,
        get_token_blacklist_key,
    )

    __all__.extend(
        [
            "create_access_token",
            "verify_token",
            "revoke_token",
            "is_token_revoked",
            "get_token_blacklist_key",
        ]
    )
except ImportError:
    pass

# Import validation functions
try:
    from .validation import (  # noqa: F401
        validate_input,
        validate_file_upload,
        sanitize_input,
        InputValidationError,
        FileValidationError,
    )

    __all__.extend(
        [
            "validate_input",
            "validate_file_upload",
            "sanitize_input",
            "InputValidationError",
            "FileValidationError",
        ]
    )
except ImportError:
    pass

# Import middleware classes for re-export
try:
    from .rate_limiting import RateLimitMiddleware, create_rate_limit_middleware  # noqa: F401
    from .headers import (  # noqa: F401
        SecurityHeadersMiddleware,  # noqa: F401
        CORSSecurityMiddleware,  # noqa: F401
        create_security_headers_middleware,  # noqa: F401
        create_cors_security_middleware,  # noqa: F401
    )

    __all__.extend(
        [
            "RateLimitMiddleware",
            "SecurityHeadersMiddleware",
            "CORSSecurityMiddleware",
            "create_rate_limit_middleware",
            "create_security_headers_middleware",
            "create_cors_security_middleware",
        ]
    )
except ImportError:
    pass

# Import secrets management
try:
    from .secrets import get_secret  # noqa: F401

    __all__.extend(["get_secret"])
except ImportError:
    pass

# Import configuration
try:
    from .config import SecurityConfig  # noqa: F401

    __all__.extend(["SecurityConfig"])
except ImportError:
    pass

# Import auth functions from main auth module for re-export
try:
    from app.auth import (  # noqa: F401
        get_current_user,
        require_role,
        hash_password,
        verify_password,
        UserRoles,
    )

    __all__.extend(
        [
            "get_current_user",
            "require_role",
            "hash_password",
            "verify_password",
            "UserRoles",
        ]
    )
except ImportError:
    pass
