"""
Enhanced configuration management for ESG Checklist AI
"""
import os
from typing import Optional, List
from pydantic import BaseSettings, validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings with validation and defaults"""
    
    # Database
    database_url: str = "sqlite:///./test.db"
    database_echo: bool = False
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API Keys
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Email Configuration
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]
    
    # Application
    app_name: str = "ESG Checklist AI"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"
    
    # File Upload
    max_file_size_mb: int = 50
    upload_path: str = "uploads"
    allowed_file_extensions: List[str] = [".pdf", ".docx", ".xlsx", ".csv", ".txt"]
    
    # AI Configuration
    ai_timeout_seconds: int = 30
    ai_max_retries: int = 3
    ai_circuit_breaker_threshold: int = 5
    ai_circuit_breaker_timeout: int = 60
    
    # Analytics
    analytics_cache_ttl_seconds: int = 300  # 5 minutes
    
    @validator("allowed_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v
    
    @validator("allowed_hosts", pre=True)
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v
    
    @validator("allowed_file_extensions", pre=True)
    def parse_file_extensions(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings


def validate_required_settings():
    """Validate that required settings are present"""
    errors = []
    
    if not settings.secret_key or settings.secret_key == "your-secret-key-change-in-production":
        errors.append("SECRET_KEY must be set to a secure value in production")
    
    if not settings.gemini_api_key and not settings.openai_api_key:
        errors.append("At least one AI API key (GEMINI_API_KEY or OPENAI_API_KEY) must be configured")
    
    if errors:
        raise ValueError(f"Configuration errors: {'; '.join(errors)}")


def get_database_url() -> str:
    """Get database URL with proper formatting"""
    return settings.database_url


def is_production() -> bool:
    """Check if running in production environment"""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def get_log_config() -> dict:
    """Get logging configuration"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
            },
            "access": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "": {"level": settings.log_level, "handlers": ["default"]},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
        },
    }
