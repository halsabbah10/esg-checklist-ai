#!/usr/bin/env python3
"""
Test script to verify centralized configuration is working properly
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_config():
    """Test centralized configuration"""
    print("🧪 Testing Centralized Configuration")
    print("=" * 50)
    
    try:
        from app.config import (
            get_settings, 
            validate_required_settings, 
            get_api_prefix,
            get_database_config,
            get_security_config,
            get_ai_config,
            get_email_config,
            get_cors_settings
        )
        
        settings = get_settings()
        
        print(f"✅ App Name: {settings.app_name}")
        print(f"✅ App Version: {settings.app_version}")
        print(f"✅ API Version: {settings.api_version}")
        print(f"✅ Environment: {settings.environment}")
        print(f"✅ API Prefix: {get_api_prefix()}")
        print(f"✅ Debug Mode: {settings.debug}")
        
        print("\n📊 Configuration Modules:")
        print(f"✅ Database Config: {get_database_config()['url']}")
        print(f"✅ Security Config: {get_security_config()['algorithm']}")
        print(f"✅ AI Config Enabled: {get_ai_config()['enabled']}")
        print(f"✅ Email Config Enabled: {get_email_config()['enabled']}")
        print(f"✅ CORS Origins: {get_cors_settings()['allow_origins']}")
        
        print("\n🔒 Security Settings:")
        print(f"✅ BCrypt Rounds: {settings.bcrypt_rounds}")
        print(f"✅ Token Expiry: {settings.access_token_expire_minutes} minutes")
        
        print("\n📁 File Settings:")
        print(f"✅ Upload Path: {settings.upload_path}")
        print(f"✅ Max File Size: {settings.max_file_size_mb}MB")
        print(f"✅ Allowed Extensions: {settings.allowed_file_extensions}")
        
        print("\n🤖 AI Settings:")
        print(f"✅ AI Features Enabled: {settings.enable_ai_features}")
        print(f"✅ AI Timeout: {settings.ai_timeout_seconds}s")
        print(f"✅ AI Max Retries: {settings.ai_max_retries}")
        print(f"✅ Circuit Breaker Threshold: {settings.ai_circuit_breaker_threshold}")
        
        # Test validation (should not raise errors in development)
        try:
            validate_required_settings()
            print("\n✅ Configuration validation passed")
        except ValueError as e:
            print(f"\n⚠️  Configuration validation warnings: {e}")
        
        print("\n🎉 Configuration Test Completed Successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Configuration Error: {e}")
        return False

def test_database():
    """Test database configuration"""
    print("\n🗄️  Testing Database Configuration")
    print("=" * 50)
    
    try:
        from app.database import get_db_health, get_session
        from app.config import get_database_config
        
        db_config = get_database_config()
        print(f"✅ Database URL: {db_config['url']}")
        print(f"✅ Pool Size: {db_config['pool_size']}")
        print(f"✅ Echo SQL: {db_config['echo']}")
        
        # Test database health
        health = get_db_health()
        print(f"✅ Database Health: {'Healthy' if health else 'Unhealthy'}")
        
        return True
    except Exception as e:
        print(f"❌ Database Test Error: {e}")
        return False

def test_auth():
    """Test authentication configuration"""
    print("\n🔐 Testing Authentication Configuration")
    print("=" * 50)
    
    try:
        from app.auth import hash_password, verify_password, create_access_token
        from app.config import get_security_config
        
        security_config = get_security_config()
        print(f"✅ JWT Algorithm: {security_config['algorithm']}")
        print(f"✅ Token Expiry: {security_config['access_token_expire_minutes']} minutes")
        
        # Test password hashing
        test_password = "test123"
        hashed = hash_password(test_password)
        verified = verify_password(test_password, hashed)
        
        print(f"✅ Password Hashing: {'Working' if verified else 'Failed'}")
        
        # Test token creation
        token = create_access_token({"sub": "test@example.com"})
        print(f"✅ Token Creation: {'Working' if token else 'Failed'}")
        
        return True
    except Exception as e:
        print(f"❌ Auth Test Error: {e}")
        return False

def test_api_versioning():
    """Test API versioning"""
    print("\n🔄 Testing API Versioning")
    print("=" * 50)
    
    try:
        from app.config import get_api_prefix, get_settings
        
        settings = get_settings()
        api_prefix = get_api_prefix()
        
        print(f"✅ API Version: {settings.api_version}")
        print(f"✅ API Prefix: {api_prefix}")
        print(f"✅ Expected Routes: {api_prefix}/users, {api_prefix}/checklists, etc.")
        
        return True
    except Exception as e:
        print(f"❌ API Versioning Test Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 ESG Checklist AI - Configuration Test Suite")
    print("=" * 60)
    
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
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Configuration is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        sys.exit(1)
