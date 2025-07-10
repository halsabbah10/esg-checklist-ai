# 🌍 ESG Checklist AI - Enterprise-Grade ESG Compliance Platform

> **AI-powered ESG compliance automation system with advanced analytics, real-time dashboards, multi-format reporting, and comprehensive audit trails.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.116.0-009688.svg?style=flat&logo=FastAPI)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?style=flat&logo=react)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![SQLModel](https://img.shields.io/badge/SQLModel-Latest-red.svg)](https://sqlmodel.tiangolo.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](README.md)

## 🎯 **Project Overview**

The **ESG Checklist AI** is a comprehensive full-stack enterprise solution designed to automate and streamline Environmental, Social, and Governance (ESG) compliance processes. This system leverages cutting-edge AI technology to analyze documents, score compliance, generate insights, and provide actionable feedback for audit teams through modern, responsive dashboards.

### 🚀 **Key Features**

#### **🤖 AI-Powered Analysis**
- Advanced document analysis using Google Gemini and OpenAI
- Real-time compliance scoring with detailed feedback
- Intelligent text extraction from multiple document formats
- AI result analysis with comprehensive scoring metrics

#### **📊 Advanced Analytics & Dashboards**
- **Real-time Analytics Dashboards**: Live performance metrics and KPIs
- **Role-based Dashboards**: Admin, Auditor, and Reviewer specific views
- **Interactive Data Visualization**: Charts, graphs, and trend analysis
- **Compliance Monitoring**: Real-time compliance status tracking

#### **👥 Multi-User Management**
- **Role-based Access Control**: Admin, Auditor, Reviewer permissions
- **User Management**: Complete user lifecycle management
- **Authentication & Security**: JWT-based secure authentication
- **Activity Tracking**: Comprehensive user activity logs

#### **📁 Advanced File Processing**
- **Multi-format Support**: PDF, Excel, Word, CSV, and text documents
- **Drag-and-drop Upload**: Modern file upload interface
- **Large File Handling**: Chunked processing for large documents
- **File Validation**: Security and type validation

#### **🔍 Intelligent Search & Filtering**
- **Advanced Search**: Intelligent search across all content
- **Dynamic Filtering**: Real-time filtering by multiple criteria
- **Sorting & Pagination**: Efficient data navigation
- **Search Analytics**: Search performance tracking

#### **📤 Multi-Format Export System**
- **Format Support**: PDF, Word (DOCX), Excel (XLSX), and CSV exports
- **Professional Reports**: Styled PDF reports with company branding
- **Custom Export Options**: Flexible data export configurations
- **Batch Export**: Multiple format export capabilities

#### **🎨 Modern User Interface**
- **React Frontend**: Modern, responsive Material-UI interface
- **Dark/Light Mode**: Theme customization support
- **Mobile Responsive**: Optimized for all device sizes
- **Accessibility**: WCAG compliant interface design

#### **🔐 Enterprise Security**
- **JWT Authentication**: Secure, stateless authentication
- **Data Protection**: Comprehensive input validation and sanitization
- **Audit Trails**: Complete system activity logging
- **Rate Limiting**: API protection and abuse prevention

#### **📧 Notifications & Communication**
- **Real-time Notifications**: In-app notification system
- **Email Alerts**: Automated email notifications
- **Review System**: Document review and approval workflows
- **Comment System**: Collaborative review and feedback

#### **⚡ High Performance**
- **Async Processing**: Non-blocking I/O operations
- **Caching**: Intelligent query caching with React Query
- **Database Optimization**: Indexed queries and connection pooling
- **Circuit Breakers**: Fault-tolerant service integrations

## 🏗️ **System Architecture**

### **Technology Stack**

#### **Backend**
- **Framework**: FastAPI (Python 3.11+) with async support
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: SQLModel with Alembic migrations
- **AI/ML**: Google Gemini AI, OpenAI GPT, Transformers
- **Authentication**: JWT OAuth2 with role-based access
- **File Processing**: pandas, openpyxl, pdfplumber, python-docx, ReportLab
- **Monitoring**: Structured logging, Prometheus metrics

#### **Frontend**
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Build Tool**: Vite with hot module replacement
- **Styling**: Emotion CSS-in-JS with theme support

#### **Infrastructure**
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Web Server**: nginx for production
- **Development**: Hot reload and live debugging

### **Project Structure**

```
esg-checklist-ai/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── routers/           # API route handlers
│   │   │   ├── analytics.py   # Analytics and reporting endpoints
│   │   │   ├── export.py      # Multi-format export functionality
│   │   │   ├── reviews.py     # Document review workflows
│   │   │   ├── uploads.py     # File upload and processing
│   │   │   └── users.py       # User management and auth
│   │   ├── ai/               # AI integration modules
│   │   │   ├── scorer.py     # AI scoring engine
│   │   │   └── analyzers.py  # Document analysis
│   │   ├── models.py         # Database models with relationships
│   │   ├── auth.py           # Authentication & authorization
│   │   ├── database.py       # Database configuration
│   │   ├── config.py         # Configuration management
│   │   └── utils/            # Utility functions
│   ├── alembic/              # Database migrations
│   └── uploads/              # File upload storage
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── dashboards/   # Dashboard components
│   │   │   ├── forms/        # Form components
│   │   │   └── ui/           # Base UI components
│   │   ├── pages/            # Page components
│   │   │   ├── Analytics.tsx # Analytics dashboard
│   │   │   ├── Reports.tsx   # Reports and exports
│   │   │   ├── Reviews.tsx   # Document review interface
│   │   │   └── Checklists.tsx# Checklist management
│   │   ├── services/         # API service layer
│   │   │   └── api.ts        # API client with type safety
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Frontend utilities
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
├── data/                      # Sample data and configurations
├── docs/                      # Comprehensive documentation
├── samples/                   # Sample ESG files for testing
├── templates/                 # Email and report templates
├── notebooks/                 # Data analysis notebooks
├── docker-compose.yml         # Container orchestration
├── Dockerfile.backend         # Backend container definition
├── Dockerfile.frontend        # Frontend container definition
└── requirements.txt           # Python dependencies
```

## 🚀 **Quick Start Guide**

### **Prerequisites**

- **Backend**: Python 3.11+, Virtual environment support
- **Frontend**: Node.js 18+, npm or yarn
- **Development**: Git, Docker (optional)
- **AI Services**: Google Gemini API key

### **1. Backend Setup**

```bash
# Clone the repository
git clone <repository-url>
cd esg-checklist-ai

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.template .env
# Edit .env with your configuration
```

### **2. Frontend Setup**

```bash
# Frontend setup (in new terminal)
cd frontend
npm install

# Start development server
npm run dev
```

### **3. Configuration**

**Backend Environment (.env):**
```env
SECRET_KEY=your-secure-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=sqlite:///./test.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend Environment:**
```env
VITE_API_BASE_URL=http://localhost:8000
```

### **4. Database Setup**

```bash
# Navigate to backend directory
cd backend

# Initialize database
alembic upgrade head

# Or create tables directly
python -c "from app.models import SQLModel; from app.database import engine; SQLModel.metadata.create_all(engine)"
```

### **5. Start the Application**

```bash
# Terminal 1: Backend server
cd backend
python run_server.py
# Or: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend server
cd frontend
npm run dev
```

### **6. Access the Application**

- **Frontend Application**: http://localhost:3000 or http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Alternative API Docs**: http://localhost:8000/redoc
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
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### **Individual Container Build**

```bash
# Build backend
docker build -f Dockerfile.backend -t esg-backend .

# Build frontend
docker build -f Dockerfile.frontend -t esg-frontend .

# Run containers
docker run -d -p 8000:8000 --name esg-backend esg-backend
docker run -d -p 3000:3000 --name esg-frontend esg-frontend
```

## 📚 **API Documentation**

### **Core Endpoints**

| Endpoint Category | Base Path                     | Description                           |
| ----------------- | ----------------------------- | ------------------------------------- |
| Authentication    | `/v1/users`                   | User management and authentication    |
| Checklists        | `/v1/checklists`              | Checklist CRUD operations             |
| File Upload       | `/v1/checklists/{id}/upload`  | Document upload and AI analysis       |
| Analytics         | `/v1/analytics`               | Performance metrics and insights      |
| Reviews           | `/v1/reviews`                 | Document review and approval workflow |
| Export            | `/v1/export`                  | Multi-format data export             |
| Search            | `/v1/search`                  | Advanced search functionality         |
| Admin             | `/v1/admin`                   | Administrative functions              |
| Notifications     | `/v1/notifications`           | In-app notification system            |

### **New API Features**

- **Multi-format Export**: PDF, Word, Excel, CSV support with professional formatting
- **Real-time Analytics**: Live dashboard data with caching optimization
- **Advanced Search**: Full-text search with filtering and pagination
- **Review Workflows**: Complete document review and approval system
- **Notification System**: Real-time in-app and email notifications
- **Rate Limiting**: API protection with configurable limits

## 🎯 **Usage Examples**

### **1. Frontend Application Usage**

The application provides intuitive dashboards for different user roles:

- **Admin Dashboard**: Complete system overview, user management, analytics
- **Auditor Dashboard**: Compliance monitoring, report generation, analytics
- **Reviewer Dashboard**: Document review queue, approval workflows, AI analysis

### **2. API Integration Examples**

```bash
# Authenticate and get token
curl -X POST "http://localhost:8000/v1/users/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=test@admin.com&password=admin123"

# Upload file for AI analysis
curl -X POST "http://localhost:8000/v1/checklists/1/upload" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@sample_esg_document.pdf"

# Get real-time analytics
curl -X GET "http://localhost:8000/v1/analytics/overall" \
     -H "Authorization: Bearer YOUR_TOKEN"

# Export data in PDF format
curl -X GET "http://localhost:8000/v1/export/checklists?format=pdf" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     --output esg_checklists.pdf

# Search with advanced filters
curl -X GET "http://localhost:8000/v1/search/file-uploads?status=approved&limit=10" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 **Analytics & Reporting**

### **Dashboard Analytics**

- **Real-time Metrics**: Live KPI tracking and performance indicators
- **Role-based Views**: Customized dashboards for different user roles
- **Interactive Charts**: Dynamic data visualization with drill-down capabilities
- **Compliance Monitoring**: Real-time compliance status and trend analysis

### **Advanced Reporting**

- **Multi-format Export**: Professional PDF reports, Word documents, Excel spreadsheets, CSV data
- **Custom Report Generation**: Flexible report configuration and filtering
- **Scheduled Reports**: Automated report generation and distribution
- **Audit Trail Reports**: Comprehensive system activity and user action logs

### **Export Capabilities**

- **PDF Reports**: Professional, styled reports with company branding and charts
- **Word Documents**: Structured documents with tables, headers, and formatting
- **Excel Spreadsheets**: Complete data exports with multiple sheets and formatting
- **CSV Files**: Raw data exports for analysis and integration

## 🎨 **User Interface Features**

### **Modern Design**

- **Material-UI Framework**: Consistent, professional design system
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme**: User preference theme switching
- **Accessibility**: WCAG compliant with keyboard navigation support

### **Interactive Components**

- **Advanced Data Tables**: Sorting, filtering, pagination, and search
- **Drag-and-Drop Upload**: Modern file upload with progress indicators
- **Real-time Notifications**: Toast notifications and alert system
- **Modal Dialogs**: Contextual overlays for detailed information

### **Dashboard Features**

- **Live Data Updates**: Real-time data refresh with React Query
- **Interactive Charts**: Clickable charts with detailed tooltips
- **Advanced Filtering**: Multi-criteria filtering with saved preferences
- **Export Integration**: One-click export from any data view

## 🔐 **Security Features**

### **Authentication & Authorization**

- **JWT Tokens**: Secure, stateless authentication with refresh tokens
- **Role-Based Access Control**: Granular permission system
- **Password Security**: Bcrypt hashing with configurable complexity
- **Session Management**: Configurable token expiration and refresh

### **Data Protection**

- **Input Validation**: Comprehensive request validation with Pydantic
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **File Upload Security**: Type validation, size limits, and content scanning
- **CORS Configuration**: Secure cross-origin request handling

### **Audit & Compliance**

- **Complete Audit Trails**: All system actions logged with timestamps
- **User Activity Tracking**: Login, upload, analysis, and export logs
- **Data Retention Policies**: Configurable retention and cleanup
- **Compliance Reporting**: Regulatory compliance audit support

## 🚀 **Advanced Features**

### **AI Integration**

- **Multiple AI Providers**: Google Gemini and OpenAI support with fallback
- **Circuit Breaker Pattern**: Fault-tolerant AI service integration
- **Retry Logic**: Automatic retry with exponential backoff
- **Performance Monitoring**: AI response time tracking and optimization

### **Performance Optimization**

- **Frontend Caching**: React Query with intelligent cache management
- **Backend Caching**: Redis-based response caching
- **Database Optimization**: Indexed queries and connection pooling
- **Async Processing**: Non-blocking operations throughout the stack

### **Real-time Features**

- **Live Dashboard Updates**: Real-time data refresh without page reload
- **Progressive Loading**: Optimized loading states and skeleton screens
- **Optimistic Updates**: Immediate UI feedback with error recovery
- **Background Processing**: Non-blocking file processing and AI analysis

## 🛠️ **Development Guide**

### **Setting Up Development Environment**

```bash
# Backend development
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
pre-commit install

# Frontend development
cd frontend
npm install
npm run dev

# Run tests
cd backend && pytest
cd frontend && npm test
```

### **Code Quality Tools**

```bash
# Backend code quality
black .                    # Code formatting
isort .                   # Import sorting
flake8 .                  # Linting
bandit -r app/            # Security scanning
pytest --cov=app         # Test coverage

# Frontend code quality
npm run lint              # ESLint
npm run type-check        # TypeScript checking
npm run format            # Prettier formatting
```

### **Database Management**

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Database reset (development only)
rm test.db && alembic upgrade head
```

## 📋 **Configuration Reference**

### **Backend Environment Variables**

| Variable                 | Description                  | Default                           | Required |
| ------------------------ | ---------------------------- | --------------------------------- | -------- |
| `SECRET_KEY`             | JWT signing secret           | -                                 | ✅       |
| `GEMINI_API_KEY`         | Google Gemini API key        | -                                 | ✅       |
| `OPENAI_API_KEY`         | OpenAI API key               | -                                 | ❌       |
| `DATABASE_URL`           | Database connection string   | `sqlite:///./test.db`             | ❌       |
| `ALLOWED_ORIGINS`        | CORS allowed origins         | `http://localhost:3000`           | ❌       |
| `MAX_FILE_SIZE_MB`       | Maximum upload file size     | `50`                              | ❌       |
| `LOG_LEVEL`              | Logging level                | `INFO`                            | ❌       |
| `RATE_LIMIT_REQUESTS`    | Rate limit per minute        | `100`                             | ❌       |
| `CACHE_TTL_SECONDS`      | Cache time-to-live           | `300`                             | ❌       |

### **Frontend Environment Variables**

| Variable                 | Description                  | Default                           | Required |
| ------------------------ | ---------------------------- | --------------------------------- | -------- |
| `VITE_API_BASE_URL`      | Backend API base URL         | `http://localhost:8000`           | ❌       |
| `VITE_APP_TITLE`         | Application title            | `ESG Checklist AI`                | ❌       |
| `VITE_THEME_MODE`        | Default theme mode           | `light`                           | ❌       |

## 🤝 **Contributing**

### **Development Workflow**

1. **Fork the repository** and create feature branch
2. **Setup development environment** (backend + frontend)
3. **Make changes** following code standards
4. **Run tests** and ensure quality checks pass
5. **Commit changes** with descriptive messages
6. **Push to branch** and open Pull Request

### **Code Standards**

- **Backend**: Black formatting, PEP 8 compliance, full type hints
- **Frontend**: ESLint + Prettier, TypeScript strict mode
- **Testing**: Minimum 80% test coverage for critical paths
- **Documentation**: Comprehensive docstrings and comments

## 🐛 **Troubleshooting**

### **Common Issues**

**1. Frontend Build Errors**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

**2. Backend Server Issues**
```bash
# Check Python version and dependencies
python --version  # Should be 3.11+
pip check

# Database connection test
python -c "from app.database import engine; print('DB OK')"
```

**3. AI Analysis Failing**
```bash
# Verify API keys
echo $GEMINI_API_KEY

# Test AI connection
python -c "from app.ai.scorer import test_connection; test_connection()"
```

**4. Export Generation Issues**
```bash
# Check dependencies for report generation
python -c "import reportlab, docx; print('Export dependencies OK')"

# Verify file permissions
ls -la uploads/ exports/
```

## 📞 **Support & Contact**

### **Documentation**

- **API Docs**: http://localhost:8000/docs (Interactive Swagger UI)
- **Frontend Storybook**: http://localhost:6006 (Component library)
- **User Guides**: `/docs/` directory
- **API Reference**: Complete endpoint documentation

### **Getting Help**

- **Issues**: Create detailed GitHub issues with reproduction steps
- **Feature Requests**: Use GitHub discussions for new feature ideas
- **Security**: Report vulnerabilities through secure channels
- **Development**: Contact development team for technical questions

## 📄 **License**

This project is proprietary and confidential. All rights reserved.
No part of this project may be copied, modified, distributed, or used in any form without explicit, written permission from the copyright holder.

## 🙏 **Acknowledgments**

### **Technology Partners**
- **FastAPI**: Modern, fast web framework for building APIs
- **React**: A JavaScript library for building user interfaces
- **Material-UI**: React components for faster and easier web development
- **SQLModel**: SQL databases in Python with type safety
- **Google Gemini**: Advanced AI capabilities for document analysis
- **OpenAI**: Cutting-edge AI language models

### **Project Team**
This project is a collaborative effort by Husam AlSabbah and Zakkaria  
e& Risk and Assurance Department

---

**Made with ❤️ by the e& Risk and Assurance Team**

_Last Updated: January 2025_
_Version: 2.0.0 - Full-Stack Enterprise Edition_