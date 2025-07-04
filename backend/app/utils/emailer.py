import logging
from typing import Optional

import msal  # type: ignore[import-untyped]
import requests

from ..config import get_email_config, get_settings

# Get centralized configuration
settings = get_settings()
email_config = get_email_config()

logger = logging.getLogger(__name__)

# Outlook/Office365 configuration from settings
CLIENT_ID = settings.OUTLOOK_CLIENT_ID
CLIENT_SECRET = settings.OUTLOOK_CLIENT_SECRET
TENANT_ID = settings.OUTLOOK_TENANT_ID
SENDER_ADDRESS = settings.OUTLOOK_SENDER_ADDRESS


def get_access_token() -> Optional[str]:
    """Get Microsoft Graph access token using centralized configuration"""
    if not all([CLIENT_ID, CLIENT_SECRET, TENANT_ID]):
        logger.warning("Outlook configuration incomplete, cannot get access token")
        return None

    try:
        authority = f"https://login.microsoftonline.com/{TENANT_ID}"
        app = msal.ConfidentialClientApplication(
            CLIENT_ID, authority=authority, client_credential=CLIENT_SECRET
        )
        token_response = app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )

        if not token_response:
            raise Exception("Failed to obtain token response from Microsoft Graph")

        token = token_response.get("access_token")
        if not token:
            raise Exception("Could not obtain Microsoft Graph access token")
        return token
    except Exception as e:
        logger.exception(f"Failed to get access token: {e}")
        return None


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email using Microsoft Graph API with centralized configuration"""
    if not email_config["enabled"]:
        logger.info("Email notifications disabled in configuration")
        return False

    access_token = get_access_token()
    if not access_token:
        return False

    endpoint = f"https://graph.microsoft.com/v1.0/users/{SENDER_ADDRESS}/sendMail"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    data = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": body},
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        }
    }
    # Add timeout for security and reliability
    response = requests.post(endpoint, headers=headers, json=data, timeout=30)
    return response.status_code == 202
