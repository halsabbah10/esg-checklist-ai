"""
Enhanced configuration management for ESG Checklist AI
Centralized configuration using Pydantic BaseSettings
"""
import os
from typing import Optional, List

try:
    from pydantic_settings import BaseSettings
    from pydantic import Field, field_validator
    
    # Pydantic v2 compatible validators
    def make_validator(field_name, mode="before"):
        def decorator(func):
            return field_validator(field_name, mode=mode)(classmethod(func))
        return decorator
    
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings, Field, validator
    
    # Pydantic v1 compatible validators
    def make_validator(field_name, mode="before"):
        def decorator(func):
            return validator(field_name, pre=(mode=="before"))(func)
        return decorator

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings with validation and defaults"""
    
    # Application Metadata
    app_name: str = Field(default="ESG Checklist AI", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    api_version: str = Field(default="v1", description="API version prefix")
    environment: str = Field(default="development", description="Environment (development/production)")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Server Configuration
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")
    
    # Database Configuration
    database_url: str = Field(default="sqlite:///./test.db", description="Database URL")
    database_echo: bool = Field(default=False, description="Echo SQL queries")
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(default=20, description="Max overflow connections")
    db_pool_recycle: int = Field(default=3600, description="Pool recycle time in seconds")
    
    # Security Configuration
    secret_key: str = Field(default="your-secret-key-change-in-production", description="JWT secret key")
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Token expiration time")
    bcrypt_rounds: int = Field(default=12, description="BCrypt rounds for password hashing")
    
    # API Keys
    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-2.0-flash-exp", description="Gemini AI model to use")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    
    # Email Configuration
    smtp_server: Optional[str] = Field(default=None, description="SMTP server")
    smtp_port: int = Field(default=587, description="SMTP port")
    smtp_username: Optional[str] = Field(default=None, description="SMTP username")
    smtp_password: Optional[str] = Field(default=None, description="SMTP password")
    from_email: Optional[str] = Field(default=None, description="From email address")
    smtp_use_tls: bool = Field(default=True, description="Use TLS for SMTP")
    smtp_use_ssl: bool = Field(default=False, description="Use SSL for SMTP")
    
    # CORS and Security
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8080", 
        description="Allowed CORS origins (comma-separated)"
    )
    allowed_hosts: str = Field(
        default="localhost,127.0.0.1,testserver", 
        description="Allowed hosts (comma-separated)"
    )
    allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_file: Optional[str] = Field(default="logs/app.log", description="Log file path")
    log_rotation: str = Field(default="1 day", description="Log file rotation")
    log_retention: str = Field(default="30 days", description="Log file retention")
    
    # File Upload Configuration
    max_file_size_mb: int = Field(default=50, description="Maximum file size in MB")
    upload_path: str = Field(default="uploads", description="Upload directory path")
    allowed_file_extensions: str = Field(
        default=".pdf,.docx,.xlsx,.csv,.txt", 
        description="Allowed file extensions (comma-separated)"
    )
    
    # AI Configuration
    ai_timeout_seconds: int = Field(default=30, description="AI request timeout")
    ai_max_retries: int = Field(default=3, description="Maximum AI request retries")
    ai_circuit_breaker_threshold: int = Field(default=5, description="Circuit breaker threshold")
    ai_circuit_breaker_timeout: int = Field(default=60, description="Circuit breaker timeout")
    ai_model_temperature: float = Field(default=0.7, description="AI model temperature")
    ai_max_tokens: int = Field(default=2048, description="Maximum AI tokens")
    
    # Analytics Configuration
    analytics_cache_ttl_seconds: int = Field(default=300, description="Analytics cache TTL")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Rate limit requests per minute")
    rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")
    
    # Monitoring and Health
    health_check_interval: int = Field(default=30, description="Health check interval")
    metrics_enabled: bool = Field(default=True, description="Enable metrics collection")
    
    # Feature Flags
    enable_ai_features: bool = Field(default=True, description="Enable AI features")
    enable_email_notifications: bool = Field(default=True, description="Enable email notifications")
    enable_audit_logging: bool = Field(default=True, description="Enable audit logging")
    enable_analytics: bool = Field(default=True, description="Enable analytics")
    
    # Development/Testing
    docs_enabled: bool = Field(default=True, description="Enable API documentation")
    testing_mode: bool = Field(default=False, description="Testing mode")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Remove env_prefix to allow direct variable names
        extra = "ignore"  # Ignore extra fields in environment


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance"""
    return settings


def reload_settings() -> Settings:
    """Reload settings from environment (useful for testing)"""
    global settings
    settings = Settings()
    return settings


def validate_required_settings():
    """Validate that required settings are present for production"""
    errors = []
    
    if settings.environment.lower() == "production":
        if not settings.secret_key or settings.secret_key == "your-secret-key-change-in-production":
            errors.append("SECRET_KEY must be set to a secure value in production")
        
        if settings.enable_ai_features and not settings.gemini_api_key and not settings.openai_api_key:
            errors.append("At least one AI API key (GEMINI_API_KEY or OPENAI_API_KEY) must be configured when AI features are enabled")
        
        if settings.enable_email_notifications:
            missing_email_config = []
            if not settings.smtp_server:
                missing_email_config.append("SMTP_SERVER")
            if not settings.smtp_username:
                missing_email_config.append("SMTP_USERNAME")
            if not settings.smtp_password:
                missing_email_config.append("SMTP_PASSWORD")
            if not settings.from_email:
                missing_email_config.append("FROM_EMAIL")
            
            if missing_email_config:
                errors.append(f"Email configuration missing: {', '.join(missing_email_config)}")
    
    if errors:
        raise ValueError(f"Configuration validation errors: {'; '.join(errors)}")


def get_database_url() -> str:
    """Get database URL with proper formatting"""
    return settings.database_url


def is_production() -> bool:
    """Check if running in production environment"""
    return settings.environment.lower() == "production"


def is_development() -> bool:
    """Check if running in development environment"""
    return settings.environment.lower() == "development"


def is_testing() -> bool:
    """Check if running in testing mode"""
    return settings.testing_mode or settings.environment.lower() == "testing"


def get_api_prefix() -> str:
    """Get API prefix for versioning"""
    return f"/{settings.api_version}"


def get_cors_settings() -> dict:
    """Get CORS configuration"""
    allowed_origins = [x.strip() for x in settings.allowed_origins.split(",")]
    return {
        "allow_origins": allowed_origins,
        "allow_credentials": settings.allow_credentials,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["*"],
    }


def get_log_config() -> dict:
    """Get comprehensive logging configuration"""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
    
    formatters = {
        "default": {
            "format": log_format,
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "access": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }
    
    # Add JSON formatter if pythonjsonlogger is available
    try:
        import pythonjsonlogger.jsonlogger
        formatters["json"] = {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(filename)s %(lineno)d %(message)s"
        }
    except ImportError:
        pass  # JSON formatter not available
    
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "level": settings.log_level,
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "level": "INFO",
            },
        },
        "loggers": {
            "": {"level": settings.log_level, "handlers": ["default"]},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
            "sqlalchemy.engine": {"level": "WARNING"},  # Reduce SQL noise
            "passlib": {"level": "ERROR"},  # Reduce passlib warnings
        },
    }
    
    # Add file handler if log file is specified
    if settings.log_file:
        config["handlers"]["file"] = {
            "formatter": "default",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": settings.log_file,
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "level": settings.log_level,
        }
        config["loggers"][""]["handlers"].append("file")
    
    return config


def get_database_config() -> dict:
    """Get database configuration"""
    return {
        "url": settings.database_url,
        "echo": settings.database_echo,
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_recycle": settings.db_pool_recycle,
        "pool_pre_ping": True,
    }


def get_security_config() -> dict:
    """Get security configuration"""
    return {
        "secret_key": settings.secret_key,
        "algorithm": settings.algorithm,
        "access_token_expire_minutes": settings.access_token_expire_minutes,
        "bcrypt_rounds": settings.bcrypt_rounds,
    }


def get_ai_config() -> dict:
    """Get AI configuration"""
    return {
        "gemini_api_key": settings.gemini_api_key,
        "openai_api_key": settings.openai_api_key,
        "timeout_seconds": settings.ai_timeout_seconds,
        "max_retries": settings.ai_max_retries,
        "circuit_breaker_threshold": settings.ai_circuit_breaker_threshold,
        "circuit_breaker_timeout": settings.ai_circuit_breaker_timeout,
        "model_temperature": settings.ai_model_temperature,
        "max_tokens": settings.ai_max_tokens,
        "enabled": settings.enable_ai_features,
    }


def get_email_config() -> dict:
    """Get email configuration"""
    return {
        "smtp_server": settings.smtp_server,
        "smtp_port": settings.smtp_port,
        "smtp_username": settings.smtp_username,
        "smtp_password": settings.smtp_password,
        "from_email": settings.from_email,
        "use_tls": settings.smtp_use_tls,
        "use_ssl": settings.smtp_use_ssl,
        "enabled": settings.enable_email_notifications,
    }


def create_directories():
    """Create necessary directories based on configuration"""
    import os
    
    # Create upload directory
    os.makedirs(settings.upload_path, exist_ok=True)
    
    # Create logs directory if log file is specified
    if settings.log_file:
        log_dir = os.path.dirname(settings.log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
