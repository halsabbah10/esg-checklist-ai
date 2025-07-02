"""
Security configuration and setup guide for ESG Checklist AI.
This file documents the security hardening implementation and setup instructions.
"""

import os
from typing import Dict, Any


class SecurityConfig:
    """
    Centralized security configuration.
    """

    # Token configuration
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    )  # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")
    )  # 30 days

    # Password security
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_DIGITS = True
    PASSWORD_REQUIRE_SPECIAL = True

    # Rate limiting (requests per window)
    RATE_LIMITS = {
        "login": {"requests": 5, "window": 60},  # 5 per minute
        "register": {"requests": 3, "window": 300},  # 3 per 5 minutes
        "password_reset": {"requests": 3, "window": 300},  # 3 per 5 minutes
        "ai_scoring": {"requests": 10, "window": 60},  # 10 per minute
        "file_upload": {"requests": 20, "window": 300},  # 20 per 5 minutes
        "admin": {"requests": 100, "window": 60},  # 100 per minute
        "default": {"requests": 60, "window": 60},  # 60 per minute
    }

    # File upload security
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "image/jpeg",
        "image/png",
    ]

    # Security headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    }

    # HSTS for production
    @staticmethod
    def get_hsts_header() -> str:
        if os.getenv("ENVIRONMENT") == "production":
            return "max-age=31536000; includeSubDomains; preload"
        return ""

    # CSP policy
    @staticmethod
    def get_csp_policy() -> str:
        if os.getenv("ENVIRONMENT") == "production":
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            return (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "img-src 'self' data: https: http:; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none'"
            )


# Environment variables required for security
REQUIRED_ENV_VARS = [
    "SECRET_KEY",  # JWT signing key
    "DATABASE_URL",  # Database connection
]

OPTIONAL_ENV_VARS = [
    "REFRESH_SECRET_KEY",  # Refresh token signing key (defaults to SECRET_KEY + "_refresh")
    "REDIS_URL",  # Redis for rate limiting and token blacklist
    "AWS_REGION",  # AWS region for Secrets Manager
    "AWS_ACCESS_KEY_ID",  # AWS credentials
    "AWS_SECRET_ACCESS_KEY",  # AWS credentials
    "AZURE_KEY_VAULT_URL",  # Azure Key Vault URL
    "ALLOWED_ORIGINS",  # CORS origins
    "ALLOWED_HOSTS",  # Trusted hosts
    "ACCESS_TOKEN_EXPIRE_MINUTES",  # Token expiration
    "REFRESH_TOKEN_EXPIRE_DAYS",  # Refresh token expiration
]


def validate_security_config() -> Dict[str, Any]:
    """
    Validate security configuration and return status.
    """
    status: Dict[str, Any] = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "recommendations": [],
    }

    # Check required environment variables
    for var in REQUIRED_ENV_VARS:
        if not os.getenv(var):
            status["valid"] = False
            status["errors"].append(f"Required environment variable {var} is missing")

    # Check secret key strength
    secret_key = os.getenv("SECRET_KEY", "")
    if len(secret_key) < 32:
        status["warnings"].append("SECRET_KEY should be at least 32 characters long")

    # Check environment
    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        # Production-specific checks
        if not os.getenv("REDIS_URL"):
            status["warnings"].append(
                "Redis not configured - using in-memory fallback for rate limiting"
            )

        if not os.getenv("AWS_REGION") and not os.getenv("AZURE_KEY_VAULT_URL"):
            status["warnings"].append(
                "No cloud secrets manager configured - using environment variables"
            )

        if not os.getenv("ALLOWED_ORIGINS"):
            status["warnings"].append("ALLOWED_ORIGINS not specified - using defaults")

    # Security recommendations
    status["recommendations"].extend(
        [
            "Use a secrets manager (AWS Secrets Manager or Azure Key Vault) in production",
            "Enable Redis for distributed rate limiting and token blacklisting",
            "Configure proper CORS origins for your frontend",
            "Use HTTPS in production (required for HSTS)",
            "Regular security audits and dependency updates",
            "Monitor failed authentication attempts",
            "Implement proper logging and monitoring",
        ]
    )

    return status


# Security checklist for deployment
SECURITY_CHECKLIST = [
    "✅ Strong SECRET_KEY (32+ characters)",
    "✅ Short-lived access tokens (15 minutes)",
    "✅ Long-lived refresh tokens (30 days)",
    "✅ Token blacklisting/revocation",
    "✅ Rate limiting on auth endpoints",
    "✅ Password strength validation",
    "✅ File upload validation",
    "✅ MIME type checking",
    "✅ Security headers (HSTS, CSP, etc.)",
    "✅ CORS configuration",
    "✅ Input validation and sanitization",
    "✅ Role-based access control",
    "✅ Audit logging",
    "⚠️ Secrets manager (recommended for production)",
    "⚠️ Redis for distributed caching (recommended)",
    "⚠️ WAF/DDoS protection (infrastructure level)",
    "⚠️ SSL/TLS certificates (infrastructure level)",
]
