# Backend Tests

This directory contains all backend tests for the ESG Checklist AI application.

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Shared test configuration
├── test_config.py           # Configuration tests
├── unit/                    # Unit tests
│   ├── __init__.py
│   ├── test_models.py       # Database model tests
│   ├── test_schemas.py      # Pydantic schema tests
│   └── test_utils.py        # Utility function tests
├── integration/             # Integration tests
│   ├── __init__.py
│   ├── test_api.py          # API endpoint tests
│   ├── test_database.py     # Database integration tests
│   └── test_auth.py         # Authentication tests
└── e2e/                     # End-to-end tests
    ├── __init__.py
    └── test_workflows.py    # Complete user workflows
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/unit/test_models.py

# Run tests matching pattern
pytest -k "test_auth"

# Run tests in verbose mode
pytest -v
```

## Test Configuration

Tests use a separate test database and configuration to avoid interfering with development data.
