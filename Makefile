# ESG Checklist AI - Development Makefile
# Provides convenient commands for development, testing, and security checks

.PHONY: help install dev-install clean test security lint format docker-build docker-run

# Default target
help:
	@echo "ESG Checklist AI - Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  install        Install production dependencies"
	@echo "  dev-install    Install development dependencies and pre-commit hooks"
	@echo "  clean          Clean up temporary files and caches"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev            Start development server with hot reload"
	@echo "  dev-full       Start both backend and frontend in development mode"
	@echo "  test           Run all tests with coverage"
	@echo "  test-fast      Run tests without coverage (faster)"
	@echo "  test-backend   Run backend tests only"
	@echo "  test-frontend  Run frontend tests only"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  lint           Run all linting checks (ruff, bandit, eslint)"
	@echo "  lint-backend   Run backend linting only"
	@echo "  lint-frontend  Run frontend linting only"
	@echo "  format         Format code with black, ruff, and prettier"
	@echo "  format-backend Format backend code only"
	@echo "  format-frontend Format frontend code only"
	@echo "  check          Run comprehensive quality checks"
	@echo "  fix            Auto-fix all fixable issues"
	@echo "  pre-commit     Run pre-commit hooks on all files"
	@echo ""
	@echo "Security Commands:"
	@echo "  security       Run comprehensive security checks"
	@echo "  bandit         Run bandit security scanner"
	@echo "  ruff-security  Run ruff with security rules only"
	@echo "  secrets-scan   Scan for hardcoded secrets"
	@echo "  safety-check   Check for known vulnerabilities"
	@echo "  audit          Run pip-audit for dependency vulnerabilities"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build   Build Docker image"
	@echo "  docker-run     Run application in Docker container"
	@echo "  docker-dev     Run development environment with Docker Compose"
	@echo "  docker-test    Run tests in Docker environment"
	@echo ""
	@echo "Integration Commands:"
	@echo "  db-setup       Set up test database"
	@echo "  integration    Run integration tests"
	@echo "  e2e            Run end-to-end test suite"
	@echo ""
	@echo "Advanced Testing Commands:"
	@echo "  test-integration      Run backend integration tests"
	@echo "  test-e2e             Run comprehensive end-to-end tests"
	@echo "  test-contracts       Run API contract tests"
	@echo "  test-load            Run performance and load tests"
	@echo "  test-frontend-unit   Run frontend unit tests"
	@echo "  test-frontend-coverage Run frontend tests with coverage"
	@echo "  test-all-comprehensive Run all tests (backend + frontend + integration)"
	@echo ""
	@echo "Quality Assurance Commands:"
	@echo "  qa-full              Run complete quality assurance suite"
	@echo "  qa-ci                Run CI-optimized quality checks"
	@echo "  dev-setup-complete   Complete development environment setup"
	@echo "  dev-check            Quick development pre-commit check"
	@echo "  db-migrate     Run database migrations"
	@echo "  db-reset       Reset database to clean state"
	@echo "  integration-test Run integration tests"
	@echo "  e2e-test       Run end-to-end tests"
	@echo ""

# Setup commands
install:
	pip install -r requirements.txt

dev-install:
	pip install -r requirements.txt
	pip install -e ".[dev]"
	pre-commit install
	@echo "Development environment setup complete!"

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf dist/
	rm -rf build/
	rm -rf *.egg-info/

# Development commands
dev:
	cd backend && python run_server.py

test:
	cd backend && pytest --cov=app --cov-report=html --cov-report=term-missing -v

test-fast:
	cd backend && pytest -v

test-backend:
	PYTHONPATH=backend pytest backend -v

test-frontend:
	cd frontend && npm run test:run

frontend-install:
	cd frontend && npm install

# Advanced Testing Commands
test-integration:
	@echo "Running integration tests..."
	python -m pytest backend/tests/test_integration_api.py -v

test-e2e:
	@echo "Running end-to-end tests..."
	python tools/e2e_test_runner.py

test-contracts:
	@echo "Running contract tests..."
	python tools/contract_testing.py

test-load:
	@echo "Running load tests..."
	python -m pytest backend/tests/test_integration_api.py::TestPerformanceAndLoad -v

test-frontend-unit:
	@echo "Running frontend unit tests..."
	cd frontend && npm run test:run

test-frontend-coverage:
	@echo "Running frontend tests with coverage..."
	cd frontend && npm run test:coverage

test-all-comprehensive:
	@echo "Running comprehensive test suite..."
	make test-backend
	make test-frontend-unit
	make test-integration
	make test-contracts

# Code quality commands
lint: ruff-check bandit
	@echo "All linting checks completed!"

lint-backend:
	ruff check backend/ --show-source
	bandit -r backend/ -ll -f text

lint-frontend:
	cd frontend && npm run lint

format-backend:
	black backend/
	ruff format backend/
	ruff check backend/ --fix

format-frontend:
	cd frontend && npm run format

format:
	make format-backend
	make format-frontend
	@echo "Code formatting completed!"

ruff-check:
	ruff check backend/ --show-source

ruff-security:
	ruff check backend/ --select=S --show-source

bandit:
	bandit -r backend/ -ll -f text


pre-commit:
	pre-commit run --all-files

# Security commands
security: bandit ruff-security secrets-scan safety-check
	@echo "Comprehensive security scan completed!"

secrets-scan:
	detect-secrets scan --baseline .secrets.baseline --exclude-files '\.env\.template$$|\.env\.example$$'

safety-check:
	safety check

audit:
	pip-audit --require requirements.txt

# Docker commands
docker-build:
	docker build -t esg-checklist-ai .

docker-run:
	docker run -p 8000:8000 --env-file .env esg-checklist-ai

docker-dev:
	docker-compose up --build

# Database commands
db-migrate:
	cd backend && alembic upgrade head

db-revision:
	cd backend && alembic revision --autogenerate -m "$(MESSAGE)"

db-reset:
	cd backend && rm -f test.db && alembic upgrade head

# CI/CD simulation
ci-security:
	@echo "Running CI security pipeline locally..."
	$(MAKE) lint
	$(MAKE) security
	$(MAKE) test
	@echo "CI security pipeline completed successfully!"

# Development utilities
check-env:
	@echo "Checking environment configuration..."
	cd backend && python -c "from app.config import get_settings; settings = get_settings(); print('✅ Configuration loaded successfully')"

install-hooks:
	pre-commit install --install-hooks

update-deps:
	pip-compile requirements.in
	pip-compile requirements-dev.in

# Performance testing
load-test:
	@echo "Load testing not implemented yet"
	@echo "Consider adding locust or similar tool"

# Documentation
docs:
	@echo "Documentation generation not implemented yet"
	@echo "Consider adding sphinx or mkdocs"

# Monitoring setup
setup-monitoring:
	@echo "Setting up monitoring stack..."
	@echo "This would typically set up Prometheus, Grafana, etc."

# Quality Assurance Commands
qa-full:
	@echo "Running full quality assurance..."
	make lint
	make format-check
	make test-all-comprehensive
	make security

qa-ci:
	@echo "Running CI quality checks..."
	make check
	make test-backend
	make test-frontend-unit
	make security

# Development Workflow Commands
dev-setup-complete:
	@echo "Complete development setup..."
	make dev-install
	make db-setup
	make test-all-comprehensive

dev-check:
	@echo "Development pre-commit check..."
	make lint
	make format
	make test-backend
	make test-frontend-unit
