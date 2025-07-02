"""Centralized schema definitions for the ESG Checklist AI application.

This package contains all Pydantic model definitions organized by domain:
- common: Shared schemas used across the application
- users: User-related schemas including authentication
- checklists: Checklist and checklist item schemas
- submissions: Submission and response schemas
- reviews: Review and comment schemas
- uploads: File upload and processing schemas
- analytics: Analytics and reporting schemas
"""

# Common schemas
from .common import (
    Token,
    MessageResponse,
    StatusResponse,
)

# User schemas
from .users import (
    UserLogin,
    UserCreate,
    UserRead,
    UserUpdate,
    UserCreateAdmin,
    UserUpdateAdmin,
    UserReadAdmin,
    UserListResponse,
    PasswordResetAdmin,
    PasswordChange,
)

# Checklist schemas
from .checklists import (
    ChecklistItemCreate,
    ChecklistItemRead,
    ChecklistItemUpdate,
    ChecklistCreate,
    ChecklistRead,
    ChecklistUpdate,
    ChecklistItemCreateAdmin,
    ChecklistItemUpdateAdmin,
    ChecklistItemReadAdmin,
    ChecklistCreateAdmin,
    ChecklistUpdateAdmin,
    ChecklistReadAdmin,
    ChecklistListResponse,
)

# Submission schemas
from .submissions import (
    SubmissionStatus,
    SubmissionCreate,
    SubmissionRead,
    SubmissionUpdate,
    SubmissionListResponse,
    SubmissionSummary,
)

# Review schemas
from .reviews import (
    ReviewStatus,
    CommentRequest,
    CommentResponse,
    StatusRequest,
    ReviewCreate,
    ReviewRead,
    ReviewUpdate,
    ReviewListResponse,
)

# Upload schemas
from .uploads import (
    FileType,
    UploadStatus,
    FileUploadRequest,
    FileUploadResponse,
    FileRead,
    FileListResponse,
    FileProcessingResult,
)

# Analytics schemas
from .analytics import (
    AnalyticsTimeframe,
    SubmissionAnalytics,
    UserAnalytics,
    ChecklistAnalytics,
    DashboardSummary,
    ReportRequest,
    ReportResponse,
)

__all__ = [
    # Common
    "Token",
    "MessageResponse",
    "StatusResponse",
    # Users
    "UserLogin",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "UserCreateAdmin",
    "UserUpdateAdmin",
    "UserReadAdmin",
    "UserListResponse",
    "PasswordResetAdmin",
    "PasswordChange",
    # Checklists
    "ChecklistItemCreate",
    "ChecklistItemRead",
    "ChecklistItemUpdate",
    "ChecklistCreate",
    "ChecklistRead",
    "ChecklistUpdate",
    "ChecklistItemCreateAdmin",
    "ChecklistItemUpdateAdmin",
    "ChecklistItemReadAdmin",
    "ChecklistCreateAdmin",
    "ChecklistUpdateAdmin",
    "ChecklistReadAdmin",
    "ChecklistListResponse",
    # Submissions
    "SubmissionStatus",
    "SubmissionCreate",
    "SubmissionRead",
    "SubmissionUpdate",
    "SubmissionListResponse",
    "SubmissionSummary",
    # Reviews
    "ReviewStatus",
    "CommentRequest",
    "CommentResponse",
    "StatusRequest",
    "ReviewCreate",
    "ReviewRead",
    "ReviewUpdate",
    "ReviewListResponse",
    # Uploads
    "FileType",
    "UploadStatus",
    "FileUploadRequest",
    "FileUploadResponse",
    "FileRead",
    "FileListResponse",
    "FileProcessingResult",
    # Analytics
    "AnalyticsTimeframe",
    "SubmissionAnalytics",
    "UserAnalytics",
    "ChecklistAnalytics",
    "DashboardSummary",
    "ReportRequest",
    "ReportResponse",
]
