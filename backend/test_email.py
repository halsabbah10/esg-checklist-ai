#!/usr/bin/env python3
"""
Email Testing Script
Tests the email functionality using the current configuration
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the app directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent))

# Force reload environment variables
load_dotenv(override=True)

from app.config import Settings
from app.services.email_service import get_email_service

async def test_email_functionality():
    """Test email functionality with current configuration"""
    
    print("🧪 ESG Checklist AI - Email Functionality Test")
    print("=" * 50)
    
    settings = Settings()
    
    # Check configuration
    print(f"Email notifications enabled: {settings.enable_email_notifications}")
    print(f"SMTP Server: {settings.smtp_server}")
    print(f"SMTP Port: {settings.smtp_port}")
    print(f"From Email: {settings.from_email}")
    print(f"SMTP Username: {settings.smtp_username}")
    print(f"Use TLS: {settings.smtp_use_tls}")
    print(f"Use SSL: {settings.smtp_use_ssl}")
    
    if not settings.enable_email_notifications:
        print("\n❌ Email notifications are disabled")
        print("   Set ENABLE_EMAIL_NOTIFICATIONS=true in your .env file")
        return False
    
    if not all([settings.smtp_server, settings.smtp_username, settings.smtp_password, settings.from_email]):
        print("\n❌ Email configuration incomplete")
        print("   Missing required SMTP settings")
        return False
    
    print("\n📧 Testing email service...")
    
    try:
        email_service = get_email_service()
        
        # Test 1: Simple notification
        print("\n1. Testing incomplete checklist notification...")
        test_analysis_data = {
            'metadata': {
                'checklist_completeness': {
                    'total': 10,
                    'completion_rate': 0.6,
                    'summary': {
                        'complete': 6,
                        'incomplete': 3,
                        'missing': 1
                    },
                    'items': [
                        {'status': 'incomplete', 'question': 'Environmental impact assessment'},
                        {'status': 'incomplete', 'question': 'Social responsibility metrics'},
                        {'status': 'incomplete', 'question': 'Governance compliance check'},
                        {'status': 'missing', 'question': 'Sustainability reporting'}
                    ]
                }
            },
            'file_info': {
                'filename': 'test_esg_checklist.xlsx'
            },
            'created_at': '2025-01-16T12:00:00Z'
        }
        
        result1 = email_service.send_incomplete_checklist_notification(
            to_emails=[settings.from_email],  # Send to self
            analysis_result=test_analysis_data
        )
        
        if result1:
            print("   ✅ Incomplete checklist notification sent successfully")
        else:
            print("   ❌ Failed to send incomplete checklist notification")
            return False
        
        # Test 2: Missing submission alert
        print("\n2. Testing missing submission alert...")
        result2 = email_service.send_missing_submission_alert(
            to_emails=[settings.from_email],
            audit_name="Q1 2025 ESG Compliance Audit",
            due_date="2025-01-20"
        )
        
        if result2:
            print("   ✅ Missing submission alert sent successfully")
        else:
            print("   ❌ Failed to send missing submission alert")
            return False
        
        # Test 3: Summary report
        print("\n3. Testing summary report...")
        test_summary_data = {
            'review_period': 'January 2025',
            'total_audits': 25,
            'complete_audits': 18,
            'incomplete_audits': 5,
            'missing_audits': 2,
            'overall_completion_rate': 72,
            'recommendations': [
                'Improve documentation for incomplete audits',
                'Follow up on missing submissions',
                'Enhance ESG training for audit teams'
            ]
        }
        
        result3 = email_service.send_summary_report(
            to_emails=[settings.from_email],
            summary_data=test_summary_data
        )
        
        if result3:
            print("   ✅ Summary report sent successfully")
        else:
            print("   ❌ Failed to send summary report")
            return False
        
        print("\n🎉 All email tests passed!")
        print(f"   Check your inbox at: {settings.from_email}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Email test failed with error: {str(e)}")
        print("\nTroubleshooting tips:")
        print("  1. Verify your email credentials are correct")
        print("  2. Check if you're using an App Password (required for Gmail)")
        print("  3. Ensure 2FA is enabled and App Password is generated")
        print("  4. Verify SMTP settings for your email provider")
        print("  5. Check firewall/antivirus settings")
        
        return False

if __name__ == "__main__":
    asyncio.run(test_email_functionality())