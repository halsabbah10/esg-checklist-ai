import os
import requests
from typing import Dict, Any, Optional
import msal  # type: ignore

CLIENT_ID: Optional[str] = os.getenv("OUTLOOK_CLIENT_ID")
CLIENT_SECRET: Optional[str] = os.getenv("OUTLOOK_CLIENT_SECRET")
TENANT_ID: Optional[str] = os.getenv("OUTLOOK_TENANT_ID")
SENDER_ADDRESS: Optional[str] = os.getenv(
    "OUTLOOK_SENDER_ADDRESS"
)  # Must be a verified sender


def get_access_token() -> str:
    authority: str = f"https://login.microsoftonline.com/{TENANT_ID}"
    app = msal.ConfidentialClientApplication(
        CLIENT_ID, authority=authority, client_credential=CLIENT_SECRET
    )
    token_response: Optional[Dict[str, Any]] = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )

    if not token_response:
        raise Exception("Failed to obtain token response from Microsoft Graph")

    token: Optional[str] = token_response.get("access_token")
    if not token:
        raise Exception("Could not obtain Microsoft Graph access token")
    return token


def send_email(to_email: str, subject: str, body: str) -> bool:
    access_token: str = get_access_token()
    endpoint: str = f"https://graph.microsoft.com/v1.0/users/{SENDER_ADDRESS}/sendMail"
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data: Dict[str, Any] = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": body},
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        }
    }
    response: requests.Response = requests.post(endpoint, headers=headers, json=data)
    if response.status_code == 202:
        return True
    else:
        print("Outlook email send failed:", response.status_code, response.text)
        return False
