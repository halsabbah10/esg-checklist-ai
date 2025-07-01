"""Submission-related schemas."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SubmissionStatus(str, Enum):
    """Submission status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class SubmissionCreate(BaseModel):
    """Submission creation schema."""
    checklist_id: int
    responses: Dict[int, Any]  # question_id -> response
    status: SubmissionStatus = SubmissionStatus.DRAFT


class SubmissionRead(BaseModel):
    """Submission response schema."""
    id: int
    checklist_id: int
    user_id: int
    responses: Dict[int, Any]
    status: SubmissionStatus
    score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None


class SubmissionUpdate(BaseModel):
    """Submission update schema."""
    responses: Optional[Dict[int, Any]] = None
    status: Optional[SubmissionStatus] = None


class SubmissionListResponse(BaseModel):
    """Response schema for submission list with pagination."""
    submissions: List[SubmissionRead]
    total: int
    page: int
    page_size: int


class SubmissionSummary(BaseModel):
    """Submission summary schema for analytics."""
    id: int
    checklist_title: str
    user_username: str
    status: SubmissionStatus
    score: Optional[float] = None
    submitted_at: Optional[datetime] = None
