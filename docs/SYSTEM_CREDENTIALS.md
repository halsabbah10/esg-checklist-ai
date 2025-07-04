# ESG Checklist AI - System Credentials & Access Information

## 🔐 Login Credentials

### Primary Test Account

- **Email**: `test@admin.com`
- **Password**: `admin123`
- **Role**: Admin (Full Access)
- **User ID**: 4

### Alternative Login Methods

- You can login with either **email** or **username**
- The system accepts both formats in the login form

## 🌐 System Access URLs

### API Documentation & Testing

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **Root API Info**: http://localhost:8000/

### Server Management

- **Start Server**: `python backend/run_server.py`
- **Server Port**: 8000
- **Environment**: Development/Testing

## 📋 API Authentication

### How to Authenticate

1. **Via Swagger UI**:

   - Go to http://localhost:8000/docs
   - Click the "Authorize" button (🔒 icon)
   - Enter credentials: `test@admin.com` / `admin123`
   - Click "Authorize"

2. **Via API Calls**:

   ```bash
   # Get access token
   curl -X POST "http://localhost:8000/users/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=test@admin.com&password=admin123"

   # Use token in subsequent requests
   curl -X GET "http://localhost:8000/users/me" \
        -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Via Python Script**:

   ```python
   import requests

   # Login
   login_data = {"username": "test@admin.com", "password": "admin123"}
   response = requests.post("http://localhost:8000/users/login", data=login_data)
   token = response.json()["access_token"]

   # Use token
   headers = {"Authorization": f"Bearer {token}"}
   response = requests.get("http://localhost:8000/users/me", headers=headers)
   ```

## 🗄️ Database Information

### Database Type

- **Development**: SQLite
- **Database File**: `backend/test.db`
- **Tables**: Users, Checklists, ChecklistItems, SubmissionAnswers, FileUploads, Notifications

### Database Access

- **Location**: `/Users/axerroce/one last test ig/esg-checklist-ai/backend/test.db`
- **View Data**: Use SQLite browser or command line tools

## 📁 Test Data Created

### Test Checklists Created

- Multiple ESG compliance checklists have been created during testing
- Latest test checklist ID: 8 (Annual ESG Compliance Assessment 2025)

### Sample Uploads

- Carbon footprint reports
- Diversity & inclusion metrics
- Various ESG documentation

## 🧪 Test Scripts Available

### Ready-to-Run Scripts

1. **`final_comprehensive_test.py`** - Complete system test
2. **`practical_usage_demo.py`** - Real-world ESG workflow demo
3. **`simple_checklist_test.py`** - Basic functionality test

### Run Tests

```bash
# Comprehensive system test
python final_comprehensive_test.py

# Practical demo
python practical_usage_demo.py

# Simple test
python simple_checklist_test.py
```

## 🎯 Quick Start Guide

### 1. Start the System

```bash
cd "/Users/axerroce/one last test ig/esg-checklist-ai"
python backend/run_server.py
```

### 2. Access API Documentation

- Open: http://localhost:8000/docs
- Click "Authorize" button
- Enter: `test@admin.com` / `admin123`

### 3. Test Core Features

- ✅ Create checklists
- ✅ Upload documents
- ✅ Submit responses
- ✅ View analytics
- ✅ Search files

## 🔧 Environment Configuration

### Required Environment File

- **Location**: `backend/.env`
- **Database URL**: `sqlite:///./test.db`
- **Secret Key**: Configured for development

### Dependencies

- All Python packages installed via `requirements.txt`
- Server runs on Python 3.x with FastAPI

## 📊 System Status

### Last Tested

- **Date**: July 3, 2025
- **Status**: ✅ All systems operational
- **Test Results**: 8/8 tests passed (100% success)

### Available Features

- ✅ User authentication and management
- ✅ Checklist creation and management
- ✅ File upload with text extraction
- ✅ Response submission and tracking
- ✅ Search and analytics
- ✅ Administrative functions
- ✅ Export capabilities

## 📝 Important Notes

### Security

- These are **development/testing credentials**
- Change passwords for production use
- Update secret keys for production deployment

### File Storage

- Uploaded files stored in `uploads/` directory
- File metadata tracked in database
- Supports: PDF, DOCX, TXT, CSV, XLSX

### Backup Information

- Database can be backed up by copying `backend/test.db`
- Upload files located in `uploads/` directory
- Configuration in `backend/.env`

---

## 🆘 Troubleshooting

### If Login Fails

1. Verify server is running on port 8000
2. Check credentials: `test@admin.com` / `admin123`
3. Use form data format (not JSON) for login API calls

### If Server Won't Start

1. Check Python environment is activated
2. Verify all dependencies installed: `pip install -r requirements.txt`
3. Check database file permissions

### For Support

- Check server logs in terminal
- Use health check endpoint: http://localhost:8000/health
- Review test scripts for working examples

---

**Keep this document safe - it contains all the information needed to access and use the ESG Checklist AI system!** 🔐
