"""
Example of integrating the emailer with the notification system
"""

import logging
from typing import Optional

from sqlmodel import Session

from app.models import User
from app.utils.emailer import send_email
from app.utils.notifications import notify_user

logger = logging.getLogger(__name__)


def notify_user_with_email(
    db: Session,
    user: User,
    title: str,
    message: str,
    link: Optional[str] = None,
    notification_type: str = "info",
    send_email_too: bool = True,
) -> bool:
    """
    Send both in-app notification and email notification to a user.

    Args:
        db: Database session
        user: User object (must have email and id)
        title: Notification title
        message: Notification message
        link: Optional link
        notification_type: Type of notification
        send_email_too: Whether to also send email

    Returns:
        bool: True if notification was sent successfully
    """
    # Send in-app notification
    if not user.id:
        logger.error("User ID is required for notifications")
        return False

    in_app_success = notify_user(
        db=db,
        user_id=user.id,
        title=title,
        message=message,
        link=link,
        notification_type=notification_type,
    )

    # Send email notification if requested
    email_success = True
    if send_email_too and user.email:
        try:
            # Create HTML email body
            html_body = f"""
            <html>
            <body>
                <h2>{title}</h2>
                <p>{message}</p>
                {f'<p><a href="{link}">View Details</a></p>' if link else ''}
                <br>
                <p>This is an automated notification from ESG Checklist AI.</p>
            </body>
            </html>
            """

            email_success = send_email(
                to_email=user.email,
                subject=f"ESG Checklist AI - {title}",
                body=html_body,
            )

            if email_success:
                logger.info(f"Email notification sent to {user.email}")
            else:
                logger.warning(f"Failed to send email notification to {user.email}")

        except Exception as e:
            logger.exception(f"Error sending email notification: {e}")
            email_success = False

    return in_app_success and email_success


def setup_email_notifications():
    """
    Setup instructions for email notifications.

    To use email notifications, set these environment variables:
    - OUTLOOK_CLIENT_ID: Your Azure app client ID
    - OUTLOOK_CLIENT_SECRET: Your Azure app client secret
    - OUTLOOK_TENANT_ID: Your Azure tenant ID
    - OUTLOOK_SENDER_ADDRESS: Verified sender email address

    Then you can use notify_user_with_email() in your routers.
    """
    from ..config import get_settings

    settings = get_settings()
    required_values = [
        settings.OUTLOOK_CLIENT_ID,
        settings.OUTLOOK_CLIENT_SECRET,
        settings.OUTLOOK_TENANT_ID,
        settings.OUTLOOK_SENDER_ADDRESS,
    ]

    missing_vars = [i for i, val in enumerate(required_values) if not val]
    var_names = [
        "OUTLOOK_CLIENT_ID",
        "OUTLOOK_CLIENT_SECRET",
        "OUTLOOK_TENANT_ID",
        "OUTLOOK_SENDER_ADDRESS",
    ]

    if missing_vars:
        missing_names = [var_names[i] for i in missing_vars]
        logger.warning(
            f"Email notifications disabled. Missing configuration values: {missing_names}"
        )
        return False
    logger.info("Email notifications configured and ready")
    return True
