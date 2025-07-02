"""
Token management system with blacklist and refresh token support.
Provides secure token revocation, rotation, and validation.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Set
import logging
from jose import jwt, JWTError
from fastapi import HTTPException, status
import os

logger = logging.getLogger(__name__)

# Try to import Redis, but continue without it if not available
try:
    import redis  # type: ignore

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None  # type: ignore
    logger.warning("Redis not available, using in-memory token blacklist")


class TokenManager:
    """
    Manages JWT tokens with blacklist support and refresh token functionality.
    Uses Redis for token blacklist storage when available.
    """

    def __init__(self):
        self.redis_client = None
        secret_key = os.getenv("SECRET_KEY")

        if not secret_key:
            # Use a default key for development (not secure for production)
            secret_key = "development_secret_key_change_in_production"
            logger.warning("Using default SECRET_KEY - change for production!")

        self.secret_key = secret_key
        self.refresh_secret_key = os.getenv(
            "REFRESH_SECRET_KEY", secret_key + "_refresh"
        )
        self.algorithm = "HS256"

        # Token expiration times
        self.access_token_expire_minutes = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
        )  # 15 minutes
        self.refresh_token_expire_days = int(
            os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")
        )  # 30 days

        # Initialize Redis connection if available
        if REDIS_AVAILABLE:
            self._init_redis()

        # In-memory fallback for token blacklist
        self._blacklisted_tokens: Set[str] = set()

    def _init_redis(self) -> None:
        """Initialize Redis connection with fallback handling."""
        if not REDIS_AVAILABLE or redis is None:
            return

        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established for token management")
        except Exception as e:
            logger.warning(f"Redis connection failed, using in-memory fallback: {e}")
            self.redis_client = None

    def create_access_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a short-lived access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=self.access_token_expire_minutes
            )

        to_encode.update(
            {"exp": expire, "type": "access", "iat": datetime.now(timezone.utc)}
        )

        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: int, user_email: str) -> str:
        """Create a long-lived refresh token."""
        expire = datetime.now(timezone.utc) + timedelta(
            days=self.refresh_token_expire_days
        )

        payload = {
            "sub": user_email,
            "user_id": user_id,
            "exp": expire,
            "type": "refresh",
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, self.refresh_secret_key, algorithm=self.algorithm)

    def verify_access_token(self, token: str) -> dict:
        """Verify and decode access token."""
        try:
            # Check if token is blacklisted
            if self.is_token_blacklisted(token):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Verify token type
            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return payload

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def verify_refresh_token(self, token: str) -> dict:
        """Verify and decode refresh token."""
        try:
            # Check if token is blacklisted
            if self.is_token_blacklisted(token):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked",
                )

            payload = jwt.decode(
                token, self.refresh_secret_key, algorithms=[self.algorithm]
            )

            # Verify token type
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )

            return payload

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

    def blacklist_token(self, token: str, expires_at: Optional[datetime] = None):
        """Add token to blacklist."""
        try:
            if self.redis_client:
                # Calculate TTL based on token expiration
                if expires_at:
                    ttl = int((expires_at - datetime.now(timezone.utc)).total_seconds())
                    if ttl > 0:
                        self.redis_client.setex(f"blacklist:{token}", ttl, "1")
                else:
                    # Default TTL for safety
                    self.redis_client.setex(
                        f"blacklist:{token}", 86400, "1"
                    )  # 24 hours

                logger.info("Token blacklisted in Redis")
            else:
                # Fallback to in-memory storage
                self._blacklisted_tokens.add(token)
                logger.info("Token blacklisted in memory")

        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
            # Fallback to in-memory storage
            self._blacklisted_tokens.add(token)

    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        try:
            if self.redis_client:
                return bool(self.redis_client.get(f"blacklist:{token}"))
            else:
                return token in self._blacklisted_tokens
        except Exception as e:
            logger.error(f"Failed to check token blacklist: {e}")
            # Fallback to in-memory check
            return token in self._blacklisted_tokens

    def revoke_all_user_tokens(self, user_id: int):
        """Revoke all tokens for a specific user."""
        try:
            if self.redis_client:
                # Add user to revoked users set with TTL
                max_token_life = max(
                    self.access_token_expire_minutes * 60,
                    self.refresh_token_expire_days * 24 * 60 * 60,
                )
                self.redis_client.setex(
                    f"revoked_user:{user_id}",
                    max_token_life,
                    str(datetime.now(timezone.utc).timestamp()),
                )
                logger.info(f"All tokens revoked for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to revoke user tokens: {e}")

    def is_user_tokens_revoked(self, user_id: int, token_issued_at: datetime) -> bool:
        """Check if user's tokens were revoked after token was issued."""
        try:
            if self.redis_client:
                revoked_timestamp = self.redis_client.get(f"revoked_user:{user_id}")
                if revoked_timestamp:
                    revoked_at = datetime.fromtimestamp(
                        float(revoked_timestamp), tz=timezone.utc
                    )
                    return token_issued_at < revoked_at
            return False
        except Exception as e:
            logger.error(f"Failed to check user token revocation: {e}")
            return False


# Global token manager instance
token_manager = TokenManager()


# Convenience functions for global access
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create an access token using the global token manager."""
    return token_manager.create_access_token(data, expires_delta)


def verify_token(token: str) -> dict:
    """Verify an access token using the global token manager."""
    return token_manager.verify_access_token(token)


def revoke_token(token: str, expires_at: Optional[datetime] = None) -> None:
    """Revoke a token using the global token manager."""
    token_manager.blacklist_token(token, expires_at)


def is_token_revoked(token: str) -> bool:
    """Check if a token is revoked using the global token manager."""
    return token_manager.is_token_blacklisted(token)


def get_token_blacklist_key(token: str) -> str:
    """Get the blacklist key for a token."""
    return f"blacklist:token:{token}"
