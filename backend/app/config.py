"""
Central configuration management using Pydantic BaseModel with environment variables.
Loads and validates all environment variables with proper typing.
"""

import os
from typing import Optional, List
from pydantic import BaseModel, validator
from functools import lru_cache


class DatabaseSettings(BaseModel):
    """Database configuration settings."""

    url: str = "sqlite:///./backend/test.db"
    echo_sql: bool = False
    pool_size: int = 10
    max_overflow: int = 20

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = os.getenv("DATABASE_URL", self.url)
        self.echo_sql = os.getenv("DATABASE_ECHO_SQL", "false").lower() == "true"
        self.pool_size = int(os.getenv("DATABASE_POOL_SIZE", str(self.pool_size)))
        self.max_overflow = int(
            os.getenv("DATABASE_MAX_OVERFLOW", str(self.max_overflow))
        )


class AISettings(BaseModel):
    """AI service configuration settings."""

    provider: str = "gemini"
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    eand_api_key: Optional[str] = None
    eand_api_url: Optional[str] = None
    fallback_enabled: bool = True
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_timeout: int = 60

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.provider = os.getenv("AI_PROVIDER", self.provider)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.eand_api_key = os.getenv("EAND_API_KEY")
        self.eand_api_url = os.getenv("EAND_API_URL")
        self.fallback_enabled = (
            os.getenv("AI_FALLBACK_ENABLED", "true").lower() == "true"
        )
        self.circuit_breaker_failure_threshold = int(
            os.getenv(
                "AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD",
                str(self.circuit_breaker_failure_threshold),
            )
        )
        self.circuit_breaker_timeout = int(
            os.getenv("AI_CIRCUIT_BREAKER_TIMEOUT", str(self.circuit_breaker_timeout))
        )

    @validator("provider")
    def validate_provider(cls, v):
        allowed_providers = ["gemini", "openai", "eand"]
        if v not in allowed_providers:
            raise ValueError(f"AI provider must be one of: {allowed_providers}")
        return v


class SecuritySettings(BaseModel):
    """Security and authentication settings."""

    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    bcrypt_rounds: int = 12
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    trusted_hosts: List[str] = ["localhost", "127.0.0.1"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.secret_key = os.getenv("SECRET_KEY", self.secret_key)
        self.algorithm = os.getenv("JWT_ALGORITHM", self.algorithm)
        self.access_token_expire_minutes = int(
            os.getenv(
                "ACCESS_TOKEN_EXPIRE_MINUTES", str(self.access_token_expire_minutes)
            )
        )
        self.bcrypt_rounds = int(os.getenv("BCRYPT_ROUNDS", str(self.bcrypt_rounds)))

        # Parse comma-separated values
        cors_origins = os.getenv("CORS_ORIGINS")
        if cors_origins:
            self.cors_origins = [origin.strip() for origin in cors_origins.split(",")]

        trusted_hosts = os.getenv("TRUSTED_HOSTS")
        if trusted_hosts:
            self.trusted_hosts = [host.strip() for host in trusted_hosts.split(",")]


class EmailSettings(BaseModel):
    """Email configuration settings."""

    enabled: bool = False
    provider: str = "microsoft"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None
    from_email: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
        self.provider = os.getenv("EMAIL_PROVIDER", self.provider)
        self.client_id = os.getenv("MICROSOFT_CLIENT_ID")
        self.client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
        self.tenant_id = os.getenv("MICROSOFT_TENANT_ID")
        self.from_email = os.getenv("FROM_EMAIL")
        self.smtp_server = os.getenv("SMTP_SERVER")
        self.smtp_port = int(os.getenv("SMTP_PORT", str(self.smtp_port)))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")


class FeatureFlags(BaseModel):
    """Feature flag settings for enabling/disabling functionality."""

    enable_ai_scoring: bool = True
    enable_email_notifications: bool = False
    enable_file_uploads: bool = True
    enable_audit_logging: bool = True
    enable_analytics: bool = True
    enable_admin_endpoints: bool = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.enable_ai_scoring = (
            os.getenv("ENABLE_AI_SCORING", "true").lower() == "true"
        )
        self.enable_email_notifications = (
            os.getenv("ENABLE_EMAIL_NOTIFICATIONS", "false").lower() == "true"
        )
        self.enable_file_uploads = (
            os.getenv("ENABLE_FILE_UPLOADS", "true").lower() == "true"
        )
        self.enable_audit_logging = (
            os.getenv("ENABLE_AUDIT_LOGGING", "true").lower() == "true"
        )
        self.enable_analytics = os.getenv("ENABLE_ANALYTICS", "true").lower() == "true"
        self.enable_admin_endpoints = (
            os.getenv("ENABLE_ADMIN_ENDPOINTS", "true").lower() == "true"
        )


class AppSettings(BaseModel):
    """Application-wide settings."""

    app_name: str = "ESG Checklist AI"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    log_level: str = "INFO"
    max_upload_size_mb: int = 50
    uploads_dir: str = "./backend/uploads"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.app_name = os.getenv("APP_NAME", self.app_name)
        self.app_version = os.getenv("APP_VERSION", self.app_version)
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.environment = os.getenv("ENVIRONMENT", self.environment)
        self.log_level = os.getenv("LOG_LEVEL", self.log_level).upper()
        self.max_upload_size_mb = int(
            os.getenv("MAX_UPLOAD_SIZE_MB", str(self.max_upload_size_mb))
        )
        self.uploads_dir = os.getenv("UPLOADS_DIR", self.uploads_dir)

    @validator("environment")
    def validate_environment(cls, v):
        allowed_envs = ["development", "staging", "production"]
        if v not in allowed_envs:
            raise ValueError(f"Environment must be one of: {allowed_envs}")
        return v

    @validator("log_level")
    def validate_log_level(cls, v):
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of: {allowed_levels}")
        return v.upper()


class Settings(BaseModel):
    """Main settings class that aggregates all configuration."""

    # Sub-settings
    app: AppSettings
    database: DatabaseSettings
    ai: AISettings
    security: SecuritySettings
    email: EmailSettings
    features: FeatureFlags

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.app = AppSettings()
        self.database = DatabaseSettings()
        self.ai = AISettings()
        self.security = SecuritySettings()
        self.email = EmailSettings()
        self.features = FeatureFlags()


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to avoid re-reading environment variables on every call.
    """
    return Settings()


# For backwards compatibility and easy imports
def get_database_url() -> str:
    """Get database URL from settings."""
    return get_settings().database.url


def get_secret_key() -> str:
    """Get secret key from settings."""
    return get_settings().security.secret_key


def is_debug_mode() -> bool:
    """Check if debug mode is enabled."""
    return get_settings().app.debug


def is_production() -> bool:
    """Check if running in production environment."""
    return get_settings().app.environment == "production"
