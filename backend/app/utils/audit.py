from app.models import AuditLog
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth import require_role
from fastapi.responses import StreamingResponse
from io import StringIO, BytesIO
import pandas as pd

router = APIRouter(prefix="/audit", tags=["audit"])


def log_action(
    db,
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str],
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Log an audit action to the database.

    Args:
        db: Database session
        user_id: ID of the user performing the action (can be None for system actions)
        action: The action being performed (e.g., "file_upload", "login",
               "status_change")
        resource_type: Type of resource (e.g., "file", "checklist", "user")
        resource_id: ID of the resource being acted upon
        details: Additional details about the action (JSON string)
        ip_address: IP address of the user (for web requests)
        user_agent: User agent string (for web requests)
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()


def log_file_action(
    db,
    user_id: Optional[int],
    action: str,
    file_id: int,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Log a file-related action.

    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Action performed (e.g., "upload", "approve", "reject", "comment")
        file_id: ID of the file
        details: Additional details about the action
        ip_address: IP address of the user
        user_agent: User agent string
    """
    log_action(
        db=db,
        user_id=user_id,
        action=action,
        resource_type="file",
        resource_id=str(file_id),
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_user_action(
    db,
    user_id: Optional[int],
    action: str,
    target_user_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Log a user-related action.

    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Action performed (e.g., "login", "logout", "create", "update")
        target_user_id: ID of the target user (if different from user_id)
        details: Additional details about the action
        ip_address: IP address of the user
        user_agent: User agent string
    """
    log_action(
        db=db,
        user_id=user_id,
        action=action,
        resource_type="user",
        resource_id=str(target_user_id) if target_user_id else str(user_id),
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_checklist_action(
    db,
    user_id: Optional[int],
    action: str,
    checklist_id: int,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Log a checklist-related action.

    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Action performed (e.g., "create", "update", "delete")
        checklist_id: ID of the checklist
        details: Additional details about the action
        ip_address: IP address of the user
        user_agent: User agent string
    """
    log_action(
        db=db,
        user_id=user_id,
        action=action,
        resource_type="checklist",
        resource_id=str(checklist_id),
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_notification_action(
    db,
    user_id: Optional[int],
    action: str,
    notification_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Log a notification-related action.

    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Action performed (e.g., "send", "read", "create")
        notification_id: ID of the notification
        details: Additional details about the action
        ip_address: IP address of the user
        user_agent: User agent string
    """
    log_action(
        db=db,
        user_id=user_id,
        action=action,
        resource_type="notification",
        resource_id=str(notification_id) if notification_id else None,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


@router.get("/logs")
def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """
    Get audit logs with optional filtering.

    Args:
        user_id: Filter by user ID
        action: Filter by action type
        resource_type: Filter by resource type
        limit: Maximum number of logs to return (1-1000)
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        List of audit log entries
    """
    # Build query using SQLModel syntax
    query = select(AuditLog)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    # Execute query and sort in Python
    logs = db.exec(query.limit(limit)).all()

    # Sort by timestamp descending (newest first)
    logs = sorted(logs, key=lambda x: x.timestamp, reverse=True)

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "timestamp": log.timestamp,
        }
        for log in logs
    ]


@router.get("/logs/export")
def export_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    format: str = "csv",  # "csv" or "excel"
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """
    Export audit logs to CSV or Excel format.

    Args:
        user_id: Filter by user ID
        action: Filter by action type
        resource_type: Filter by resource type
        format: Export format ("csv" or "excel")
        limit: Maximum number of logs to return (1-10000)
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        StreamingResponse with exported file
    """
    # Build query using SQLModel syntax
    query = select(AuditLog)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    # Execute query and sort in Python (since order_by with desc is complex in SQLModel)
    logs = db.exec(query.limit(limit)).all()
    logs = sorted(logs, key=lambda x: x.timestamp, reverse=True)

    # Prepare DataFrame
    data = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "timestamp": log.timestamp,
        }
        for log in logs
    ]
    df = pd.DataFrame(data)

    if format.lower() == "csv":
        buf = StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
        )
    elif format.lower() == "excel":
        buf = BytesIO()
        df.to_excel(buf, index=False, engine="openpyxl")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=audit_logs.xlsx"},
        )
    else:
        raise HTTPException(
            status_code=400, detail="Unsupported format (use csv or excel)"
        )
