"""Review and comment schemas."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ReviewStatus(str, Enum):
    """Review status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class CommentRequest(BaseModel):
    """Comment creation request schema."""

    text: str
    submission_id: int


class CommentResponse(BaseModel):
    """Comment response schema."""

    id: int
    text: str
    submission_id: int
    user_id: int
    created_at: datetime


class StatusRequest(BaseModel):
    """Status update request schema."""

    status: ReviewStatus


class StatusResponse(BaseModel):
    """Status update response schema."""

    submission_id: int
    status: ReviewStatus
    updated_at: datetime


class ReviewCreate(BaseModel):
    """Review creation schema."""

    submission_id: int
    status: ReviewStatus = ReviewStatus.PENDING
    comments: Optional[str] = None


class ReviewRead(BaseModel):
    """Review response schema."""

    id: int
    submission_id: int
    reviewer_id: int
    status: ReviewStatus
    comments: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ReviewUpdate(BaseModel):
    """Review update schema."""

    status: Optional[ReviewStatus] = None
    comments: Optional[str] = None


class ReviewListResponse(BaseModel):
    """Response schema for review list with pagination."""

    reviews: List[ReviewRead]
    total: int
    page: int
    page_size: int
