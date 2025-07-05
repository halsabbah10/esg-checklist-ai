"""Basic API endpoint tests for the ESG Checklist AI backend."""

import pytest


@pytest.mark.asyncio
async def test_health_endpoint(async_client):
    """Test the health check endpoint."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint(async_client):
    """Test the root endpoint."""
    response = await async_client.get("/")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_api_docs_accessible(async_client):
    """Test that API documentation is accessible."""
    response = await async_client.get("/v1/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(async_client):
    """Test that OpenAPI schema is accessible."""
    response = await async_client.get("/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
