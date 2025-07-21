# 📧 Email Setup Guide for ESG Checklist AI

This guide will help you set up email notifications for your ESG Checklist AI system.

## 🚀 Quick Setup (Recommended)

### Step 1: Run the Setup Script
```bash
cd /Users/axerroce/esg-checklist-ai/backend
python setup_smtp.py
```

### Step 2: Test Email Configuration
```bash
python test_email.py
```

## 📋 Manual Setup Options

### Option 1: Gmail (Recommended for Testing)

1. **Generate App Password**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Factor Authentication
   - Generate an App Password for "Mail"
   - Use the App Password (not your regular password)

2. **Create/Update `.env` file**:
```env
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

### Option 2: Outlook/Hotmail

```env
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
FROM_EMAIL=your-email@outlook.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

### Option 3: Yahoo Mail

1. **Generate App Password**:
   - Go to Yahoo Account Security
   - Generate an App Password
   - Use the App Password

```env
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@yahoo.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

### Option 4: Mailtrap (Development Only)

Perfect for testing without sending real emails:

1. **Sign up at https://mailtrap.io**
2. **Create an inbox**
3. **Get SMTP credentials**

```env
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_SERVER=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
FROM_EMAIL=test@example.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

## 🧪 Testing Email Functionality

### Test Individual Components
```bash
# Test email configuration
python test_email.py

# Test specific email types
python -c "
from app.services.email_service import get_email_service
service = get_email_service()
# Test incomplete checklist notification
# Test missing submission alert
# Test summary report
"
```

### Test from the Application
1. Start the backend server
2. Upload an ESG checklist with incomplete data
3. Check for email notifications

## 🔧 Email Notification Types

Your ESG Checklist AI system supports these email types:

### 1. Incomplete Checklist Notifications
- **Trigger**: When an ESG checklist analysis shows incomplete responses
- **Recipients**: Audit team members
- **Content**: Summary of incomplete/missing items

### 2. Missing Submission Alerts
- **Trigger**: When expected ESG submissions are missing
- **Recipients**: Advisory team
- **Content**: Alert about missing submissions with deadlines

### 3. Summary Reports
- **Trigger**: Periodic or on-demand
- **Recipients**: Stakeholders and management
- **Content**: Comprehensive compliance and performance summary

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - ✅ Use App Password instead of regular password
   - ✅ Verify 2FA is enabled
   - ✅ Check username/password are correct

2. **Connection Refused**
   - ✅ Check SMTP server and port
   - ✅ Verify firewall/antivirus settings
   - ✅ Ensure internet connection is stable

3. **TLS/SSL Issues**
   - ✅ Try different TLS/SSL combinations
   - ✅ For Gmail: USE_TLS=true, USE_SSL=false
   - ✅ For other providers: Check documentation

### Testing Commands

```bash
# Test SMTP connection
python -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('your-email@gmail.com', 'your-app-password')
print('✅ SMTP connection successful')
server.quit()
"

# Test email sending
python test_email.py
```

## 📊 Email Templates

The system includes pre-built HTML email templates for:
- Incomplete checklist notifications
- Missing submission alerts
- Summary reports

Templates are located in: `app/templates/email/`

## 🔐 Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Enable 2FA**: Always enable two-factor authentication
3. **Secure Storage**: Store credentials in `.env` file (not in code)
4. **Regular Updates**: Rotate passwords periodically
5. **Monitor Usage**: Check email logs for suspicious activity

## 🌐 Production Considerations

For production deployment, consider:
- **Email Service Provider**: Use services like SendGrid, Mailgun, or AWS SES
- **Rate Limiting**: Implement email rate limiting
- **Monitoring**: Set up email delivery monitoring
- **Backup SMTP**: Configure backup SMTP servers
- **Compliance**: Ensure GDPR/compliance requirements are met

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run the test script: `python test_email.py`
3. Check application logs for detailed error messages
4. Verify your email provider's SMTP documentation

## 🎯 Next Steps

After setting up email:
1. Test all email notification types
2. Configure email recipients for different roles
3. Set up email templates customization
4. Configure email scheduling for reports
5. Set up monitoring and alerting