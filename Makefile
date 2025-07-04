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
	@echo "  test           Run all tests with coverage"
	@echo "  test-fast      Run tests without coverage (faster)"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  lint           Run all linting checks (ruff, bandit, mypy)"
	@echo "  format         Format code with black and ruff"
	@echo "  security       Run comprehensive security checks"
	@echo "  pre-commit     Run pre-commit hooks on all files"
	@echo ""
	@echo "Security Commands:"
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
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
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

# Code quality commands
lint: ruff-check bandit mypy
	@echo "All linting checks completed!"

format:
	black backend/
	ruff format backend/
	ruff check backend/ --fix
	@echo "Code formatting completed!"

ruff-check:
	ruff check backend/ --show-source

ruff-security:
	ruff check backend/ --select=S --show-source

bandit:
	bandit -r backend/ -ll -f text

mypy:
	mypy backend/app/

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
