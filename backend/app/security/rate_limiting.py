"""
Rate limiting middleware for the ESG Checklist AI application.
Provides configurable rate limiting with Redis and in-memory fallback.
"""

import time
import logging
from typing import Dict, Optional, Callable, Any, Union
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Try to import Redis, fall back to in-memory if not available
try:
    import redis  # type: ignore

    REDIS_AVAILABLE = True
except ImportError:
    redis = None  # type: ignore
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class InMemoryStore:
    """In-memory rate limit store as fallback when Redis is not available."""

    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._cleanup_interval = 300  # 5 minutes
        self._last_cleanup = time.time()

    def _cleanup_expired(self) -> None:
        """Remove expired entries from memory store."""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return

        expired_keys = []
        for key, data in self._store.items():
            if current_time >= data.get("reset_time", 0):
                expired_keys.append(key)

        for key in expired_keys:
            del self._store[key]

        self._last_cleanup = current_time

    def get_rate_limit_info(self, key: str, window_seconds: int) -> Dict[str, Any]:
        """Get current rate limit info for a key."""
        self._cleanup_expired()
        current_time = time.time()

        if key not in self._store:
            self._store[key] = {"count": 0, "reset_time": current_time + window_seconds}

        data = self._store[key]

        # Reset if window has expired
        if current_time >= data["reset_time"]:
            data["count"] = 0
            data["reset_time"] = current_time + window_seconds

        return {
            "count": data["count"],
            "reset_time": data["reset_time"],
            "remaining_time": max(0, int(data["reset_time"] - current_time)),
        }

    def increment(self, key: str) -> int:
        """Increment counter for a key and return new count."""
        if key in self._store:
            self._store[key]["count"] += 1
            return self._store[key]["count"]
        return 0


class RedisStore:
    """Redis-based rate limit store."""

    def __init__(self, redis_client):
        self.redis = redis_client

    def get_rate_limit_info(self, key: str, window_seconds: int) -> Dict[str, Any]:
        """Get current rate limit info for a key."""
        try:
            current_count = self.redis.get(key)
            ttl = self.redis.ttl(key)

            if current_count is None:
                current_count = 0
                ttl = window_seconds
            else:
                current_count = int(current_count)
                if ttl == -1:  # Key exists but no TTL
                    self.redis.expire(key, window_seconds)
                    ttl = window_seconds

            return {
                "count": current_count,
                "reset_time": int(time.time()) + ttl,
                "remaining_time": ttl,
            }
        except Exception as e:
            logger.error(f"Redis error in get_rate_limit_info: {e}")
            raise

    def increment(self, key: str, window_seconds: int) -> int:
        """Increment counter for a key and return new count."""
        try:
            pipeline = self.redis.pipeline()
            pipeline.incr(key)
            pipeline.expire(key, window_seconds)
            results = pipeline.execute()
            return results[0]
        except Exception as e:
            logger.error(f"Redis error in increment: {e}")
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with Redis and in-memory fallback support.
    """

    def __init__(
        self,
        app,
        default_requests_per_minute: int = 60,
        enable_redis: bool = True,
        redis_url: Optional[str] = None,
    ):
        super().__init__(app)
        self.default_requests_per_minute = default_requests_per_minute
        self.enable_redis = enable_redis and REDIS_AVAILABLE

        # Initialize storage backend
        self.store: Union[RedisStore, InMemoryStore]

        if self.enable_redis and redis:
            try:
                redis_client = redis.from_url(
                    redis_url or "redis://localhost:6379", decode_responses=True
                )
                redis_client.ping()  # Test connection
                self.store = RedisStore(redis_client)
                logger.info("Rate limiting using Redis backend")
            except Exception as e:
                logger.warning(
                    f"Failed to connect to Redis: {e}. Falling back to in-memory store."
                )
                self.store = InMemoryStore()
        else:
            self.store = InMemoryStore()
            logger.info("Rate limiting using in-memory backend")

        # Rate limit rules per endpoint
        self.rate_limits = self._get_rate_limits()

    def _get_rate_limits(self) -> Dict[str, int]:
        """Get rate limits for specific endpoints."""
        # Use default config values for now
        default_rate = 60  # requests per minute
        return {
            # Auth endpoints - more restrictive
            "/auth/login": 5,  # 5 per minute
            "/auth/register": 3,  # 3 per minute
            "/auth/forgot-password": 3,  # 3 per minute
            "/auth/reset-password": 5,  # 5 per minute
            # API endpoints - moderate
            "/api/": default_rate // 2,  # Half default for API
            "/upload": 10,  # 10 uploads per minute
            # Default for everything else
            "*": default_rate,
        }

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Try to get authenticated user ID first
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"

        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return f"ip:{forwarded_for.split(',')[0].strip()}"

        client_host = request.client.host if request.client else "unknown"
        return f"ip:{client_host}"

    def _get_rate_limit_for_path(self, path: str) -> int:
        """Get rate limit for a specific path."""
        # Check exact matches first
        if path in self.rate_limits:
            return self.rate_limits[path]

        # Check prefix matches
        for pattern, limit in self.rate_limits.items():
            if pattern != "*" and path.startswith(pattern):
                return limit

        # Return default
        return self.rate_limits.get("*", self.default_requests_per_minute)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process rate limiting for incoming requests."""
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        if request.url.path.startswith("/static/"):
            return await call_next(request)

        client_id = self._get_client_id(request)
        path = request.url.path
        rate_limit = self._get_rate_limit_for_path(path)
        window_seconds = 60  # 1 minute window

        # Create rate limit key
        rate_key = f"rate_limit:{client_id}:{path}"

        try:
            # Get current rate limit info
            rate_info = self.store.get_rate_limit_info(rate_key, window_seconds)

            # Check if limit exceeded
            if rate_info["count"] >= rate_limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "detail": f"Maximum {rate_limit} requests per minute allowed",
                        "retry_after": rate_info["remaining_time"],
                    },
                    headers={
                        "X-RateLimit-Limit": str(rate_limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(rate_info["reset_time"]),
                        "Retry-After": str(rate_info["remaining_time"]),
                    },
                )

            # Increment counter
            if isinstance(self.store, RedisStore):
                new_count = self.store.increment(rate_key, window_seconds)
            else:
                new_count = self.store.increment(rate_key)
            remaining = max(0, rate_limit - new_count)

            # Process request
            response = await call_next(request)

            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(rate_limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(rate_info["reset_time"])

            return response

        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # On error, allow request to proceed
            return await call_next(request)


def create_rate_limit_middleware(app, **kwargs) -> RateLimitMiddleware:
    """Factory function to create rate limiting middleware."""
    default_rate = 60  # requests per minute

    return RateLimitMiddleware(
        app,
        default_requests_per_minute=kwargs.get(
            "default_requests_per_minute", default_rate
        ),
        enable_redis=kwargs.get("enable_redis", True),
        redis_url=kwargs.get("redis_url", None),
    )
