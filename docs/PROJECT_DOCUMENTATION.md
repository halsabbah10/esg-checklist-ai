# ESG Checklist AI - Project Documentation

## Table of Contents

- [Project Overview](#project-overview)
- [Configuration Management](#configuration-management)
- [Security Implementation](#security-implementation)
- [Architecture](#architecture)
- [Environment Setup](#environment-setup)
- [API Documentation](#api-documentation)
- [File Upload Security](#file-upload-security)
- [AI Integration](#ai-integration)
- [Email Notifications](#email-notifications)
- [Logging and Monitoring](#logging-and-monitoring)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Project Overview

ESG Checklist AI is a comprehensive enterprise application for Environmental, Social, and Governance (ESG) assessment and reporting. The application provides AI-powered analysis of ESG documents, automated checklist generation, and detailed reporting capabilities.

### Key Features

- **AI-Powered Analysis**: Integration with multiple AI providers (Gemini, OpenAI, EAND)
- **Secure File Upload**: Comprehensive validation and security checks
- **Automated Reporting**: Generate detailed ESG assessment reports
- **Email Notifications**: Automated notifications for completed assessments
- **RESTful API**: Versioned API endpoints with comprehensive documentation
- **Enterprise Security**: HTTPS enforcement, HSTS, and comprehensive security measures

### Technology Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite/PostgreSQL (configurable)
- **AI Integration**: Google Gemini, OpenAI GPT
- **Authentication**: JWT-based authentication
- **Email**: SMTP and Microsoft Outlook/Graph API support
- **Security**: Static analysis with bandit and ruff
- **Deployment**: Docker containerization

## Configuration Management

The application uses centralized configuration management with Pydantic BaseSettings for type safety and validation.

### Configuration Structure

```python
# Configuration is centralized in backend/app/config.py
class Settings(BaseSettings):
    # Application Metadata
    app_name: str = "ESG Checklist AI"
    app_version: str = "1.0.0"
    api_version: str = "v1"
    environment: str = "development"

    # Server Configuration
    host: str = "127.0.0.1"
    port: int = 8000

    # Security Configuration
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # AI Configuration
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    ai_scorer: str = "gemini"

    # Email Configuration
    smtp_server: Optional[str] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

    # File Upload Security
    max_file_size_mb: int = 50
    allowed_file_extensions: str = ".pdf,.docx,.xlsx,.csv,.txt"
```

### Environment Variables

All configuration is loaded from `.env` file with fallback defaults:

```bash
# Application
APP_NAME=ESG Checklist AI
APP_VERSION=1.0.0
ENVIRONMENT=development

# Server
HOST=127.0.0.1
PORT=8000

# Database
DATABASE_URL=sqlite:///./test.db

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
AI_SCORER=gemini

# Email (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# Email (Microsoft Outlook)
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
OUTLOOK_TENANT_ID=your-outlook-tenant-id
OUTLOOK_SENDER_ADDRESS=your-email@outlook.com

# File Upload
MAX_FILE_SIZE_MB=50
UPLOAD_PATH=uploads
ALLOWED_FILE_EXTENSIONS=.pdf,.docx,.xlsx,.csv,.txt

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
ALLOWED_HOSTS=localhost,127.0.0.1,testserver

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

## Security Implementation

### Security Measures Implemented

1. **Centralized Configuration**: All secrets loaded from environment variables
2. **HTTPS Enforcement**: Automatic HTTPS redirect in production
3. **HSTS Headers**: HTTP Strict Transport Security implementation
4. **Secure File Upload**: Comprehensive validation (extension, MIME type, size)
5. **Static Analysis**: Integrated bandit and ruff security checks
6. **JWT Authentication**: Secure token-based authentication
7. **Input Validation**: Pydantic schemas for all API inputs
8. **Error Handling**: Secure error responses without information leakage

### File Upload Security

Implemented in `backend/app/utils/file_security.py`:

```python
class FileSecurityValidator:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.allowed_extensions = self._parse_extensions()
        self.max_size_bytes = settings.max_file_size_mb * 1024 * 1024

    def validate_file(self, file: UploadFile) -> ValidationResult:
        """Comprehensive file validation"""
        # Extension validation
        # MIME type validation
        # File size validation
        # Filename sanitization
        # Content validation
```

### Security Scanning

Continuous security scanning with:

- **bandit**: Security issues in Python code
- **ruff**: Code quality and security linting
- **pre-commit hooks**: Automated checks before commits
- **CI/CD pipeline**: Automated security checks on every push

## Architecture

### Project Structure

```
esg-checklist-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Centralized configuration
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # Authentication
│   │   ├── routers/             # API route modules
│   │   │   ├── auth.py
│   │   │   ├── checklists.py
│   │   │   ├── analytics.py
│   │   │   └── health.py
│   │   ├── ai/                  # AI integration
│   │   │   ├── scorer.py
│   │   │   └── prompts.py
│   │   └── utils/               # Utility modules
│   │       ├── emailer.py
│   │       ├── file_security.py
│   │       └── notification_emailer.py
│   ├── alembic/                 # Database migrations
│   └── run_server.py            # Server startup
├── data/                        # Data files and configurations
├── docs/                        # Documentation
├── notebooks/                   # Jupyter notebooks for analysis
├── samples/                     # Sample files
├── templates/                   # Report templates
├── .env                         # Environment variables
├── .env.template               # Environment template
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Docker image
├── requirements.txt            # Python dependencies
└── pyproject.toml             # Project configuration
```

### API Endpoints

All API endpoints are versioned under `/v1`:

```
GET  /v1/health                 # Health check
POST /v1/auth/login            # User authentication
POST /v1/auth/register         # User registration
GET  /v1/checklists            # List checklists
POST /v1/checklists            # Create checklist
GET  /v1/checklists/{id}       # Get checklist
PUT  /v1/checklists/{id}       # Update checklist
DELETE /v1/checklists/{id}     # Delete checklist
POST /v1/checklists/{id}/upload # Upload documents
GET  /v1/analytics             # Analytics data
GET  /v1/docs                  # API documentation
```

## Environment Setup

### Prerequisites

- Python 3.8+
- Node.js 16+ (for frontend development)
- Docker (for containerized deployment)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd esg-checklist-ai
   ```

2. **Set up Python environment**:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment**:

   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

4. **Initialize database**:

   ```bash
   python -m alembic upgrade head
   ```

5. **Start the server**:
   ```bash
   python run_server.py
   ```

### Development Setup

1. **Install pre-commit hooks**:

   ```bash
   pip install pre-commit
   pre-commit install
   ```

2. **Run security checks**:

   ```bash
   make security-check
   ```

3. **Run tests**:
   ```bash
   make test
   ```

## API Documentation

### Interactive Documentation

- **Swagger UI**: Available at `http://localhost:8000/v1/docs`
- **ReDoc**: Available at `http://localhost:8000/v1/redoc`
- **OpenAPI Schema**: Available at `http://localhost:8000/v1/openapi.json`

### Authentication

The API uses JWT-based authentication:

```python
# Login request
POST /v1/auth/login
{
    "username": "user@example.com",
    "password": "password"
}

# Response
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
}

# Authenticated requests
Authorization: Bearer <access_token>
```

### Error Handling

Standardized error responses:

```json
{
  "detail": "Error description",
  "type": "error_type",
  "code": 400
}
```

## File Upload Security

### Validation Process

1. **Extension Check**: Validate against allowed extensions
2. **MIME Type Validation**: Verify actual file content matches extension
3. **File Size Limit**: Enforce maximum file size
4. **Filename Sanitization**: Remove dangerous characters
5. **Content Scanning**: Basic malware detection

### Supported File Types

- **Documents**: PDF, DOCX, TXT
- **Spreadsheets**: XLSX, CSV
- **Configuration**: JSON, YAML (admin only)

### Security Features

- Virus scanning integration ready
- Quarantine directory for suspicious files
- Audit logging for all uploads
- Rate limiting on upload endpoints

## AI Integration

### Supported Providers

1. **Google Gemini**: Primary AI provider
2. **OpenAI GPT**: Alternative provider
3. **EAND**: Custom enterprise AI

### AI Configuration

```python
# AI settings in config.py
ai_scorer: str = "gemini"
gemini_api_key: Optional[str] = None
openai_api_key: Optional[str] = None
ai_timeout_seconds: int = 30
ai_max_retries: int = 3
ai_model_temperature: float = 0.7
ai_max_tokens: int = 2048
```

### AI Features

- **Document Analysis**: Extract ESG metrics from documents
- **Checklist Generation**: Generate tailored ESG checklists
- **Scoring**: Automated ESG compliance scoring
- **Recommendations**: AI-generated improvement suggestions

## Email Notifications

### SMTP Configuration

```python
# SMTP settings
smtp_server: str = "smtp.gmail.com"
smtp_port: int = 587
smtp_username: str = "your-email@gmail.com"
smtp_password: str = "your-app-password"
smtp_use_tls: bool = True
```

### Microsoft Outlook Integration

```python
# Outlook/Graph API settings
outlook_client_id: str = "your-client-id"
outlook_client_secret: str = "your-client-secret"
outlook_tenant_id: str = "your-tenant-id"
outlook_sender_address: str = "your-email@outlook.com"
```

### Notification Types

- Checklist completion notifications
- Analysis result summaries
- System alerts and warnings
- Weekly/monthly reports

## Logging and Monitoring

### Logging Configuration

```python
# Comprehensive logging setup
log_level: str = "INFO"
log_file: str = "logs/app.log"
log_rotation: str = "1 day"
log_retention: str = "30 days"
```

### Log Formats

- **Console**: Structured logging for development
- **File**: Rotating file logs for production
- **JSON**: Structured logs for monitoring systems

### Monitoring Features

- Health check endpoints
- Metrics collection
- Performance monitoring
- Error tracking and alerting

## Development Workflow

### Code Quality

- **Pre-commit hooks**: Automated code formatting and linting
- **Static analysis**: Security and quality checks
- **Type checking**: MyPy type validation
- **Testing**: Comprehensive test suite

### Security Workflow

1. **Development**: Security checks in IDE
2. **Pre-commit**: Automated security scanning
3. **CI/CD**: Continuous security validation
4. **Deployment**: Security verification before release

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature

# Pre-commit hooks automatically run:
# - ruff linting
# - bandit security checks
# - mypy type checking
# - pytest testing
```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t esg-checklist-ai .
docker run -p 8000:8000 esg-checklist-ai
```

### Production Configuration

```bash
# Production environment variables
ENVIRONMENT=production
SECRET_KEY=<secure-random-key>
DATABASE_URL=postgresql://user:password@host:port/database
GEMINI_API_KEY=<your-api-key>
SMTP_SERVER=<your-smtp-server>
```

### Security Considerations

- Use environment-specific `.env` files
- Rotate API keys regularly
- Monitor access logs
- Enable HTTPS in production
- Use reverse proxy (Nginx) for SSL termination

## Testing

### Test Coverage

- Unit tests for core functionality
- Integration tests for API endpoints
- Security tests for authentication
- File upload security tests

### Running Tests

```bash
# Run all tests
make test

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/security/
```

### Test Configuration

```python
# Test settings override
testing_mode: bool = True
database_url: str = "sqlite:///./test.db"
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check DATABASE_URL configuration
   - Verify database server is running
   - Check network connectivity

2. **AI API Errors**

   - Verify API keys are valid
   - Check API rate limits
   - Monitor AI service status

3. **Email Delivery Issues**

   - Verify SMTP credentials
   - Check firewall settings
   - Test email configuration

4. **File Upload Failures**
   - Check file size limits
   - Verify allowed file types
   - Check upload directory permissions

### Debug Mode

Enable debug mode for detailed error information:

```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

### Health Checks

Monitor application health:

```bash
curl http://localhost:8000/v1/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-07-04T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "ai_service": "healthy",
    "email_service": "healthy"
  }
}
```

## Configuration Validation

### Required Settings Validation

The application validates required settings on startup:

```python
def validate_required_settings():
    """Validate required settings for production"""
    if settings.environment.lower() == "production":
        # Validate SECRET_KEY
        # Validate AI API keys
        # Validate email configuration
        # Validate database connection
```

### Development vs Production

- **Development**: Relaxed validation, detailed error messages
- **Production**: Strict validation, secure error handling

## Future Enhancements

### Planned Features

- **Advanced Analytics**: Machine learning insights
- **Multi-tenant Support**: Organization isolation
- **Real-time Collaboration**: WebSocket integration
- **Mobile App**: React Native application
- **Advanced Security**: OAuth2, SSO integration

### Performance Optimizations

- **Caching**: Redis integration for performance
- **Background Tasks**: Celery for async processing
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Static asset delivery

---

## Project Status: Production Ready ✅

The ESG Checklist AI application is now production-ready with:

- ✅ Centralized configuration management
- ✅ Comprehensive security implementation
- ✅ Versioned API endpoints
- ✅ Secure file upload validation
- ✅ AI integration with multiple providers
- ✅ Email notification system
- ✅ Comprehensive logging and monitoring
- ✅ Docker containerization
- ✅ CI/CD security pipeline
- ✅ Complete documentation

**Last Updated**: July 4, 2025
**Version**: 1.0.0
**Environment**: Production Ready
