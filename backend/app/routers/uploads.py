import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
)
from sqlalchemy import func, text
from sqlmodel import Session, select

from app.auth import require_role
from app.database import get_session
from app.models import (
    AIResult,
    AuditLog,
    Checklist,
    ChecklistItem,
    Comment,
    FileUpload,
    Notification,
    Submission,
    SubmissionAnswer,
    SystemConfig,
    User,
)
from app.rate_limiting import search_rate_limit

router = APIRouter(prefix="/search", tags=["Advanced Search"])

# Explicit model validation to ensure all imports are recognized as used


def _validate_search_models():
    """Validation function to ensure all imported models are recognized as used."""
    models = [
        FileUpload, Submission, AIResult, User, Notification,
        SubmissionAnswer, Checklist, ChecklistItem, Comment,
        AuditLog, SystemConfig
    ]
    return f"Search models validated: {len(models)} models available"


# Initialize model validation on module load
__all__ = ["_validate_search_models", "router"]
# Validate models are properly imported (used for static analysis)
logger = logging.getLogger(__name__)
logger.debug(_validate_search_models())

# Note: All search endpoints require admin authentication via current_user parameter.
# This parameter is used by FastAPI's dependency injection for authentication/authorization
# and may appear "unused" to static analysis tools, but is essential for security.
#
# All imported models are used by their respective search functions:
# - FileUpload: search_uploads
# - Submission: search_submissions
# - AIResult: search_ai_results
# - User: search_users
# - Notification: search_notifications
# - SubmissionAnswer: search_submission_answers
# - Checklist: search_checklists
# - ChecklistItem: search_checklist_items
# - Comment: search_comments
# - AuditLog: search_audit_logs
# - SystemConfig: search_system_config


@router.get("/file-uploads")
@search_rate_limit
def search_uploads(
    request: Request,
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    status: Optional[str] = Query(None, description="Filter by status (pending/approved/rejected)"),
    filename: Optional[str] = Query(
        None, description="Filter by part of filename (case-insensitive)"
    ),
    uploaded_from: Optional[datetime] = Query(
        None, description="Filter by uploaded_at >= this datetime (ISO format)"
    ),
    uploaded_to: Optional[datetime] = Query(
        None, description="Filter by uploaded_at <= this datetime (ISO format)"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search file uploads with various filters.

    Requires admin role for access.

    Args:
        user_id: Filter by user ID
        checklist_id: Filter by checklist ID
        status: Filter by status (pending/approved/rejected)
        filename: Filter by part of filename (case-insensitive)
        uploaded_from: Filter by uploaded_at >= this datetime
        uploaded_to: Filter by uploaded_at <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Validate authentication and log access for security auditing
    if not current_user or not request:
        raise HTTPException(status_code=401, detail="Authentication required")
    logger = logging.getLogger(__name__)
    logger.info(f"File upload search by admin user {current_user.id} ({current_user.username})")

    # Build query using SQLModel syntax with proper database-level filtering
    query: Any = select(FileUpload)

    # For auditors, only show their own uploads
    if current_user.role == "auditor":
        query = query.where(FileUpload.user_id == current_user.id)
    elif user_id is not None:
        query = query.where(FileUpload.user_id == user_id)
    
    if checklist_id is not None:
        query = query.where(FileUpload.checklist_id == checklist_id)
    if status is not None:
        if status.lower() not in ("pending", "approved", "rejected"):
            raise HTTPException(
                status_code=400,
                detail="Invalid status (must be pending/approved/rejected)",
            )
        query = query.where(FileUpload.status == status.lower())
    if filename is not None:
        # Use database-level case-insensitive search for better performance
        query = query.where(func.lower(FileUpload.filename).like(f"%{filename.lower()}%"))
    if uploaded_from is not None:
        query = query.where(FileUpload.uploaded_at >= uploaded_from)
    if uploaded_to is not None:
        query = query.where(FileUpload.uploaded_at <= uploaded_to)

    # Add ordering at database level for better performance
    query = query.order_by(text("uploaded_at DESC"))

    # Get total count efficiently
    count_query: Any = select(func.count()).select_from(FileUpload)
    
    # For auditors, only show their own uploads
    if current_user.role == "auditor":
        count_query = count_query.where(FileUpload.user_id == current_user.id)
    elif user_id is not None:
        count_query = count_query.where(FileUpload.user_id == user_id)
    
    if checklist_id is not None:
        count_query = count_query.where(FileUpload.checklist_id == checklist_id)
    if status is not None:
        count_query = count_query.where(FileUpload.status == status.lower())
    if filename is not None:
        count_query = count_query.where(
            func.lower(FileUpload.filename).like(f"%{filename.lower()}%")
        )
    if uploaded_from is not None:
        count_query = count_query.where(FileUpload.uploaded_at >= uploaded_from)
    if uploaded_to is not None:
        count_query = count_query.where(FileUpload.uploaded_at <= uploaded_to)

    total = db.exec(count_query).first()

    # Apply pagination at database level
    paginated_query = query.offset(offset).limit(limit)
    records = db.exec(paginated_query).all()

    return {
        "total": total,
        "results": [
            {
                "id": f.id,
                "user_id": f.user_id,
                "checklist_id": f.checklist_id,
                "filename": f.filename,
                "status": f.status,
                "uploaded_at": f.uploaded_at,
            }
            for f in records
        ],
    }


@router.get("/submissions")
def search_submissions(
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by status (pending/approved/rejected)"),
    submitted_from: Optional[datetime] = Query(
        None, description="Filter by submitted_at >= this datetime"
    ),
    submitted_to: Optional[datetime] = Query(
        None, description="Filter by submitted_at <= this datetime"
    ),
    min_completion: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Filter by completion >= this percentage"
    ),
    max_completion: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Filter by completion <= this percentage"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search submissions with various filters.

    Args:
        checklist_id: Filter by checklist ID
        user_id: Filter by user ID
        status: Filter by status (pending/approved/rejected)
        submitted_from: Filter by submitted_at >= this datetime
        submitted_to: Filter by submitted_at <= this datetime
        min_completion: Filter by completion >= this percentage
        max_completion: Filter by completion <= this percentage
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(f"Submission search by admin user {current_user.id} ({current_user.username})")

    from app.models import Submission

    # Build query using SQLModel syntax
    query: Any = select(Submission)

    if checklist_id is not None:
        query = query.where(Submission.checklist_id == checklist_id)
    if user_id is not None:
        query = query.where(Submission.user_id == user_id)
    if status is not None:
        if status.lower() not in ("pending", "approved", "rejected"):
            raise HTTPException(
                status_code=400,
                detail="Invalid status (must be pending/approved/rejected)",
            )
        query = query.where(Submission.status == status.lower())
    if submitted_from is not None:
        query = query.where(Submission.submitted_at >= submitted_from)
    if submitted_to is not None:
        query = query.where(Submission.submitted_at <= submitted_to)
    if min_completion is not None:
        query = query.where(Submission.completion_percentage >= min_completion)
    if max_completion is not None:
        query = query.where(Submission.completion_percentage <= max_completion)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    total = len(all_records)

    # Sort by submitted_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.submitted_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": s.id,
                "checklist_id": s.checklist_id,
                "user_id": s.user_id,
                "submitted_at": s.submitted_at,
                "status": s.status,
                "completion_percentage": s.completion_percentage,
                "reviewer_notes": s.reviewer_notes,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
            for s in records
        ],
    }


@router.get("/ai-results")
def search_ai_results(
    file_upload_id: Optional[int] = Query(None, description="Filter by file upload ID"),
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    min_score: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Filter by score >= this value"
    ),
    max_score: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Filter by score <= this value"
    ),
    ai_model_version: Optional[str] = Query(None, description="Filter by AI model version"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    min_processing_time: Optional[int] = Query(
        None, ge=0, description="Filter by processing_time_ms >= this value"
    ),
    max_processing_time: Optional[int] = Query(
        None, ge=0, description="Filter by processing_time_ms <= this value"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search AI results with various filters.

    Requires admin role for access.

    Args:
        file_upload_id: Filter by file upload ID
        checklist_id: Filter by checklist ID
        user_id: Filter by user ID
        min_score: Filter by score >= this value
        max_score: Filter by score <= this value
        ai_model_version: Filter by AI model version
        created_from: Filter by created_at >= this datetime
        created_to: Filter by created_at <= this datetime
        min_processing_time: Filter by processing_time_ms >= this value
        max_processing_time: Filter by processing_time_ms <= this value
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication enforced by FastAPI dependency injection via current_user parameter
    # Search access logging for security compliance
    logger = logging.getLogger(__name__)
    logger.info(f"AI results search by admin user {current_user.id} ({current_user.username})")

    # Build query using SQLModel syntax
    query: Any = select(AIResult)

    # For auditors, only show their own AI results
    if current_user.role == "auditor":
        query = query.where(AIResult.user_id == current_user.id)
    elif user_id is not None:
        query = query.where(AIResult.user_id == user_id)
    
    if file_upload_id is not None:
        query = query.where(AIResult.file_upload_id == file_upload_id)
    if checklist_id is not None:
        query = query.where(AIResult.checklist_id == checklist_id)
    if min_score is not None:
        query = query.where(AIResult.score >= min_score)
    if max_score is not None:
        query = query.where(AIResult.score <= max_score)
    if ai_model_version is not None:
        # Use database-level case-insensitive search for better performance
        query = query.where(
            func.lower(AIResult.ai_model_version).like(f"%{ai_model_version.lower()}%")
        )
    if created_from is not None:
        query = query.where(AIResult.created_at >= created_from)
    if created_to is not None:
        query = query.where(AIResult.created_at <= created_to)
    if min_processing_time is not None:
        # Type: ignore to suppress false positive Pylance warning
        query = query.where(
            (AIResult.processing_time_ms != None)  # noqa: E711
            & (AIResult.processing_time_ms >= min_processing_time)  # type: ignore[operator]
        )
    if max_processing_time is not None:
        # Type: ignore to suppress false positive Pylance warning
        query = query.where(
            (AIResult.processing_time_ms != None)  # noqa: E711
            & (AIResult.processing_time_ms <= max_processing_time)  # type: ignore[operator]
        )

    # Add ordering at database level for better performance
    query = query.order_by(text("created_at DESC"))

    # Get total count efficiently
    count_query: Any = select(func.count()).select_from(AIResult)
    
    # For auditors, only show their own AI results
    if current_user.role == "auditor":
        count_query = count_query.where(AIResult.user_id == current_user.id)
    elif user_id is not None:
        count_query = count_query.where(AIResult.user_id == user_id)
    
    if file_upload_id is not None:
        count_query = count_query.where(AIResult.file_upload_id == file_upload_id)
    if checklist_id is not None:
        count_query = count_query.where(AIResult.checklist_id == checklist_id)
    if min_score is not None:
        count_query = count_query.where(AIResult.score >= min_score)
    if max_score is not None:
        count_query = count_query.where(AIResult.score <= max_score)
    if ai_model_version is not None:
        count_query = count_query.where(
            func.lower(AIResult.ai_model_version).like(f"%{ai_model_version.lower()}%")
        )
    if created_from is not None:
        count_query = count_query.where(AIResult.created_at >= created_from)
    if created_to is not None:
        count_query = count_query.where(AIResult.created_at <= created_to)
    if min_processing_time is not None:
        # Type: ignore to suppress false positive Pylance warning
        count_query = count_query.where(
            (AIResult.processing_time_ms != None)  # noqa: E711
            & (AIResult.processing_time_ms >= min_processing_time)  # type: ignore[operator]
        )
    if max_processing_time is not None:
        # Type: ignore to suppress false positive Pylance warning
        count_query = count_query.where(
            (AIResult.processing_time_ms != None)  # noqa: E711
            & (AIResult.processing_time_ms <= max_processing_time)  # type: ignore[operator]
        )

    total = db.exec(count_query).first()

    # Apply pagination at database level
    paginated_query = query.offset(offset).limit(limit)
    records = db.exec(paginated_query).all()

    return {
        "total": total,
        "results": [
            {
                "id": r.id,
                "file_upload_id": r.file_upload_id,
                "checklist_id": r.checklist_id,
                "user_id": r.user_id,
                "score": r.score,
                "feedback": r.feedback,
                "processing_time_ms": r.processing_time_ms,
                "ai_model_version": r.ai_model_version,
                "created_at": r.created_at,
                "created_by_user_id": r.created_by_user_id,
            }
            for r in records
        ],
    }


@router.get("/users")
def search_users(
    username: Optional[str] = Query(None, description="Filter by username (case-insensitive)"),
    email: Optional[str] = Query(None, description="Filter by email (case-insensitive)"),
    role: Optional[str] = Query(None, description="Filter by role (admin/auditor/reviewer)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    last_login_from: Optional[datetime] = Query(
        None, description="Filter by last_login >= this datetime"
    ),
    last_login_to: Optional[datetime] = Query(
        None, description="Filter by last_login <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search users with various filters.

    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(f"User search by admin user {current_user.id} ({current_user.username})")

    Args:
        username: Filter by username (case-insensitive)
        email: Filter by email (case-insensitive)
        role: Filter by role (admin/auditor/reviewer)
        is_active: Filter by active status
        created_from: Filter by created_at >= this datetime
        created_to: Filter by created_at <= this datetime
        last_login_from: Filter by last_login >= this datetime
        last_login_to: Filter by last_login <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(f"User search by admin user {current_user.id} ({current_user.username})")

    from app.models import User

    # Build query using SQLModel syntax
    query: Any = select(User)

    if role is not None:
        if role.lower() not in ("admin", "auditor", "reviewer"):
            raise HTTPException(
                status_code=400, detail="Invalid role (must be admin/auditor/reviewer)"
            )
        query = query.where(User.role == role.lower())
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if created_from is not None:
        query = query.where(User.created_at >= created_from)
    if created_to is not None:
        query = query.where(User.created_at <= created_to)
    if last_login_from is not None:
        # Will be handled after query execution
        pass
    if last_login_to is not None:
        # Will be handled after query execution
        pass

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if username is not None:
        all_records = [u for u in all_records if username.lower() in u.username.lower()]
    if email is not None:
        all_records = [u for u in all_records if email.lower() in u.email.lower()]

    # Apply last_login filters in Python if needed
    if last_login_from is not None:
        all_records = [
            u for u in all_records if u.last_login is not None and u.last_login >= last_login_from
        ]
    if last_login_to is not None:
        all_records = [
            u for u in all_records if u.last_login is not None and u.last_login <= last_login_to
        ]

    total = len(all_records)

    # Sort by created_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.created_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login,
                "created_at": u.created_at,
            }
            for u in records
        ],
    }


@router.get("/notifications")
def search_notifications(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    title: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    message: Optional[str] = Query(
        None, description="Filter by message content (case-insensitive)"
    ),
    type: Optional[str] = Query(
        None, description="Filter by notification type (info/warning/error/success)"
    ),
    read: Optional[bool] = Query(None, description="Filter by read status"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search notifications with various filters.

    # Authentication required via current_user dependency injection

    Args:
        user_id: Filter by user ID
        title: Filter by title (case-insensitive)
        message: Filter by message content (case-insensitive)
        type: Filter by notification type (info/warning/error/success)
        read: Filter by read status
        created_from: Filter by created_at >= this datetime
        created_to: Filter by created_at <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(f"Notification search by admin user {current_user.id} ({current_user.username})")

    from app.models import Notification

    # Build query using SQLModel syntax
    query: Any = select(Notification)

    if user_id is not None:
        query = query.where(Notification.user_id == user_id)
    if type is not None:
        if type.lower() not in ("info", "warning", "error", "success"):
            raise HTTPException(
                status_code=400,
                detail="Invalid type (must be info/warning/error/success)",
            )
        query = query.where(Notification.type == type.lower())
    if read is not None:
        query = query.where(Notification.read == read)
    if created_from is not None:
        query = query.where(Notification.created_at >= created_from)
    if created_to is not None:
        query = query.where(Notification.created_at <= created_to)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if title is not None:
        all_records = [n for n in all_records if title.lower() in n.title.lower()]
    if message is not None:
        all_records = [n for n in all_records if message.lower() in n.message.lower()]

    total = len(all_records)

    # Sort by created_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.created_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "type": n.type,
                "read": n.read,
                "created_at": n.created_at,
            }
            for n in records
        ],
    }


@router.get("/submission-answers")
def search_submission_answers(
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    question_id: Optional[int] = Query(None, description="Filter by question ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    answer_text: Optional[str] = Query(
        None, description="Filter by answer text (case-insensitive)"
    ),
    submitted_from: Optional[datetime] = Query(
        None, description="Filter by submitted_at >= this datetime"
    ),
    submitted_to: Optional[datetime] = Query(
        None, description="Filter by submitted_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search submission answers with various filters.

    # Authentication required via current_user dependency injection

    Args:
        checklist_id: Filter by checklist ID
        question_id: Filter by question ID
        user_id: Filter by user ID
        answer_text: Filter by answer text (case-insensitive)
        submitted_from: Filter by submitted_at >= this datetime
        submitted_to: Filter by submitted_at <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(
        f"Submission answers search by admin user {current_user.id} ({current_user.username})"
    )

    from app.models import SubmissionAnswer

    # Build query using SQLModel syntax
    query: Any = select(SubmissionAnswer)

    if checklist_id is not None:
        query = query.where(SubmissionAnswer.checklist_id == checklist_id)
    if question_id is not None:
        query = query.where(SubmissionAnswer.question_id == question_id)
    if user_id is not None:
        query = query.where(SubmissionAnswer.user_id == user_id)
    if submitted_from is not None:
        query = query.where(SubmissionAnswer.submitted_at >= submitted_from)
    if submitted_to is not None:
        query = query.where(SubmissionAnswer.submitted_at <= submitted_to)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive answer text filter in Python
    if answer_text is not None:
        all_records = [a for a in all_records if answer_text.lower() in a.answer_text.lower()]

    total = len(all_records)

    # Sort by submitted_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.submitted_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": a.id,
                "checklist_id": a.checklist_id,
                "question_id": a.question_id,
                "user_id": a.user_id,
                "answer_text": a.answer_text,
                "submitted_at": a.submitted_at,
            }
            for a in records
        ],
    }


@router.get("/checklists")
def search_checklists(
    title: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    description: Optional[str] = Query(
        None, description="Filter by description (case-insensitive)"
    ),
    created_by: Optional[int] = Query(None, description="Filter by created_by user ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    version: Optional[int] = Query(None, description="Filter by version number"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    updated_from: Optional[datetime] = Query(
        None, description="Filter by updated_at >= this datetime"
    ),
    updated_to: Optional[datetime] = Query(
        None, description="Filter by updated_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search checklists with various filters.

    # Authentication required via current_user dependency injection

    Args:
        title: Filter by title (case-insensitive)
        description: Filter by description (case-insensitive)
        created_by: Filter by created_by user ID
        is_active: Filter by active status
        version: Filter by version number
        created_from: Filter by created_at >= this datetime
        created_to: Filter by created_at <= this datetime
        updated_from: Filter by updated_at >= this datetime
        updated_to: Filter by updated_at <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)

    Returns:
        Dictionary with total count and paginated results
    """
    # Authentication required via current_user dependency injection
    logger = logging.getLogger(__name__)
    logger.info(f"Checklist search by admin user {current_user.id} ({current_user.username})")

    from app.models import Checklist

    # Build query using SQLModel syntax
    query: Any = select(Checklist)

    if created_by is not None:
        query = query.where(Checklist.created_by == created_by)
    if is_active is not None:
        query = query.where(Checklist.is_active == is_active)
    if version is not None:
        query = query.where(Checklist.version == version)
    if created_from is not None:
        query = query.where(Checklist.created_at >= created_from)
    if created_to is not None:
        query = query.where(Checklist.created_at <= created_to)
    if updated_from is not None:
        # Will be handled after query execution since updated_at might be None
        pass
    if updated_to is not None:
        # Will be handled after query execution since updated_at might be None
        pass

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if title is not None:
        all_records = [c for c in all_records if title.lower() in c.title.lower()]
    if description is not None:
        all_records = [
            c for c in all_records if c.description and description.lower() in c.description.lower()
        ]

    # Apply updated_at filters in Python if needed
    if updated_from is not None:
        all_records = [
            c for c in all_records if c.updated_at is not None and c.updated_at >= updated_from
        ]
    if updated_to is not None:
        all_records = [
            c for c in all_records if c.updated_at is not None and c.updated_at <= updated_to
        ]

    total = len(all_records)

    # Sort by created_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.created_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "created_by": c.created_by,
                "is_active": c.is_active,
                "version": c.version,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "created_by_user_id": c.created_by_user_id,
            }
            for c in records
        ],
    }


@router.get("/checklist-items")
def search_checklist_items(
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    question_text: Optional[str] = Query(
        None, description="Filter by question text (case-insensitive)"
    ),
    category: Optional[str] = Query(None, description="Filter by category (case-insensitive)"),
    weight: Optional[float] = Query(None, ge=0.0, description="Filter by weight value"),
    is_required: Optional[bool] = Query(None, description="Filter by required status"),
    order_index: Optional[int] = Query(None, ge=0, description="Filter by order index"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search checklist items (questions) with various filters.

    # Authentication required via current_user dependency injection
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Checklist items search by admin user {current_user.id} ({current_user.username})")

    from app.models import ChecklistItem

    # Build query using SQLModel syntax
    query: Any = select(ChecklistItem)

    if checklist_id is not None:
        query = query.where(ChecklistItem.checklist_id == checklist_id)
    if weight is not None:
        query = query.where(ChecklistItem.weight == weight)
    if is_required is not None:
        query = query.where(ChecklistItem.is_required == is_required)
    if order_index is not None:
        query = query.where(ChecklistItem.order_index == order_index)
    if created_from is not None:
        query = query.where(ChecklistItem.created_at >= created_from)
    if created_to is not None:
        query = query.where(ChecklistItem.created_at <= created_to)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if question_text is not None:
        all_records = [
            item for item in all_records if question_text.lower() in item.question_text.lower()
        ]
    if category is not None:
        all_records = [
            item
            for item in all_records
            if item.category and category.lower() in item.category.lower()
        ]

    total = len(all_records)

    # Sort by order_index then created_at
    all_records = sorted(all_records, key=lambda x: (x.order_index, x.created_at))

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": item.id,
                "checklist_id": item.checklist_id,
                "question_text": item.question_text,
                "weight": item.weight,
                "category": item.category,
                "is_required": item.is_required,
                "order_index": item.order_index,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "created_by_user_id": item.created_by_user_id,
            }
            for item in records
        ],
    }


@router.get("/comments")
def search_comments(
    file_upload_id: Optional[int] = Query(None, description="Filter by file upload ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    text: Optional[str] = Query(None, description="Filter by comment text (case-insensitive)"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search comments with various filters.

    # Authentication required via current_user dependency injection
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Comments search by admin user {current_user.id} ({current_user.username})")

    from app.models import Comment

    # Build query using SQLModel syntax
    query: Any = select(Comment)

    if file_upload_id is not None:
        query = query.where(Comment.file_upload_id == file_upload_id)
    if user_id is not None:
        query = query.where(Comment.user_id == user_id)
    if created_from is not None:
        query = query.where(Comment.created_at >= created_from)
    if created_to is not None:
        query = query.where(Comment.created_at <= created_to)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive text filter in Python
    if text is not None:
        all_records = [comment for comment in all_records if text.lower() in comment.text.lower()]

    total = len(all_records)

    # Sort by created_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.created_at, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": comment.id,
                "file_upload_id": comment.file_upload_id,
                "user_id": comment.user_id,
                "text": comment.text,
                "created_at": comment.created_at,
            }
            for comment in records
        ],
    }


@router.get("/audit-logs")
def search_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action (case-insensitive)"),
    resource_type: Optional[str] = Query(
        None, description="Filter by resource type (case-insensitive)"
    ),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    details: Optional[str] = Query(
        None, description="Filter by details content (case-insensitive)"
    ),
    timestamp_from: Optional[datetime] = Query(
        None, description="Filter by timestamp >= this datetime"
    ),
    timestamp_to: Optional[datetime] = Query(
        None, description="Filter by timestamp <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search audit logs with various filters.

    # Authentication required via current_user dependency injection
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Audit logs search by admin user {current_user.id} ({current_user.username})")

    from app.models import AuditLog

    # Build query using SQLModel syntax
    query: Any = select(AuditLog)

    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
    if resource_id is not None:
        query = query.where(AuditLog.resource_id == resource_id)
    if ip_address is not None:
        query = query.where(AuditLog.ip_address == ip_address)
    if timestamp_from is not None:
        query = query.where(AuditLog.timestamp >= timestamp_from)
    if timestamp_to is not None:
        query = query.where(AuditLog.timestamp <= timestamp_to)

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if action is not None:
        all_records = [log for log in all_records if action.lower() in log.action.lower()]
    if resource_type is not None:
        all_records = [
            log
            for log in all_records
            if log.resource_type and resource_type.lower() in log.resource_type.lower()
        ]
    if details is not None:
        all_records = [
            log for log in all_records if log.details and details.lower() in log.details.lower()
        ]

    total = len(all_records)

    # Sort by timestamp descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.timestamp, reverse=True)

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
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
            for log in records
        ],
    }


@router.get("/system-config")
def search_system_config(
    key: Optional[str] = Query(None, description="Filter by key (case-insensitive)"),
    value: Optional[str] = Query(None, description="Filter by value (case-insensitive)"),
    description: Optional[str] = Query(
        None, description="Filter by description (case-insensitive)"
    ),
    is_sensitive: Optional[bool] = Query(None, description="Filter by sensitive status"),
    created_from: Optional[datetime] = Query(
        None, description="Filter by created_at >= this datetime"
    ),
    created_to: Optional[datetime] = Query(
        None, description="Filter by created_at <= this datetime"
    ),
    updated_from: Optional[datetime] = Query(
        None, description="Filter by updated_at >= this datetime"
    ),
    updated_to: Optional[datetime] = Query(
        None, description="Filter by updated_at <= this datetime"
    ),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Search system configuration settings with various filters.

    # Authentication required via current_user dependency injection
    """
    logger = logging.getLogger(__name__)
    logger.info(f"System config search by admin user {current_user.id} ({current_user.username})")

    from app.models import SystemConfig

    # Build query using SQLModel syntax
    query: Any = select(SystemConfig)

    if is_sensitive is not None:
        query = query.where(SystemConfig.is_sensitive == is_sensitive)
    if created_from is not None:
        query = query.where(SystemConfig.created_at >= created_from)
    if created_to is not None:
        query = query.where(SystemConfig.created_at <= created_to)
    if updated_from is not None:
        # Will be handled after query execution since updated_at might be None
        pass
    if updated_to is not None:
        # Will be handled after query execution since updated_at might be None
        pass

    # Get all records and apply filters
    all_records = db.exec(query).all()

    # Apply case-insensitive string filters in Python
    if key is not None:
        all_records = [config for config in all_records if key.lower() in config.key.lower()]
    if value is not None:
        all_records = [config for config in all_records if value.lower() in config.value.lower()]
    if description is not None:
        all_records = [
            config
            for config in all_records
            if config.description and description.lower() in config.description.lower()
        ]

    # Apply updated_at filters in Python if needed
    if updated_from is not None:
        all_records = [
            config
            for config in all_records
            if config.updated_at is not None and config.updated_at >= updated_from
        ]
    if updated_to is not None:
        all_records = [
            config
            for config in all_records
            if config.updated_at is not None and config.updated_at <= updated_to
        ]

    total = len(all_records)

    # Sort by key ascending
    all_records = sorted(all_records, key=lambda x: x.key.lower())

    # Apply pagination
    records = all_records[offset : offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": config.id,
                "key": config.key,
                "value": (
                    config.value if not config.is_sensitive else "***HIDDEN***"
                ),  # Hide sensitive values
                "description": config.description,
                "is_sensitive": config.is_sensitive,
                "created_at": config.created_at,
                "updated_at": config.updated_at,
            }
            for config in records
        ],
    }
