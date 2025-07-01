# ESG Checklist AI - Deployment Guide

## 🚀 Production Deployment Instructions

This guide provides step-by-step instructions for deploying the ESG Checklist AI system in a production environment.

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Database**: MySQL 8.0+ (or SQLite for development)
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 10GB available space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows 10+

### Required API Keys

- **Gemini API Key**: Required for AI analysis functionality
- **SMTP Settings**: For email notifications (optional)

## Quick Start Deployment

### 1. System Setup

```bash
# Clone repository
git clone <repository-url>
cd esg-checklist-ai

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit configuration
nano backend/.env
```

Required environment variables:

```bash
# Database Configuration
DATABASE_URL=mysql://user:password@localhost/esg_db
# Or for SQLite: DATABASE_URL=sqlite:///./esg.db

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Security
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com

# Application Settings
DEBUG=false
LOG_LEVEL=INFO
```

### 3. Database Setup

```bash
# Navigate to backend directory
cd backend

# Run database migrations
alembic upgrade head

# Verify database setup
python -c "from app.database import engine; print('Database connection successful!')"
```

### 4. Start the Application

```bash
# Start the backend server
python run_server.py

# Server will start on http://localhost:8000
# API documentation available at http://localhost:8000/docs
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f esg-api
```

### Manual Docker Build

```bash
# Build image
docker build -t esg-checklist-ai .

# Run container
docker run -d \
  --name esg-api \
  -p 8000:8000 \
  -e DATABASE_URL="your_database_url" \
  -e GEMINI_API_KEY="your_api_key" \
  esg-checklist-ai
```

## Production Configuration

### 1. Database Optimization

For MySQL production setup:

```sql
-- Create database and user
CREATE DATABASE esg_checklist_ai;
CREATE USER 'esg_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON esg_checklist_ai.* TO 'esg_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Web Server Configuration

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

#### SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Process Management

#### Using Systemd

Create `/etc/systemd/system/esg-api.service`:

```ini
[Unit]
Description=ESG Checklist AI API
After=network.target

[Service]
Type=simple
User=esg
WorkingDirectory=/path/to/esg-checklist-ai/backend
Environment=PATH=/path/to/esg-checklist-ai/.venv/bin
ExecStart=/path/to/esg-checklist-ai/.venv/bin/python run_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable esg-api
sudo systemctl start esg-api
sudo systemctl status esg-api
```

## Testing Deployment

### 1. Health Check

```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy", "version": "2.0"}
```

### 2. API Documentation

Visit: `http://localhost:8000/docs`

### 3. Sample Document Test

```bash
# Upload a test document
curl -X POST "http://localhost:8000/api/v1/submissions" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_document.pdf" \
  -F "company_name=Test Company"
```

## Monitoring & Maintenance

### 1. Log Management

```bash
# Application logs
tail -f backend/logs/app.log

# System service logs
journalctl -u esg-api -f
```

### 2. Database Backups

```bash
# MySQL backup
mysqldump esg_checklist_ai > backup_$(date +%Y%m%d).sql

# Automated backup script
0 2 * * * /usr/bin/mysqldump esg_checklist_ai > /backups/esg_$(date +\%Y\%m\%d).sql
```

### 3. Performance Monitoring

- Monitor API response times
- Check database connection pool usage
- Monitor file storage utilization
- Track AI API usage and costs

## Security Considerations

### 1. API Security

- Use HTTPS in production
- Implement rate limiting
- Regular security updates
- Strong authentication tokens

### 2. File Upload Security

- Validate file types and sizes
- Scan uploads for malware
- Store files outside web root
- Implement access controls

### 3. Database Security

- Use strong passwords
- Limit database user privileges
- Enable query logging
- Regular security updates

## Scaling Considerations

### Horizontal Scaling

- Load balancer (Nginx/HAProxy)
- Multiple API instances
- Shared database and file storage
- Redis for session management

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Cache frequently accessed data
- Background task processing

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   ```bash
   # Check database service
   systemctl status mysql

   # Test connection
   mysql -u esg_user -p esg_checklist_ai
   ```

2. **AI API Errors**

   ```bash
   # Verify API key
   python -c "
   import os
   from dotenv import load_dotenv
   load_dotenv()
   print('API Key:', os.getenv('GEMINI_API_KEY')[:10] + '...')
   "
   ```

3. **File Upload Issues**

   ```bash
   # Check disk space
   df -h

   # Check permissions
   ls -la uploads/
   ```

### Support Resources

- GitHub Issues: [Repository Issues]
- Documentation: `/docs` folder
- API Reference: `http://localhost:8000/docs`

## Success Checklist

- [ ] Environment variables configured
- [ ] Database connection established
- [ ] API server starts successfully
- [ ] Health check returns "healthy"
- [ ] Sample document processes correctly
- [ ] AI analysis generates scores
- [ ] File uploads work properly
- [ ] Authentication system functional
- [ ] Logging captures events
- [ ] Backup procedures in place

🎉 **Congratulations! Your ESG Checklist AI system is now deployed and ready for production use.**

---

_For additional support or questions, refer to the project documentation in the `/docs` folder._
