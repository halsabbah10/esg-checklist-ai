"""Analytics and reporting schemas."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


from enum import Enum


class AnalyticsTimeframe(str, Enum):
    """Analytics timeframe enumeration."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubmissionAnalytics(BaseModel):
    """Submission analytics schema."""
    total_submissions: int
    completed_submissions: int
    pending_submissions: int
    average_score: Optional[float] = None
    completion_rate: float
    timeframe: str
    period_start: date
    period_end: date


class UserAnalytics(BaseModel):
    """User analytics schema."""
    total_users: int
    active_users: int
    new_users_period: int
    user_roles_distribution: Dict[str, int]
    timeframe: str
    period_start: date
    period_end: date


class ChecklistAnalytics(BaseModel):
    """Checklist analytics schema."""
    checklist_id: int
    checklist_title: str
    total_submissions: int
    average_score: Optional[float] = None
    completion_rate: float
    most_failed_questions: List[Dict[str, Any]]


class DashboardSummary(BaseModel):
    """Dashboard summary schema."""
    total_users: int
    total_checklists: int
    total_submissions: int
    pending_reviews: int
    recent_activity: List[Dict[str, Any]]
    top_performing_checklists: List[ChecklistAnalytics]


class ReportRequest(BaseModel):
    """Report generation request schema."""
    report_type: str
    timeframe: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    filters: Optional[Dict[str, Any]] = None


class ReportResponse(BaseModel):
    """Report generation response schema."""
    report_id: str
    report_type: str
    status: str
    generated_at: datetime
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
