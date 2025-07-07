# 🌍 ESG Checklist AI - Enterprise-Grade ESG Compliance Platform

> **AI-powered ESG compliance automation system with advanced analytics, multi-user management, and comprehensive audit trails.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?style=flat&logo=FastAPI)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=flat&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![SQLModel](https://img.shields.io/badge/SQLModel-Latest-red.svg)](https://sqlmodel.tiangolo.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](README.md)

## 🎯 **Project Overview**

The **ESG Checklist AI** is a comprehensive enterprise solution designed to automate and streamline Environmental, Social, and Governance (ESG) compliance processes. This system leverages cutting-edge AI technology to analyze documents, score compliance, generate insights, and provide actionable feedback for audit teams.

### 🚀 **Key Features**

- **🤖 AI-Powered Analysis**: Advanced document analysis using Google Gemini and OpenAI
- **📊 Real-Time Analytics**: Comprehensive dashboards and reporting capabilities
- **👥 Multi-User Management**: Role-based access control (Admin, Auditor, Reviewer)
- **📁 File Processing**: Support for PDF, Excel, Word, and text documents
- **🔍 Advanced Search**: Intelligent search and filtering across all content
- **📤 Data Export**: Multiple export formats (CSV, Excel, PDF, JSON)
- **🔐 Enterprise Security**: JWT authentication, audit trails, and data protection
- **📧 Notifications**: Automated email alerts and system notifications
- **⚡ High Performance**: Async processing, caching, and circuit breakers

## 🏗️ **System Architecture**

### **Technology Stack**

- **Backend**: FastAPI (Python 3.11+)
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: SQLModel with Alembic migrations
- **AI/ML**: Google Gemini AI, OpenAI GPT, Transformers
- **Authentication**: JWT OAuth2 with role-based access
- **File Processing**: pandas, openpyxl, pdfplumber, python-docx
- **Monitoring**: Structured logging, Prometheus metrics
- **Deployment**: Docker, Docker Compose, nginx

### **Project Structure**

```
esg-checklist-ai/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── routers/           # API route handlers
│   │   ├── models.py          # Database models
│   │   ├── auth.py            # Authentication & authorization
│   │   ├── config.py          # Configuration management
│   │   └── utils/             # Utility functions
│   ├── alembic/               # Database migrations
│   └── uploads/               # File upload storage
├── data/                      # Sample data and configurations
├── docs/                      # Documentation
├── samples/                   # Sample ESG files for testing
├── templates/                 # Email and report templates
├── notebooks/                 # Data analysis notebooks
├── docker-compose.yml         # Container orchestration
├── Dockerfile                 # Container definition
└── requirements.txt           # Python dependencies
```

## 🚀 **Quick Start Guide**

### **Prerequisites**

- Python 3.11+
- Virtual environment support
- Git
- Optional: Docker and Docker Compose

### **1. Installation**

```bash
# Clone the repository
git clone <repository-url>
cd esg-checklist-ai

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### **2. Configuration**

```bash
# Copy environment template
cp .env.template .env

# Edit configuration (required)
nano .env  # or your preferred editor
```

**Essential Configuration:**

```env
SECRET_KEY=your-secure-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=sqlite:///./test.db
```

### **3. Database Setup**

```bash
# Navigate to backend directory
cd backend

# Initialize database
python -c "from app.models import SQLModel; from app.database import engine; SQLModel.metadata.create_all(engine)"

# Or use Alembic for migrations
alembic upgrade head
```

### **4. Start the Server**

```bash
# Development server
python run_server.py

# Or using uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### **5. Access the Application**

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🔑 **Default Login Credentials**

```
Email: test@admin.com
Password: admin123
Role: Administrator
```

## 🐳 **Docker Deployment**

### **Using Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### **Manual Docker Build**

```bash
# Build image
docker build -t esg-checklist-ai .

# Run container
docker run -d -p 8000:8000 --name esg-api esg-checklist-ai
```

## 📚 **API Documentation**

The system provides comprehensive API documentation with interactive testing capabilities:

### **Core Endpoints**

| Endpoint Category | Base Path                 | Description                        |
| ----------------- | ------------------------- | ---------------------------------- |
| Authentication    | `/users`                  | User management and authentication |
| Checklists        | `/checklists`             | Checklist CRUD operations          |
| File Upload       | `/checklists/{id}/upload` | Document upload and AI analysis    |
| Analytics         | `/analytics`              | Performance metrics and insights   |
| Search            | `/checklists/search`      | Advanced search functionality      |
| Export            | `/export`                 | Data export in multiple formats    |
| Admin             | `/admin`                  | Administrative functions           |
| Audit             | `/audit`                  | System audit logs                  |

### **Key API Features**

- **Interactive Documentation**: Swagger UI with live testing
- **Authentication**: JWT Bearer token support
- **Role-based Access**: Admin, Auditor, Reviewer permissions
- **File Upload**: Drag-and-drop file processing
- **Real-time Analytics**: Live performance metrics
- **Export Capabilities**: CSV, Excel, PDF, JSON formats

## 🎯 **Usage Examples**

### **1. Upload and Analyze ESG Document**

```bash
# Authenticate
curl -X POST "http://localhost:8000/users/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=test@admin.com&password=admin123"

# Upload file for analysis
curl -X POST "http://localhost:8000/checklists/1/upload" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@sample_esg_document.pdf"
```

### **2. Get Analytics Dashboard Data**

```bash
curl -X GET "http://localhost:8000/analytics/overall" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Search Checklists**

```bash
curl -X GET "http://localhost:8000/checklists/search?q=environmental&limit=10" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### **4. Export Data**

```bash
curl -X GET "http://localhost:8000/export/ai-results?format=csv" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     --output ai_results.csv
```

## 📊 **Analytics & Reporting**

### **Available Analytics**

- **Overall System Metrics**: User activity, file uploads, AI analysis results
- **Checklist Performance**: Completion rates, average scores, trending
- **User Analytics**: Individual performance, role-based insights
- **AI Scoring Trends**: Historical scoring patterns and improvements
- **Compliance Dashboards**: Real-time compliance status monitoring

### **Export Capabilities**

- **Format Support**: CSV, Excel, PDF, JSON
- **Filtered Exports**: Date ranges, user groups, score thresholds
- **Scheduled Reports**: Automated report generation
- **Audit Trails**: Complete system activity logs

## 🔐 **Security Features**

### **Authentication & Authorization**

- **JWT Tokens**: Secure, stateless authentication
- **Role-Based Access**: Granular permission control
- **Password Security**: Bcrypt hashing with salt
- **Session Management**: Configurable token expiration

### **Data Protection**

- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Type validation and size limits
- **CORS Configuration**: Cross-origin request protection

### **Audit & Compliance**

- **Complete Audit Trails**: All system actions logged
- **User Activity Tracking**: Login, upload, and analysis logs
- **Data Retention Policies**: Configurable retention periods
- **Compliance Reporting**: Regulatory compliance support

## 🚀 **Advanced Features**

### **AI Integration**

- **Multiple AI Providers**: Google Gemini, OpenAI support
- **Circuit Breaker Pattern**: Fault-tolerant AI service calls
- **Retry Logic**: Automatic retry with exponential backoff
- **Performance Monitoring**: AI response time tracking

### **File Processing**

- **Multi-format Support**: PDF, Excel, Word, CSV, Text
- **Intelligent Text Extraction**: OCR and structured data parsing
- **Large File Handling**: Chunked processing for large documents
- **Metadata Extraction**: Document properties and statistics

### **Performance Optimization**

- **Async Processing**: Non-blocking I/O operations
- **Caching Layer**: Redis-based response caching
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections

## 🛠️ **Development Guide**

### **Setting Up Development Environment**

```bash
# Install development dependencies
pip install -r requirements.txt

# Install pre-commit hooks
pre-commit install

# Run tests
pytest

# Code formatting
black .
isort .
flake8 .
```

### **Database Management**

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### **Running Tests**

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_api.py
```

## 📋 **Configuration Reference**

### **Environment Variables**

| Variable           | Description                | Default                         | Required |
| ------------------ | -------------------------- | ------------------------------- | -------- |
| `SECRET_KEY`       | JWT signing secret         | -                               | ✅       |
| `GEMINI_API_KEY`   | Google Gemini API key      | -                               | ✅       |
| `DATABASE_URL`     | Database connection string | `sqlite:///./test.db`           | ❌       |
| `ALLOWED_ORIGINS`  | CORS allowed origins       | `localhost:3000,localhost:8080` | ❌       |
| `MAX_FILE_SIZE_MB` | Maximum upload file size   | `50`                            | ❌       |
| `LOG_LEVEL`        | Logging level              | `INFO`                          | ❌       |

### **Database Configuration**

The system supports multiple database backends:

- **SQLite** (default): `sqlite:///./test.db`
- **PostgreSQL**: `postgresql://user:pass@localhost/db`
- **MySQL**: `mysql://user:pass@localhost/db`

## 🤝 **Contributing**

### **Development Workflow**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and test**: `pytest && black . && flake8 .`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open Pull Request**

### **Code Standards**

- **Python Style**: Black formatting, PEP 8 compliance
- **Type Hints**: Full type annotation coverage
- **Documentation**: Comprehensive docstrings
- **Testing**: Minimum 80% test coverage

## 🐛 **Troubleshooting**

### **Common Issues**

**1. Server Won't Start**

```bash
# Check Python version
python --version  # Should be 3.11+

# Verify dependencies
pip check

# Check database connection
python -c "from app.database import engine; print('DB OK')"
```

**2. AI Analysis Failing**

```bash
# Verify API keys
echo $GEMINI_API_KEY

# Test AI connection
python -c "from app.utils.ai import test_connection; test_connection()"
```

**3. File Upload Issues**

```bash
# Check upload directory permissions
ls -la uploads/

# Verify file size limits
grep MAX_FILE_SIZE .env
```

## 📞 **Support & Contact**

### **Documentation**

- **API Docs**: http://localhost:8000/docs
- **User Guide**: `/docs/user-guide.md`
- **Admin Guide**: `/docs/admin-guide.md`
- **Deployment Guide**: `/docs/deployment-guide.md`

### **Project Team**

This project is a collaborative effort by Husam AlSabbah and Zakkaria  
e& Risk and Assurance Department

### **Getting Help**

- **Issues**: Create GitHub issue with detailed description
- **Questions**: Contact development team
- **Security**: Report vulnerabilities privately

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLModel**: SQL databases in Python, designed for simplicity and compatibility
- **Google Gemini**: Advanced AI capabilities for document analysis
- **Contributors**: All team members who contributed to this project

---

**Made with ❤️ by the e& Risk and Assurance Team**

_Last Updated: July 2025_
