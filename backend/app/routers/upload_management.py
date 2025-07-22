"""
Upload Management Router
Handles upload status updates, comments, and related operations.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..auth import require_role
from ..database import get_session
from ..models import Comment, FileUpload, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["upload-management"])


class CommentRequest(BaseModel):
    comment: str
    comment_type: Optional[str] = "general"


class StatusRequest(BaseModel):
    status: str
    comment: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str
    comment: Optional[str] = None
    reviewer_notes: Optional[str] = None


@router.get("/{upload_id}/status")
def get_upload_status(
    upload_id: int,
    db: Session = Depends(get_session),
    _current_user: User = Depends(require_role("auditor")),
):
    """Get the current status of an upload."""
    try:
        file_upload = db.get(FileUpload, upload_id)
        if not file_upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
            )

        return {
            "upload_id": upload_id,
            "status": getattr(file_upload, "processing_status", "unknown"),
            "filename": file_upload.filename,
            "created_at": file_upload.created_at,
            "updated_at": getattr(file_upload, "updated_at", file_upload.created_at),
            "user_id": file_upload.user_id,
            "file_size": file_upload.file_size,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting upload status for {upload_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting upload status"
        )


@router.post("/{upload_id}/status")
def update_upload_status(
    upload_id: int,
    request: StatusRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role("reviewer")),
):
    """Update the status of an upload (reviewer only)."""
    try:
        file_upload = db.get(FileUpload, upload_id)
        if not file_upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
            )

        # Update status if the field exists
        if hasattr(file_upload, "processing_status"):
            file_upload.processing_status = request.status

        # Add comment if provided
        if request.comment:
            comment = Comment(
                file_upload_id=upload_id,
                user_id=current_user.id,
                text=request.comment,
                created_at=datetime.now(timezone.utc),
            )
            db.add(comment)

        db.add(file_upload)
        db.commit()
        db.refresh(file_upload)

        return {
            "success": True,
            "message": f"Upload status updated to {request.status}",
            "upload_id": upload_id,
            "status": request.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating upload status for {upload_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating upload status"
        )


@router.get("/{upload_id}/comments")
def get_upload_comments(
    upload_id: int,
    db: Session = Depends(get_session),
    _current_user: User = Depends(require_role("auditor")),
):
    """Get all comments for an upload."""
    try:
        # Verify upload exists
        file_upload = db.get(FileUpload, upload_id)
        if not file_upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
            )

        # Get comments for this upload
        comments_query = select(Comment).where(Comment.file_upload_id == upload_id)
        comments = db.exec(comments_query).all()

        # Format comments with user info
        formatted_comments = []
        for comment in comments:
            user = db.get(User, comment.user_id)
            formatted_comments.append({
                "id": comment.id,
                "content": comment.text,
                "created_at": comment.created_at,
                "user": {
                    "id": comment.user_id,
                    "username": user.username if user else "Unknown",
                    "role": user.role if user else "unknown",
                },
            })

        return {
            "upload_id": upload_id,
            "comments": formatted_comments,
            "total": len(formatted_comments),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting comments for upload {upload_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting upload comments"
        )


@router.post("/{upload_id}/comment")
def add_upload_comment(
    upload_id: int,
    request: CommentRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role("auditor")),
):
    """Add a comment to an upload."""
    try:
        # Verify upload exists
        file_upload = db.get(FileUpload, upload_id)
        if not file_upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
            )

        # Create comment
        comment = Comment(
            file_upload_id=upload_id,
            user_id=current_user.id,
            text=request.comment,
            created_at=datetime.now(timezone.utc),
        )

        db.add(comment)
        db.commit()
        db.refresh(comment)

        return {
            "success": True,
            "message": "Comment added successfully",
            "comment": {
                "id": comment.id,
                "content": comment.text,
                "created_at": comment.created_at,
                "user": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "role": current_user.role,
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error adding comment to upload {upload_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding comment"
        )