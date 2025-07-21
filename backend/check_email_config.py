import os
from dotenv import load_dotenv
from app.config import Settings

# Force reload environment variables
load_dotenv(override=True)

# Create a fresh Settings instance
settings = Settings()
print('📧 Email configuration check:')
print(f'  SMTP Server: {settings.smtp_server}')
print(f'  SMTP Port: {settings.smtp_port}')
print(f'  Username: {settings.smtp_username}')
print(f'  From Email: {settings.from_email}')
password_set = settings.smtp_password and settings.smtp_password != 'REPLACE_WITH_YOUR_APP_PASSWORD'
print(f'  Password set: {"✅ Yes" if password_set else "❌ No - needs to be updated"}')
print(f'  TLS: {settings.smtp_use_tls}')
print(f'  SSL: {settings.smtp_use_ssl}')
print(f'  Notifications enabled: {settings.enable_email_notifications}')

# Also check environment variables directly
print('\n🔧 Direct environment check:')
print(f'  SMTP_USERNAME: {os.getenv("SMTP_USERNAME")}')
print(f'  FROM_EMAIL: {os.getenv("FROM_EMAIL")}')
print(f'  SMTP_PASSWORD: {"*" * len(os.getenv("SMTP_PASSWORD", ""))} (hidden)')