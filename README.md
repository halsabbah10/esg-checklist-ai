# 🌍 ESG Checklist AI - Enterprise ESG Compliance Platform

> **AI-powered ESG compliance automation with multi-provider AI analysis, real-time dashboards, comprehensive reporting, and role-based workflows.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.116.0-009688.svg?style=flat&logo=FastAPI)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg?style=flat&logo=react)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg?style=flat&logo=typescript)](https://typescriptlang.org)
[![SQLModel](https://img.shields.io/badge/SQLModel-Latest-red.svg)](https://sqlmodel.tiangolo.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](README.md)

## 🎯 **Project Overview**

The **ESG Checklist AI** is a comprehensive enterprise solution for Environmental, Social, and Governance (ESG) compliance management. Built with modern full-stack technologies, it leverages multiple AI providers to analyze documents, assess compliance, and provide actionable insights through role-based dashboards.

### 🚀 **Core Capabilities**

#### **🤖 Multi-Provider AI Analysis**
- **Primary AI**: Google Gemini 2.0 Flash Exp for advanced document analysis
- **Secondary AI**: OpenAI GPT, DeepSeek Reasoner, and e& internal API
- **Automatic Failover**: Seamless provider switching with circuit breaker pattern
- **Department-Specific Analysis**: Tailored analysis for 10+ specialized departments

#### **📊 Advanced Analytics & Dashboards**
- **Role-Based Dashboards**: Admin, Reviewer, and Auditor-specific views
- **Real-Time Metrics**: Live compliance tracking with WebSocket updates
- **Interactive Visualization**: Charts, graphs, and trend analysis with Recharts
- **Comprehensive KPIs**: Completeness metrics, compliance scores, audit statistics

#### **👥 Role-Based Access Control**
- **Four User Roles**: super_admin → admin → reviewer → auditor hierarchy
- **Granular Permissions**: Department-specific and function-based access
- **JWT Authentication**: Secure, stateless authentication with refresh tokens
- **Comprehensive Audit Trail**: All user actions logged with detailed metadata

#### **📁 Advanced Document Processing**
- **Multi-Format Support**: PDF, DOCX, XLSX, CSV, TXT with intelligent parsing
- **Excel Integration**: Advanced spreadsheet viewer using Luckysheet
- **Large File Handling**: Chunked upload and processing
- **Document Streaming**: Efficient file viewing and download

#### **📤 Professional Export System**
- **Multi-Format Export**: PDF reports, Word documents, Excel spreadsheets, CSV data
- **BRD-Compliant Reports**: Specialized reporting for regulatory requirements
- **Professional Styling**: Branded reports with charts and formatting
- **Batch Processing**: Multiple format generation in single operation

## 🏗️ **Architecture & Technology Stack**

### **Backend (Python/FastAPI)**
```
Framework: FastAPI 0.116.0 with full async support
Database: SQLite (dev) / PostgreSQL (prod) with SQLModel ORM
AI Providers: Gemini, OpenAI, DeepSeek, e& ChatGPT
Authentication: JWT OAuth2 with role-based permissions
Document Processing: pandas, openpyxl, pdfplumber, python-docx, ReportLab
Email System: SMTP with Jinja2 HTML templates
Security: Comprehensive audit logging, rate limiting, input validation
```

### **Frontend (React/TypeScript)**
```
Framework: React 19.1.0 with TypeScript 5.8.3
UI Library: Material-UI v7.2.0 with custom theming
State Management: React Query v5.81.5 for data fetching and caching
Routing: React Router v7.6.3 with lazy loading and protected routes
Build Tool: Vite v7.0.0 with hot module replacement
Data Visualization: Recharts v3.0.2 for analytics dashboards
Document Viewer: Multi-format viewer with Luckysheet Excel integration
```

### **Project Structure**
```
esg-checklist-ai/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── ai/                # Multi-provider AI system
│   │   │   ├── scorer.py     # AI scoring engine with provider switching
│   │   │   ├── comprehensive_analyzer.py  # Document analysis orchestrator  
│   │   │   └── department_configs.py     # Department-specific configurations
│   │   ├── routers/           # API endpoints (versioned /v1/)
│   │   │   ├── analytics.py   # Real-time analytics and metrics
│   │   │   ├── brd_reports.py # BRD-compliant specialized reports
│   │   │   ├── files.py       # File management and streaming
│   │   │   ├── uploads.py     # Document upload and processing
│   │   │   ├── submissions.py # Checklist submissions workflow
│   │   │   ├── email_notifications.py # Email automation
│   │   │   ├── enhanced_reports.py    # Advanced report generation
│   │   │   ├── search.py      # Comprehensive search functionality
│   │   │   └── configuration.py       # System configuration management
│   │   ├── services/          # Business logic services
│   │   │   ├── audit_service.py       # Comprehensive audit trail
│   │   │   ├── email_service.py       # Email automation system
│   │   │   ├── enhanced_reporting.py  # Professional report generation
│   │   │   └── configuration_service.py  # Dynamic configuration
│   │   ├── models.py          # SQLModel database schemas (15+ models)
│   │   ├── auth.py           # JWT authentication & authorization
│   │   ├── config.py         # Pydantic configuration management
│   │   └── main.py           # FastAPI application with comprehensive middleware
│   ├── templates/             # Email and report templates
│   └── alembic/              # Database migrations
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── dashboards/   # Role-based dashboard components
│   │   │   │   ├── AuditorDashboard.tsx    # Auditor-specific metrics and analytics
│   │   │   │   ├── ReviewerDashboard.tsx   # Document review workflow
│   │   │   │   └── FallbackAuditorDashboard.tsx  # Error recovery dashboard
│   │   │   ├── ai-analysis/  # AI analysis workflow components
│   │   │   │   └── ComprehensiveStep4ResultsDisplay.tsx  # Analysis results
│   │   │   ├── DocumentViewer.tsx     # Advanced document viewer
│   │   │   ├── TabbedDocumentViewer.tsx # Multi-tab document interface
│   │   │   └── Sidebar.tsx            # Navigation with role-based menus
│   │   ├── pages/            # Page components
│   │   │   ├── Analytics.tsx  # Real-time analytics dashboard
│   │   │   ├── Reports.tsx    # Report generation and export
│   │   │   ├── Reviews.tsx    # Document review interface  
│   │   │   └── AnalysisHistory.tsx    # AI analysis history and tracking
│   │   ├── services/         # API integration
│   │   │   └── api.ts        # Comprehensive API client with type safety
│   │   └── contexts/         # React contexts for state management
│   └── public/
│       └── luckysheet/       # Excel viewer assets
└── docker-compose.yml        # Container orchestration
```

## 🚀 **Quick Start Guide**

### **Prerequisites**
- **Backend**: Python 3.11+, pip, virtual environment
- **Frontend**: Node.js 18+, npm
- **AI Services**: Google Gemini API key (required)
- **Optional**: Docker, PostgreSQL for production

### **1. Environment Setup**
```bash
# Clone repository
git clone https://github.com/halsabbah10/esg-checklist-ai.git
cd esg-checklist-ai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys and configuration

# Frontend setup
cd ../frontend
npm install
```

### **2. Configuration**

**Backend Environment (.env):**
```env
# Core Configuration
SECRET_KEY=your-secure-secret-key-here
ENVIRONMENT=development
DEBUG=true

# AI Provider Configuration
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key-optional
DEEPSEEK_API_KEY=your-deepseek-api-key-optional
EAND_API_KEY=your-eand-api-key-optional

# Database Configuration
DATABASE_URL=sqlite:///./test.db

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_PATH=./uploads

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### **3. Database Initialization**
```bash
# From backend directory
cd backend

# Create database tables
python -c "from app.models import SQLModel; from app.database import engine; SQLModel.metadata.create_all(engine)"

# Or use Alembic migrations
alembic upgrade head
```

### **4. Start Development Servers**
```bash
# Terminal 1: Backend (from backend directory)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend (from frontend directory)
npm run dev
```

### **5. Access Application**
- **Frontend**: http://localhost:5173 (Vite) or http://localhost:3000 (alternative)
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **API Health Check**: http://localhost:8000/health

### **6. Default Login**
```
Email: admin@esg.com
Password: admin123
Role: Super Administrator
```

## 🐳 **Docker Deployment**

### **Production Deployment**
```bash
# Full stack deployment
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale esg-checklist-ai=3
```

### **Development with Docker**
```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Backend only
docker-compose up -d db
cd backend && uvicorn app.main:app --reload
```

## 📊 **Key Features Deep Dive**

### **AI Analysis System**
- **Multi-Provider Architecture**: Seamless switching between 4 AI providers
- **Department-Specific Analysis**: 10+ specialized department configurations
- **Intelligent Scoring**: 0.0-1.0 scoring with category breakdowns
- **Document Intelligence**: Dynamic questionnaire extraction and evaluation
- **Real-time Processing**: Background analysis with progress tracking

### **Dashboard Analytics**
- **Completeness Metrics**: Document completeness tracking and analysis
- **Compliance Scoring**: Pass/warning/fail categorization with 70% threshold
- **Real-time Updates**: Live data refresh without page reload
- **Export Integration**: One-click report generation from dashboards

### **Document Management**
- **Advanced Viewer**: Multi-format document viewer with zoom, rotation, search
- **Excel Integration**: Full-featured spreadsheet viewer with Luckysheet
- **File Streaming**: Efficient large file handling and progressive loading
- **Upload Workflow**: Drag-and-drop with progress indicators and validation

### **Reporting System**
- **BRD Compliance**: Specialized reports for regulatory requirements
- **Multi-Format Export**: PDF, Word, Excel, CSV with professional styling
- **Executive Summaries**: High-level compliance dashboards
- **Audit Readiness**: Comprehensive audit preparation reports

## 🔐 **Security & Compliance**

### **Authentication & Authorization**
- **JWT Tokens**: Secure authentication with configurable expiration
- **Role Hierarchy**: super_admin → admin → reviewer → auditor
- **Permission System**: Granular access control by function and department
- **Session Management**: Secure token refresh and logout mechanisms

### **Data Protection**
- **Input Validation**: Comprehensive Pydantic validation on all inputs
- **File Security**: Type validation, size limits, and content scanning
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **CORS Security**: Configurable cross-origin request handling

### **Audit & Compliance**
- **Complete Audit Trail**: All system actions logged with detailed metadata
- **Performance Monitoring**: Response times, error rates, and usage analytics
- **Data Retention**: Configurable retention policies for compliance
- **Email Tracking**: Notification delivery status and audit logs

## 📚 **API Reference**

### **Core Endpoint Categories**
| Category | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/v1/users/` | JWT authentication and user management |
| File Management | `/v1/files/` | Document upload, download, and streaming |
| AI Analysis | `/v1/ai-analysis/` | Document analysis and scoring |
| Departments | `/v1/departments/` | Department-specific analysis |
| Analytics | `/v1/analytics/` | Real-time metrics and dashboards |
| Reports | `/v1/brd-reports/` | BRD-compliant report generation |
| Search | `/v1/search/` | Comprehensive search across entities |
| Email | `/v1/email/` | Email notification management |
| Configuration | `/v1/configuration/` | System configuration management |

### **Authentication Example**
```bash
# Login and get JWT token
curl -X POST "http://localhost:8000/v1/users/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@esg.com&password=admin123"

# Use token in subsequent requests
curl -X GET "http://localhost:8000/v1/analytics/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛠️ **Development**

### **Code Quality**
```bash
# Backend
cd backend
black .              # Code formatting
ruff check .         # Linting and security
pytest --cov=app    # Tests with coverage

# Frontend  
cd frontend
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # TypeScript
npm run test         # Vitest tests
```

### **Database Management**
```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Reset database (development)
rm backend/test.db
alembic upgrade head
```

## 🚨 **Troubleshooting**

### **Common Issues**

**1. AI Analysis Failing**
```bash
# Check API keys
echo $GEMINI_API_KEY

# Verify AI provider connectivity
python -c "from app.ai.scorer import AIScorer; scorer = AIScorer(); scorer.test_connection()"
```

**2. Frontend Build Errors**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Check versions
node --version  # Should be 18+
npm --version
```

**3. Database Connection Issues**
```bash
# Test database connection
python -c "from app.database import engine; print('Database connected successfully')"

# Check database file
ls -la backend/test.db
```

**4. File Upload Problems**
```bash
# Check upload directory permissions
ls -la backend/uploads/

# Verify file size limits
grep MAX_FILE_SIZE backend/.env
```

## 📞 **Support**

### **Resources**
- **API Documentation**: http://localhost:8000/docs
- **Health Monitoring**: http://localhost:8000/health
- **Project Repository**: https://github.com/halsabbah10/esg-checklist-ai

### **Team**
**Development Team**: Husam AlSabbah & Zakkaria  
**Organization**: e& Risk and Assurance Department  
**Contact**: Internal project - contact development team for support

## 📄 **License**

This project is proprietary and confidential. All rights reserved.

---

**Built with ❤️ by the e& Risk and Assurance Team**

_Last Updated: January 2025_  
_Version: 2.1.0 - Production Release_