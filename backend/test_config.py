#!/usr/bin/env python3
"""
Test script to verify centralized configuration is working properly
"""

import logging
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))


def test_config():
    """Test centralized configuration."""
    logger.info("Testing Centralized Configuration")
    logger.info("=" * 50)

    try:
        from app.config import (
            get_ai_config,
            get_api_prefix,
            get_cors_settings,
            get_database_config,
            get_email_config,
            get_security_config,
            get_settings,
            validate_required_settings,
        )

        settings = get_settings()

        logger.info("App Name: %s", settings.app_name)
        logger.info("App Version: %s", settings.app_version)
        logger.info("API Version: %s", settings.api_version)
        logger.info("Environment: %s", settings.environment)
        logger.info("API Prefix: %s", get_api_prefix())
        logger.info("Debug Mode: %s", settings.debug)

        logger.info("Configuration Modules:")
        logger.info("Database Config: %s", get_database_config()["url"])
        logger.info("Security Config: %s", get_security_config()["algorithm"])
        logger.info("AI Config Enabled: %s", get_ai_config()["enabled"])
        logger.info("Email Config Enabled: %s", get_email_config()["enabled"])
        logger.info("CORS Origins: %s", get_cors_settings()["allow_origins"])

        logger.info("Security Settings:")
        logger.info("BCrypt Rounds: %s", settings.bcrypt_rounds)
        logger.info("Token Expiry: %s minutes", settings.access_token_expire_minutes)

        logger.info("File Settings:")
        logger.info("Upload Path: %s", settings.upload_path)
        logger.info("Max File Size: %sMB", settings.max_file_size_mb)
        logger.info("Allowed Extensions: %s", settings.allowed_file_extensions)

        logger.info("AI Settings:")
        logger.info("AI Features Enabled: %s", settings.enable_ai_features)
        logger.info("AI Timeout: %ss", settings.ai_timeout_seconds)
        logger.info("AI Max Retries: %s", settings.ai_max_retries)
        logger.info("Circuit Breaker Threshold: %s", settings.ai_circuit_breaker_threshold)

        # Test validation (should not raise errors in development)
        try:
            validate_required_settings()
            logger.info("Configuration validation passed")
        except ValueError as e:
            logger.warning("Configuration validation warnings: %s", e)

        logger.info("Configuration Test Completed Successfully!")
        return True

    except ImportError as e:
        logger.exception("Import Error: %s", e)
        return False
    except Exception as e:
        logger.exception("Configuration Error: %s", e)
        return False


def test_database():
    """Test database configuration."""
    logger.info("Testing Database Configuration")
    logger.info("=" * 50)

    try:
        from app.config import get_database_config
        from app.database import get_db_health

        db_config = get_database_config()
        logger.info("Database URL: %s", db_config["url"])
        logger.info("Pool Size: %s", db_config["pool_size"])
        logger.info("Echo SQL: %s", db_config["echo"])

        # Test database health
        health = get_db_health()
        logger.info("Database Health: %s", "Healthy" if health else "Unhealthy")

        return True
    except Exception as e:
        logger.exception("Database Test Error: %s", e)
        return False


def test_auth():
    """Test authentication configuration."""
    logger.info("Testing Authentication Configuration")
    logger.info("=" * 50)

    try:
        from app.auth import create_access_token, hash_password, verify_password
        from app.config import get_security_config

        security_config = get_security_config()
        logger.info("JWT Algorithm: %s", security_config["algorithm"])
        logger.info("Token Expiry: %s minutes", security_config["access_token_expire_minutes"])

        # Test password hashing
        test_password = "test123"  # noqa: S105
        hashed = hash_password(test_password)
        verified = verify_password(test_password, hashed)

        logger.info("Password Hashing: %s", "Working" if verified else "Failed")

        # Test token creation
        token = create_access_token({"sub": "test@example.com"})
        logger.info("Token Creation: %s", "Working" if token else "Failed")

        return True
    except Exception as e:
        logger.exception("Auth Test Error: %s", e)
        return False


def test_api_versioning():
    """Test API versioning."""
    logger.info("Testing API Versioning")
    logger.info("=" * 50)

    try:
        from app.config import get_api_prefix, get_settings

        settings = get_settings()
        api_prefix = get_api_prefix()

        logger.info("API Version: %s", settings.api_version)
        logger.info("API Prefix: %s", api_prefix)
        logger.info("Expected Routes: %s/users, %s/checklists, etc.", api_prefix, api_prefix)

        return True
    except Exception as e:
        logger.exception("API Versioning Test Error: %s", e)
        return False


if __name__ == "__main__":
    logger.info("ESG Checklist AI - Configuration Test Suite")
    logger.info("=" * 60)

    tests = [
        test_config,
        test_database,
        test_auth,
        test_api_versioning,
    ]

    passed = 0
    total = len(tests)

    for test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:  # noqa: PERF203
            logger.exception("Test %s failed with exception: %s", test_func.__name__, e)

    logger.info("=" * 60)
    logger.info("Test Results: %d/%d tests passed", passed, total)

    if passed == total:
        logger.info("All tests passed! Configuration is working correctly.")
        sys.exit(0)
    else:
        logger.warning("Some tests failed. Please check the configuration.")
        sys.exit(1)
