from datetime import datetime
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.auth import get_current_user, require_role
from app.database import get_session
from app.models import Comment, FileUpload
from app.utils.notifications import notify_file_commented, notify_file_status_change


def require_any_role(*roles: str):
    """Helper function to require any of the specified roles"""

    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of the following roles: {', '.join(roles)}",
            )
        return current_user

    return role_checker


# Request/Response models
class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Comment text content")


class CommentResponse(BaseModel):
    comment_id: int
    user_id: int
    text: str
    created_at: datetime


class StatusRequest(BaseModel):
    status: ReviewStatus


class StatusResponse(BaseModel):
    status: ReviewStatus
    message: Optional[str] = None


router = APIRouter(prefix="/reviews", tags=["reviews"])


# Helper function to get file upload or raise 404
def get_file_upload_or_404(db: Session, file_upload_id: int) -> FileUpload:
    """Helper function to get file upload or raise 404"""
    upload = db.get(FileUpload, file_upload_id)
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File upload with ID {file_upload_id} not found",
        )
    return upload


# Add comment/review
@router.post("/{file_upload_id}/comment", response_model=CommentResponse)
def add_comment(
    file_upload_id: int,
    comment_request: CommentRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_any_role("admin", "reviewer")),  # Allow admin or reviewer
):
    """
    Add a comment/review to a file upload.

    - **file_upload_id**: ID of the file upload to comment on
    - **comment_request**: Comment text content
    - **Returns**: Created comment with metadata
    """
    # Validate that the file upload exists (will raise 404 if not found)
    upload = get_file_upload_or_404(db, file_upload_id)

    comment = Comment(
        file_upload_id=file_upload_id,
        user_id=current_user.id,
        text=comment_request.text,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Send notification to file owner (only if they're not the commenter)
    if upload.user_id != current_user.id:
        try:
            commenter_name = getattr(current_user, "username", "Reviewer")
            notify_file_commented(db=db, file_upload=upload, commenter_name=commenter_name)
        except Exception as e:
            # Log error but don't fail the comment creation
            import logging

            logger = logging.getLogger(__name__)
            logger.exception(f"Failed to send comment notification: {e}")

    return CommentResponse(
        comment_id=comment.id or 0,  # Should never be None after commit/refresh
        user_id=comment.user_id,
        text=comment.text,
        created_at=comment.created_at,
    )


# Change status (approve/reject)
@router.post("/{file_upload_id}/status", response_model=StatusResponse)
def set_status(
    file_upload_id: int,
    status_request: StatusRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_any_role("admin", "reviewer")),
):
    """
    Change the status of a file upload (approve/reject/pending).

    - **file_upload_id**: ID of the file upload to update
    - **status_request**: New status (pending, approved, rejected)
    - **Returns**: Updated status with confirmation message
    """
    upload = get_file_upload_or_404(db, file_upload_id)

    # Store previous status to check if it changed
    old_status = upload.status
    new_status = status_request.status.value

    upload.status = new_status
    db.add(upload)
    db.commit()
    db.refresh(upload)

    # Send notification if status actually changed
    if old_status != new_status:
        try:
            reviewer_name = getattr(current_user, "username", "Admin")
            notify_file_status_change(
                db=db,
                file_upload=upload,
                new_status=new_status,
                reviewer_name=reviewer_name,
            )
        except Exception as e:
            # Log error but don't fail the status change
            import logging

            logger = logging.getLogger(__name__)
            logger.exception(f"Failed to send status change notification: {e}")

    return StatusResponse(
        status=ReviewStatus(upload.status),
        message=f"Status successfully set to {status_request.status.value}",
    )


# Get comments for a file upload
@router.get("/{file_upload_id}/comments", response_model=List[CommentResponse])
def get_comments(
    file_upload_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_any_role("admin", "reviewer")),
):
    """
    Retrieve all comments for a specific file upload.

    - **file_upload_id**: ID of the file upload to get comments for
    - **Returns**: List of comments with metadata
    """
    comments = db.exec(select(Comment).where(Comment.file_upload_id == file_upload_id)).all()

    return [
        CommentResponse(
            comment_id=c.id or 0,
            user_id=c.user_id,
            text=c.text,
            created_at=c.created_at,
        )
        for c in comments
    ]


# Get status for a file upload (can be added to user endpoints)
@router.get("/{file_upload_id}/status", response_model=StatusResponse)
def get_status(
    file_upload_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_any_role("auditor", "admin", "reviewer")),
):
    """
    Get the current status of a file upload.

    - **file_upload_id**: ID of the file upload to check
    - **Returns**: Current status of the file upload
    """
    upload = get_file_upload_or_404(db, file_upload_id)

    return StatusResponse(status=ReviewStatus(upload.status))
