"""
Notification utilities for automatic user notifications
"""

from sqlmodel import Session
from app.models import Notification, FileUpload
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    link: Optional[str] = None,
    notification_type: str = "info",
) -> bool:
    """
    Create and save a notification for a user.

    Args:
        db: Database session
        user_id: ID of the user to notify
        title: Notification title
        message: Notification message
        link: Optional link (e.g., to a file or resource)
        notification_type: Type of notification (info, success, error, warning)

    Returns:
        bool: True if notification was created successfully, False otherwise
    """
    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            type=notification_type,
            created_at=datetime.now(timezone.utc),
            read=False,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        logger.info(f"Notification sent to user {user_id}: {title}")
        return True

    except Exception as e:
        logger.error(f"Failed to send notification to user {user_id}: {e}")
        db.rollback()
        return False


def notify_file_status_change(
    db: Session, file_upload: FileUpload, new_status: str, reviewer_name: str = "System"
) -> bool:
    """
    Send notification when a file's status changes (approved/rejected).

    Args:
        db: Database session
        file_upload: FileUpload instance
        new_status: New status (approved/rejected/pending)
        reviewer_name: Name of the reviewer (optional)

    Returns:
        bool: True if notification was sent successfully
    """
    status_messages = {
        "approved": {
            "title": "File Approved ✅",
            "message": f"Your file '{file_upload.filename}' has been approved by {reviewer_name}.",
            "type": "success",
        },
        "rejected": {
            "title": "File Rejected ❌",
            "message": f"Your file '{file_upload.filename}' has been rejected by {reviewer_name}. Please check the comments for feedback.",
            "type": "error",
        },
        "pending": {
            "title": "File Under Review ⏳",
            "message": f"Your file '{file_upload.filename}' is now under review.",
            "type": "info",
        },
    }

    if new_status not in status_messages:
        logger.warning(f"Unknown status: {new_status}")
        return False

    status_info = status_messages[new_status]
    link = f"/uploads/{file_upload.id}"

    return notify_user(
        db=db,
        user_id=file_upload.user_id,
        title=status_info["title"],
        message=status_info["message"],
        link=link,
        notification_type=status_info["type"],
    )


def notify_file_commented(
    db: Session, file_upload: FileUpload, commenter_name: str = "Reviewer"
) -> bool:
    """
    Send notification when a file receives a new comment.

    Args:
        db: Database session
        file_upload: FileUpload instance
        commenter_name: Name of the person who commented

    Returns:
        bool: True if notification was sent successfully
    """
    title = "New Comment on Your File 💬"
    message = f"Your file '{file_upload.filename}' has received a new comment from {commenter_name}."
    link = f"/uploads/{file_upload.id}"

    return notify_user(
        db=db,
        user_id=file_upload.user_id,
        title=title,
        message=message,
        link=link,
        notification_type="info",
    )
