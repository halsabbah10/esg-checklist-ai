"""
Security headers and CORS middleware for the ESG Checklist AI application.
Implements OWASP security recommendations and environment-specific configurations.
"""

import logging
from typing import Dict, List, Optional
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    Implements OWASP recommendations for security headers.
    """

    def __init__(
        self,
        app: ASGIApp,
        environment: str = "production",
        custom_headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(app)
        self.environment = environment.lower()
        self.custom_headers = custom_headers or {}
        self.security_headers = self._get_security_headers()

    def _get_security_headers(self) -> Dict[str, str]:
        """Get security headers based on environment."""
        headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            # XSS protection (legacy but still useful)
            "X-XSS-Protection": "1; mode=block",
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            # Permissions policy (replace Feature-Policy)
            "Permissions-Policy": (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "accelerometer=(), ambient-light-sensor=()"
            ),
            # Cache control for sensitive responses
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",
        }

        # Environment-specific headers
        if self.environment == "production":
            # Strict HSTS for production
            headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

            # Strict CSP for production
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        elif self.environment == "development":
            # More permissive for development
            headers["Content-Security-Policy"] = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "connect-src 'self' ws: wss: http: https:; "
                "img-src 'self' data: http: https:; "
                "frame-ancestors 'none'"
            )

        else:  # staging or other environments
            # Moderate security for staging
            headers["Strict-Transport-Security"] = "max-age=86400; includeSubDomains"
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'"
            )

        # Add custom headers
        headers.update(self.custom_headers)

        return headers

    async def dispatch(self, request: Request, call_next) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # Add security headers
        for header_name, header_value in self.security_headers.items():
            response.headers[header_name] = header_value

        # Remove server header to avoid information disclosure
        if "server" in response.headers:
            del response.headers["server"]

        return response


class CORSSecurityMiddleware:
    """
    Enhanced CORS middleware with security-focused configuration.
    Provides environment-specific CORS policies.
    """

    def __init__(
        self,
        environment: str = "production",
        allowed_origins: Optional[List[str]] = None,
        allowed_origins_regex: Optional[str] = None,
        allow_credentials: bool = True,
        allowed_methods: Optional[List[str]] = None,
        allowed_headers: Optional[List[str]] = None,
        expose_headers: Optional[List[str]] = None,
        max_age: int = 600,
    ):
        self.environment = environment.lower()
        self.allow_credentials = allow_credentials
        self.max_age = max_age

        # Set defaults based on environment
        if self.environment == "production":
            self.allowed_origins = allowed_origins or []
            self.allowed_origins_regex = allowed_origins_regex
        elif self.environment == "development":
            self.allowed_origins = allowed_origins or [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
            ]
            self.allowed_origins_regex = allowed_origins_regex
        else:  # staging
            self.allowed_origins = allowed_origins or []
            self.allowed_origins_regex = allowed_origins_regex

        self.allowed_methods = allowed_methods or [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
            "OPTIONS",
        ]

        self.allowed_headers = allowed_headers or [
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
        ]

        self.expose_headers = expose_headers or [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ]

    def get_cors_middleware_config(self) -> Dict:
        """Get CORS middleware configuration."""
        config = {
            "allow_origins": self.allowed_origins,
            "allow_credentials": self.allow_credentials,
            "allow_methods": self.allowed_methods,
            "allow_headers": self.allowed_headers,
            "expose_headers": self.expose_headers,
            "max_age": self.max_age,
        }

        # Add regex origins if specified
        if self.allowed_origins_regex:
            config["allow_origin_regex"] = self.allowed_origins_regex

        return config


def create_security_headers_middleware(
    app: ASGIApp,
    environment: str = "production",
    custom_headers: Optional[Dict[str, str]] = None,
) -> SecurityHeadersMiddleware:
    """Factory function to create security headers middleware."""
    return SecurityHeadersMiddleware(
        app=app, environment=environment, custom_headers=custom_headers
    )


def create_cors_security_middleware(
    app: ASGIApp, environment: str = "production", **kwargs
) -> CORSMiddleware:
    """Factory function to create CORS security middleware."""
    cors_config = CORSSecurityMiddleware(environment=environment, **kwargs)
    config = cors_config.get_cors_middleware_config()
    return CORSMiddleware(app=app, **config)


# Security header validation
def validate_security_headers(response: Response) -> Dict[str, bool]:
    """
    Validate that security headers are present in response.
    Returns a dict of header names and whether they're present.
    """
    required_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Content-Security-Policy",
    ]

    validation_results = {}
    for header in required_headers:
        validation_results[header] = header in response.headers

    return validation_results


def get_recommended_csp_for_environment(environment: str) -> str:
    """Get recommended Content Security Policy for environment."""
    if environment.lower() == "production":
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    elif environment.lower() == "development":
        return (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "connect-src 'self' ws: wss: http: https:; "
            "img-src 'self' data: http: https:; "
            "frame-ancestors 'none'"
        )
    else:  # staging
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'"
        )
