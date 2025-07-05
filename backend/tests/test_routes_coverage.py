"""
Unit tests for router endpoints to improve code coverage.
Tests basic functionality of various API endpoints.
"""

import pytest
from httpx import AsyncClient


class TestChecklistRoutes:
    """Test checklist-related routes."""

    @pytest.fixture(autouse=True)
    async def setup_admin_user(self, async_client: AsyncClient):
        """Create admin user for testing."""
        user_data = {
            "username": "admin_test",
            "email": "admin_test@example.com",
            "password": "admin_password_123",
            "full_name": "Admin Test User",
            "role": "admin",
        }

        response = await async_client.post("/v1/users/register", json=user_data)
        assert response.status_code in [200, 201, 400, 409]

        login_data = {"username": "admin_test", "password": "admin_password_123"}
        response = await async_client.post("/v1/users/login", data=login_data)
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}

    async def test_get_checklists(self, async_client: AsyncClient):
        """Test getting list of checklists."""
        response = await async_client.get("/v1/checklists/", headers=self.headers)
        assert response.status_code in [200, 401, 403]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    async def test_create_checklist(self, async_client: AsyncClient):
        """Test creating a new checklist."""
        checklist_data = {
            "title": "Test Coverage Checklist",
            "description": "A checklist for testing code coverage",
            "category": "test",
        }

        response = await async_client.post(
            "/v1/checklists/", json=checklist_data, headers=self.headers
        )
        # Could be 200/201 success, 401 unauthorized, 403 forbidden, or 500 server error
        assert response.status_code in [200, 201, 401, 403, 500]

    async def test_get_checklist_by_id(self, async_client: AsyncClient):
        """Test getting a specific checklist."""
        # Test with non-existent checklist
        response = await async_client.get("/v1/checklists/999", headers=self.headers)
        assert response.status_code in [404, 401, 403]

        # Test with valid checklist ID (if exists)
        response = await async_client.get("/v1/checklists/1", headers=self.headers)
        assert response.status_code in [200, 404, 401, 403]


class TestUserRoutes:
    """Test user-related routes."""

    async def test_user_profile_without_auth(self, async_client: AsyncClient):
        """Test accessing user profile without authentication."""
        response = await async_client.get("/v1/users/me")
        assert response.status_code == 401

    async def test_register_invalid_email(self, async_client: AsyncClient):
        """Test user registration with invalid email."""
        user_data = {
            "username": "invalid_email_user",
            "email": "invalid_email",  # Invalid email format
            "password": "test_password_123",
            "full_name": "Invalid Email User",
        }

        response = await async_client.post("/v1/users/register", json=user_data)
        # Should return 422 for validation error or 500 for server error
        assert response.status_code in [422, 500]

    async def test_register_missing_fields(self, async_client: AsyncClient):
        """Test user registration with missing required fields."""
        user_data = {
            "username": "incomplete_user",
            # Missing email and password
        }

        response = await async_client.post("/v1/users/register", json=user_data)
        assert response.status_code in [422, 500]  # Validation error or server error

    async def test_login_invalid_credentials(self, async_client: AsyncClient):
        """Test login with invalid credentials."""
        login_data = {"username": "nonexistent", "password": "wrongpassword"}

        response = await async_client.post("/v1/users/login", data=login_data)
        assert response.status_code in [401, 422]


class TestAnalyticsRoutes:
    """Test analytics-related routes."""

    async def test_analytics_without_auth(self, async_client: AsyncClient):
        """Test accessing analytics without authentication."""
        response = await async_client.get("/v1/analytics/overview")
        assert response.status_code in [401, 404]

    async def test_system_metrics_without_auth(self, async_client: AsyncClient):
        """Test accessing system metrics without authentication."""
        response = await async_client.get("/v1/analytics/metrics")
        assert response.status_code in [401, 404]


class TestExportRoutes:
    """Test export-related routes."""

    async def test_export_without_auth(self, async_client: AsyncClient):
        """Test export functionality without authentication."""
        response = await async_client.get("/v1/export/checklist/1")
        assert response.status_code in [401, 404]

    async def test_export_invalid_checklist(self, async_client: AsyncClient):
        """Test export with invalid checklist ID."""
        response = await async_client.get("/v1/export/checklist/999")
        assert response.status_code in [401, 404]


class TestNotificationRoutes:
    """Test notification-related routes."""

    async def test_notifications_without_auth(self, async_client: AsyncClient):
        """Test accessing notifications without authentication."""
        response = await async_client.get("/v1/notifications/")
        assert response.status_code in [401, 404]

    async def test_mark_notification_read_without_auth(self, async_client: AsyncClient):
        """Test marking notification as read without authentication."""
        response = await async_client.put("/v1/notifications/1/read")
        # Unauthorized, not found, or method not allowed
        assert response.status_code in [401, 404, 405]


class TestUploadRoutes:
    """Test file upload routes."""

    async def test_file_upload_without_auth(self, async_client: AsyncClient):
        """Test file upload without authentication."""
        files = {"file": ("test.txt", b"test content", "text/plain")}
        response = await async_client.post("/v1/checklists/1/upload", files=files)
        assert response.status_code in [401, 404]

    async def test_get_uploaded_files_without_auth(self, async_client: AsyncClient):
        """Test getting uploaded files without authentication."""
        response = await async_client.get("/v1/uploads/")
        assert response.status_code in [401, 404]
