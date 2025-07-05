"""
Shared test configuration and fixtures for the ESG Checklist AI backend tests.
"""

import asyncio
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.main import app

# Test database URL - using SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_db():
    """Create a test database and clean it up after each test."""
    # Create test database engine
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create session
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    yield testing_session_local()

    # Cleanup - remove test database file
    test_db_path = Path("./test.db")
    if test_db_path.exists():
        test_db_path.unlink()


@pytest.fixture
async def async_client():
    """Create an async HTTP client for testing API endpoints."""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def test_settings():
    """Provide test-specific settings."""
    return get_settings()


@pytest.fixture
def temp_upload_dir():
    """Create a temporary directory for file uploads during tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def sample_user_data():
    """Provide sample user data for testing."""
    return {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "testpassword123",
        "role": "user",
        "is_active": True,
    }


@pytest.fixture
def sample_checklist_data():
    """Provide sample checklist data for testing."""
    return {
        "title": "Test ESG Checklist",
        "description": "A test checklist for unit testing",
        "category": "environmental",
        "questions": [
            {
                "text": "Does the company have a carbon reduction plan?",
                "type": "boolean",
                "required": True,
            },
            {
                "text": "What is the company's annual carbon footprint?",
                "type": "number",
                "required": False,
            },
        ],
    }


@pytest.fixture
def auth_headers():
    """Provide authentication headers for testing protected endpoints."""
    # This would typically involve creating a test user and getting a JWT token
    return {"Authorization": "Bearer test-token"}


# Mock configurations for external services
@pytest.fixture(autouse=True)
def mock_external_services(monkeypatch):
    """Mock external services to avoid real API calls during tests."""

    # Mock AI service calls
    def mock_ai_analysis(*args, **kwargs):
        return {
            "score": 85,
            "feedback": "Test feedback",
            "suggestions": ["Test suggestion 1", "Test suggestion 2"],
        }

    # Mock email service
    def mock_send_email(*args, **kwargs):
        return True

    # Mock file storage
    def mock_save_file(*args, **kwargs):
        return "test-file-path.pdf"

    # Note: These would need to be updated to match actual import paths
    # monkeypatch.setattr("backend.app.ai.analyze_checklist", mock_ai_analysis)
    # monkeypatch.setattr("backend.app.utils.send_email", mock_send_email)
    # monkeypatch.setattr("backend.app.utils.save_uploaded_file", mock_save_file)
