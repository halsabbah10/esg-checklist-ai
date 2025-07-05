# Tools Directory

This directory contains utility scripts and tools for the ESG Checklist AI project.

## Available Tools

### `contract_testing.py`

API contract testing utility that validates frontend-backend communication contracts.

**Usage:**

```bash
python tools/contract_testing.py
```

**Features:**

- Validates request/response schemas between frontend and backend
- Generates TypeScript type definitions from API contracts
- Exports contract specifications for frontend consumption

### `e2e_test_runner.py`

Comprehensive end-to-end test runner for the entire application stack.

**Usage:**

```bash
python tools/e2e_test_runner.py
```

**Features:**

- Runs backend unit tests
- Runs frontend unit tests
- Performs integration testing
- Validates API endpoints
- Tests authentication workflows
- Checks file upload functionality

## Development Workflow

1. **Contract Testing**: Run before major API changes to ensure frontend-backend compatibility
2. **E2E Testing**: Run before deployments to validate the entire application stack
3. **Integration with CI/CD**: These tools can be integrated into GitHub Actions workflows

## Configuration

Both tools respect the project's configuration settings and can be run in development or testing environments.
