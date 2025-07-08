"""
Rate limiting configuration for ESG Checklist AI API endpoints
Implements various rate limits based on endpoint sensitivity and user roles
"""

import logging
from typing import Any, Callable

from fastapi import HTTPException, Request, status  # type: ignore[import-untyped]
from slowapi import Limiter  # type: ignore[import-untyped]
from slowapi.errors import RateLimitExceeded  # type: ignore[import-untyped]
from slowapi.util import get_remote_address  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

# Create limiter instance with IP-based identification
limiter = Limiter(
    key_func=get_remote_address, default_limits=["1000/hour"]  # Default fallback limit
)

# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    # Authentication endpoints - stricter limits to prevent brute force
    "auth_login": "5/minute",
    "auth_register": "3/minute",
    "auth_logout": "10/minute",
    # File upload endpoints - moderate limits due to processing overhead
    "file_upload": "20/minute",
    "file_process": "10/minute",
    # Search endpoints - moderate limits to prevent abuse
    "search_general": "60/minute",
    "search_advanced": "30/minute",
    # AI processing endpoints - stricter limits due to computational cost
    "ai_analysis": "10/minute",
    "ai_scoring": "15/minute",
    # Data export endpoints - moderate limits due to processing overhead
    "export_data": "20/minute",
    "export_reports": "10/minute",
    # Admin operations - moderate limits for management tasks
    "admin_users": "30/minute",
    "admin_config": "20/minute",
    # General API endpoints - generous limits for normal operations
    "api_read": "300/minute",
    "api_write": "100/minute",
    # Real-time analytics - higher limits for dashboard updates
    "analytics_realtime": "120/minute",
    "analytics_dashboard": "60/minute",
}


def get_rate_limit(endpoint_type: str) -> str:
    """Get rate limit string for specific endpoint type"""
    return RATE_LIMITS.get(endpoint_type, "100/minute")


def create_rate_limiter(endpoint_type: str):
    """Create a rate limiter decorator for specific endpoint type"""
    limit = get_rate_limit(endpoint_type)

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        return limiter.limit(limit)(func)

    return decorator


# Enhanced rate limit exceeded handler with logging
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors with enhanced logging"""
    client_ip = get_remote_address(request)
    endpoint = request.url.path

    # Log rate limit violation for monitoring
    logger.warning(
        f"Rate limit exceeded for IP {client_ip} on endpoint {endpoint}. Limit: {exc.detail}"
    )

    # Return structured error response
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Limit: {exc.detail}",
            "retry_after": "60 seconds",
            "endpoint": endpoint,
        },
        headers={"Retry-After": "60"},
    )


# User-based rate limiting (for authenticated requests)
def get_user_key(request: Request) -> str:
    """Get user-specific key for rate limiting authenticated requests"""
    try:
        # Try to get user info from request state if available
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"
    except Exception as e:
        logger.warning(f"Exception in get_user_key: {e}")
    # Fallback to IP-based limiting
    return get_remote_address(request)


# Create user-based limiter for authenticated endpoints
user_limiter = Limiter(
    key_func=get_user_key, default_limits=["2000/hour"]  # More generous for authenticated users
)


def create_user_rate_limiter(endpoint_type: str):
    """Create a user-based rate limiter for authenticated endpoints"""
    limit = get_rate_limit(endpoint_type)

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        return user_limiter.limit(limit)(func)

    return decorator


# Specific decorators for common use cases
auth_rate_limit = create_rate_limiter("auth_login")
file_upload_rate_limit = create_rate_limiter("file_upload")
search_rate_limit = create_rate_limiter("search_general")
ai_rate_limit = create_rate_limiter("ai_analysis")
export_rate_limit = create_rate_limiter("export_data")
admin_rate_limit = create_rate_limiter("admin_users")
api_read_rate_limit = create_rate_limiter("api_read")
api_write_rate_limit = create_rate_limiter("api_write")

# User-based decorators for authenticated endpoints
user_api_read_rate_limit = create_user_rate_limiter("api_read")
user_api_write_rate_limit = create_user_rate_limiter("api_write")
user_search_rate_limit = create_user_rate_limiter("search_general")
