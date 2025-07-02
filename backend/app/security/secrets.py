"""Secrets management utilities."""

import os
import logging
from typing import Optional, Dict
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class SecretsManager:
    """Manages application secrets from environment variables and config files."""

    def __init__(self):
        self._secrets_cache: Dict[str, str] = {}
        self._load_env_secrets()

    def _load_env_secrets(self) -> None:
        """Load secrets from environment variables."""
        # Database secrets
        self._secrets_cache.update(
            {
                "db_host": os.getenv("DB_HOST", "localhost"),
                "db_port": os.getenv("DB_PORT", "3306"),
                "db_name": os.getenv("DB_NAME", "esg_checklist"),
                "db_user": os.getenv("DB_USER", "root"),
                "db_password": os.getenv("DB_PASSWORD", ""),
                # JWT secrets
                "jwt_secret_key": os.getenv(
                    "JWT_SECRET_KEY", "your-secret-key-change-in-production"
                ),
                "jwt_algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
                "jwt_access_token_expire_minutes": os.getenv(
                    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"
                ),
                "jwt_refresh_token_expire_days": os.getenv(
                    "JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"
                ),
                # Redis secrets
                "redis_host": os.getenv("REDIS_HOST", "localhost"),
                "redis_port": os.getenv("REDIS_PORT", "6379"),
                "redis_password": os.getenv("REDIS_PASSWORD", ""),
                "redis_db": os.getenv("REDIS_DB", "0"),
                # Email secrets
                "outlook_client_id": os.getenv("OUTLOOK_CLIENT_ID", ""),
                "outlook_client_secret": os.getenv("OUTLOOK_CLIENT_SECRET", ""),
                "outlook_tenant_id": os.getenv("OUTLOOK_TENANT_ID", ""),
                "outlook_sender_address": os.getenv("OUTLOOK_SENDER_ADDRESS", ""),
                # Security settings
                "security_rate_limit_per_minute": os.getenv(
                    "SECURITY_RATE_LIMIT_PER_MINUTE", "60"
                ),
                "security_enable_cors": os.getenv("SECURITY_ENABLE_CORS", "true"),
                "security_allowed_origins": os.getenv(
                    "SECURITY_ALLOWED_ORIGINS", "http://localhost:3000"
                ),
                # App settings
                "app_environment": os.getenv("APP_ENVIRONMENT", "development"),
                "app_debug": os.getenv("APP_DEBUG", "true"),
                "app_secret_key": os.getenv(
                    "APP_SECRET_KEY", "change-me-in-production"
                ),
            }
        )

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get a secret value by key.

        Args:
            key: The secret key to retrieve
            default: Default value if secret is not found

        Returns:
            Secret value or default if not found
        """
        value = self._secrets_cache.get(key, default)
        if value is None:
            logger.warning(f"Secret '{key}' not found and no default provided")
        return value

    def get_database_url(self) -> str:
        """Get the complete database URL."""
        host = self.get_secret("db_host")
        port = self.get_secret("db_port")
        name = self.get_secret("db_name")
        user = self.get_secret("db_user")
        password = self.get_secret("db_password")

        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

    def get_redis_url(self) -> str:
        """Get the complete Redis URL."""
        host = self.get_secret("redis_host")
        port = self.get_secret("redis_port")
        password = self.get_secret("redis_password")
        db = self.get_secret("redis_db")

        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        else:
            return f"redis://{host}:{port}/{db}"

    def is_production(self) -> bool:
        """Check if running in production environment."""
        env = self.get_secret("app_environment", "development")
        return env.lower() == "production" if env else False

    def is_debug_enabled(self) -> bool:
        """Check if debug mode is enabled."""
        debug = self.get_secret("app_debug", "false")
        return debug.lower() == "true" if debug else False

    def load_secrets_from_file(self, file_path: str) -> None:
        """
        Load secrets from a JSON file.

        Args:
            file_path: Path to the secrets JSON file
        """
        try:
            path = Path(file_path)
            if path.exists():
                with open(path, "r") as f:
                    file_secrets = json.load(f)
                    self._secrets_cache.update(file_secrets)
                    logger.info(f"Loaded secrets from {file_path}")
            else:
                logger.warning(f"Secrets file {file_path} not found")
        except Exception as e:
            logger.error(f"Failed to load secrets from {file_path}: {e}")

    def validate_required_secrets(self, required_keys: list) -> bool:
        """
        Validate that all required secrets are present.

        Args:
            required_keys: List of required secret keys

        Returns:
            True if all required secrets are present
        """
        missing_keys = []
        for key in required_keys:
            if not self.get_secret(key):
                missing_keys.append(key)

        if missing_keys:
            logger.error(f"Missing required secrets: {missing_keys}")
            return False

        return True


# Global secrets manager instance
secrets_manager = SecretsManager()


def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get a secret value using the global secrets manager.

    Args:
        key: The secret key to retrieve
        default: Default value if secret is not found

    Returns:
        Secret value or default if not found
    """
    return secrets_manager.get_secret(key, default)


def get_database_url() -> str:
    """Get the complete database URL."""
    return secrets_manager.get_database_url()


def get_redis_url() -> str:
    """Get the complete Redis URL."""
    return secrets_manager.get_redis_url()


def is_production() -> bool:
    """Check if running in production environment."""
    return secrets_manager.is_production()


def is_debug_enabled() -> bool:
    """Check if debug mode is enabled."""
    return secrets_manager.is_debug_enabled()
