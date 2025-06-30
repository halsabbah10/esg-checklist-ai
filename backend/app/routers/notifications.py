from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import Notification
from app.database import get_session
from app.auth import require_role
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Get all notifications for current user
@router.get("/my")
def get_my_notifications(
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    notes = db.exec(
        select(Notification).where(Notification.user_id == current_user.id)
    ).all()

    # Sort by created_at in Python (newest first)
    sorted_notes = sorted(notes, key=lambda x: x.created_at, reverse=True)
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "created_at": n.created_at,
            "read": n.read,
            "type": n.type,
        }
        for n in sorted_notes
    ]


# Mark notification as read
@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    note = db.get(Notification, notification_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(404, "Notification not found")
    note.read = True
    db.add(note)
    db.commit()
    return {"detail": "Notification marked as read"}


# Admin: send custom notification to any user
@router.post("/send")
def send_notification(
    user_id: int,
    title: str,
    message: str,
    link: Optional[str] = None,
    type: str = "info",
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    note = Notification(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
        type=type,
        read=False,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"detail": "Notification sent", "notification_id": note.id}
