#!/usr/bin/env python3
"""
Email Testing Script for husam.alsabbah@gmail.com
Tests the email functionality with your specific Gmail account
"""

import smtplib
import getpass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import sys

# Add the app directory to the path
sys.path.append(str(Path(__file__).parent))

def test_smtp_connection():
    """Test SMTP connection with Gmail"""
    
    print("📧 Testing SMTP Setup for husam.alsabbah@gmail.com")
    print("=" * 60)
    
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    username = "husam.alsabbah@gmail.com"
    
    print(f"SMTP Server: {smtp_server}")
    print(f"SMTP Port: {smtp_port}")
    print(f"Username: {username}")
    
    print("\n🔑 You need your Gmail App Password (NOT your regular password)")
    print("If you haven't generated one yet:")
    print("1. Go to https://myaccount.google.com/security")
    print("2. Enable 2-Factor Authentication")
    print("3. Go to 'App passwords' and generate one for 'Mail'")
    print("4. Use the 16-character app password below")
    
    # Get app password
    app_password = getpass.getpass("\nEnter your Gmail App Password: ")
    
    print("\n🧪 Testing SMTP connection...")
    
    try:
        # Test connection
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(username, app_password)
        
        print("✅ SMTP connection successful!")
        
        # Send test email
        print("\n📤 Sending test email...")
        
        msg = MIMEMultipart()
        msg['From'] = username
        msg['To'] = username  # Send to yourself
        msg['Subject'] = "🎉 ESG Checklist AI - Email Test Successful!"
        
        body = f"""
        Congratulations! 🎉
        
        Your ESG Checklist AI email configuration is working perfectly!
        
        Configuration Details:
        - SMTP Server: {smtp_server}
        - SMTP Port: {smtp_port}
        - Username: {username}
        - TLS: Enabled
        - SSL: Disabled
        
        Your system is now ready to send:
        ✅ Incomplete checklist notifications
        ✅ Missing submission alerts
        ✅ Summary reports
        ✅ BRD-compliant notifications
        
        Next steps:
        1. Update your .env file with the app password
        2. Run the full system test
        3. Start using the ESG Checklist AI!
        
        ---
        ESG Checklist AI System
        Automated Email Test - {username}
        """
        
        msg.attach(MIMEText(body, 'plain'))
        server.send_message(msg)
        server.quit()
        
        print("✅ Test email sent successfully!")
        print(f"📧 Check your inbox at: {username}")
        
        # Show the configuration to add to .env
        print("\n📝 Add this to your .env file:")
        print("="*50)
        print(f"SMTP_USERNAME={username}")
        print(f"SMTP_PASSWORD={app_password}")
        print(f"FROM_EMAIL={username}")
        print("="*50)
        
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed!")
        print("Common solutions:")
        print("  • Make sure you're using App Password (not regular password)")
        print("  • Verify 2-Factor Authentication is enabled")
        print("  • Check if the App Password is correct")
        return False
        
    except smtplib.SMTPConnectError:
        print("❌ Connection failed!")
        print("Common solutions:")
        print("  • Check your internet connection")
        print("  • Verify firewall/antivirus settings")
        print("  • Try again in a few minutes")
        return False
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def update_env_file():
    """Update .env file with the correct password"""
    
    print("\n🔧 Would you like to update your .env file now? (y/n)")
    choice = input().strip().lower()
    
    if choice == 'y':
        app_password = getpass.getpass("Enter your Gmail App Password again: ")
        
        env_file = Path(__file__).parent / ".env"
        
        # Read current content
        with open(env_file, 'r') as f:
            content = f.read()
        
        # Replace the password placeholder
        content = content.replace(
            "SMTP_PASSWORD=REPLACE_WITH_YOUR_APP_PASSWORD",
            f"SMTP_PASSWORD={app_password}"
        )
        
        # Write back
        with open(env_file, 'w') as f:
            f.write(content)
        
        print("✅ .env file updated successfully!")
        print("🚀 Your ESG Checklist AI is now ready to send emails!")
        
        return True
    
    return False

if __name__ == "__main__":
    print("🚀 ESG Checklist AI - Email Setup for Husam")
    print("This script will help you test and configure email notifications\n")
    
    if test_smtp_connection():
        update_env_file()
        
        print("\n🎯 Next Steps:")
        print("1. Start your backend server: python -m app.main")
        print("2. The SMTP warning should be gone")
        print("3. Test the full email functionality with: python test_email.py")
        print("4. Try uploading an ESG checklist to trigger notifications")
        
    else:
        print("\n🔧 Troubleshooting:")
        print("1. Make sure you have generated a Gmail App Password")
        print("2. Visit: https://myaccount.google.com/security")
        print("3. Enable 2-Factor Authentication")
        print("4. Generate App Password for 'Mail'")
        print("5. Run this script again")