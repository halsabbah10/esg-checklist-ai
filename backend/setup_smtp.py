#!/usr/bin/env python3
"""
SMTP Configuration Setup Script
Helps set up email notifications for ESG Checklist AI
"""

import os
import getpass
from pathlib import Path
from dotenv import load_dotenv, set_key

def setup_smtp():
    """Interactive SMTP configuration setup"""
    
    print("🔧 ESG Checklist AI - SMTP Configuration Setup")
    print("=" * 50)
    
    # Load existing .env file
    env_path = Path(__file__).parent / ".env"
    load_dotenv(env_path)
    
    print("\nChoose your email provider:")
    print("1. Gmail (recommended for testing)")
    print("2. Outlook/Hotmail")
    print("3. Yahoo Mail")
    print("4. Custom SMTP Server")
    print("5. Test with Mailtrap (development)")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    # Get common settings
    email = input("Enter your email address: ").strip()
    
    if choice == "1":
        # Gmail setup
        print("\n📧 Gmail Configuration")
        print("⚠️  Important: You need to use an App Password, not your regular password")
        print("   1. Go to https://myaccount.google.com/security")
        print("   2. Enable 2-Factor Authentication")
        print("   3. Generate an App Password for 'Mail'")
        print("   4. Use the App Password below")
        
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_use_tls = True
        smtp_use_ssl = False
        
    elif choice == "2":
        # Outlook setup
        print("\n📧 Outlook Configuration")
        smtp_server = "smtp-mail.outlook.com"
        smtp_port = 587
        smtp_use_tls = True
        smtp_use_ssl = False
        
    elif choice == "3":
        # Yahoo setup
        print("\n📧 Yahoo Configuration")
        print("⚠️  Important: You need to use an App Password")
        print("   1. Go to Yahoo Account Security")
        print("   2. Generate an App Password")
        print("   3. Use the App Password below")
        
        smtp_server = "smtp.mail.yahoo.com"
        smtp_port = 587
        smtp_use_tls = True
        smtp_use_ssl = False
        
    elif choice == "4":
        # Custom SMTP
        print("\n📧 Custom SMTP Configuration")
        smtp_server = input("SMTP Server: ").strip()
        smtp_port = int(input("SMTP Port (usually 587 or 465): ").strip())
        smtp_use_tls = input("Use TLS? (y/n): ").strip().lower() == 'y'
        smtp_use_ssl = input("Use SSL? (y/n): ").strip().lower() == 'y'
        
    elif choice == "5":
        # Mailtrap setup
        print("\n📧 Mailtrap Configuration (Development Only)")
        print("   1. Sign up at https://mailtrap.io")
        print("   2. Create an inbox")
        print("   3. Get your SMTP credentials")
        
        smtp_server = "smtp.mailtrap.io"
        smtp_port = 2525
        smtp_use_tls = True
        smtp_use_ssl = False
        email = input("Mailtrap username: ").strip()
        
    else:
        print("Invalid choice. Exiting.")
        return
    
    # Get password
    password = getpass.getpass("Enter your email password/app password: ")
    
    # Write to .env file
    env_vars = {
        'ENABLE_EMAIL_NOTIFICATIONS': 'true',
        'SMTP_SERVER': smtp_server,
        'SMTP_PORT': str(smtp_port),
        'SMTP_USERNAME': email,
        'SMTP_PASSWORD': password,
        'FROM_EMAIL': email,
        'SMTP_USE_TLS': str(smtp_use_tls).lower(),
        'SMTP_USE_SSL': str(smtp_use_ssl).lower(),
    }
    
    print(f"\n✅ Writing configuration to {env_path}")
    
    for key, value in env_vars.items():
        set_key(env_path, key, value)
    
    print("\n🎉 SMTP Configuration completed!")
    print("\nConfiguration saved:")
    print(f"  SMTP Server: {smtp_server}")
    print(f"  SMTP Port: {smtp_port}")
    print(f"  Username: {email}")
    print(f"  TLS: {smtp_use_tls}")
    print(f"  SSL: {smtp_use_ssl}")
    
    # Test email function
    if input("\nWould you like to test the email configuration? (y/n): ").strip().lower() == 'y':
        test_email_config(smtp_server, smtp_port, email, password, smtp_use_tls, smtp_use_ssl)

def test_email_config(smtp_server, smtp_port, username, password, use_tls, use_ssl):
    """Test email configuration"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    print("\n🧪 Testing email configuration...")
    
    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = username
        msg['To'] = username  # Send to self
        msg['Subject'] = "ESG Checklist AI - Email Test"
        
        body = """
        🎉 Email Configuration Test Successful!
        
        Your ESG Checklist AI system is now configured to send email notifications.
        
        This is an automated test email from your ESG Checklist AI system.
        
        ---
        ESG Checklist AI System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to server
        if use_ssl:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
            if use_tls:
                server.starttls()
        
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        
        print("✅ Test email sent successfully!")
        print(f"   Check your inbox at: {username}")
        
    except Exception as e:
        print(f"❌ Test email failed: {str(e)}")
        print("\nCommon issues:")
        print("  - Check if you're using App Password (not regular password)")
        print("  - Verify your email and password are correct")
        print("  - Check if 2FA is enabled and App Password is generated")
        print("  - Verify firewall/antivirus isn't blocking the connection")

if __name__ == "__main__":
    setup_smtp()