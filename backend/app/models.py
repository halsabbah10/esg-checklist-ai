import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Index, Text
from sqlmodel import Field, Relationship, SQLModel


def generate_uuid() -> str:
    """Generate a unique identifier"""
    return str(uuid.uuid4())


class BaseModel(SQLModel):
    """Base model with common fields"""

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")


class User(SQLModel, table=True):
    __tablename__ = "user"  # type: ignore
    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_username", "username"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=50)
    email: str = Field(unique=True, max_length=255)
    password_hash: str = Field(max_length=255)
    role: str = Field(max_length=20)  # e.g., "admin", "auditor", "reviewer"
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships - simplified for now
    # created_checklists: List["Checklist"] = Relationship(
    #     back_populates="creator",
    #     sa_relationship_kwargs={"foreign_keys": "[Checklist.created_by]"}
    # )
    # file_uploads: List["FileUpload"] = Relationship(
    #     back_populates="user",
    #     sa_relationship_kwargs={"foreign_keys": "[FileUpload.user_id]"}
    # )


class Checklist(BaseModel, table=True):
    __tablename__ = "checklist"  # type: ignore
    __table_args__ = (
        Index("idx_checklist_title", "title"),
        Index("idx_checklist_created_by", "created_by"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, sa_type=Text)
    created_by: int = Field(foreign_key="user.id")
    is_active: bool = Field(default=True)
    version: int = Field(default=1)

    # Relationships - commented out temporarily to avoid foreign key conflicts
    # items: List["ChecklistItem"] = Relationship(back_populates="checklist")
    # creator: Optional[User] = Relationship(back_populates="created_checklists")
    # file_uploads: List["FileUpload"] = Relationship(back_populates="checklist")


class ChecklistItem(BaseModel, table=True):
    __tablename__ = "checklistitem"  # type: ignore
    __table_args__ = (
        Index("idx_checklistitem_checklist", "checklist_id"),
        Index("idx_checklistitem_category", "category"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    question_text: str = Field(sa_type=Text)
    weight: Optional[float] = Field(default=1.0)
    category: Optional[str] = Field(default=None, max_length=100)
    is_required: bool = Field(default=True)
    order_index: int = Field(default=0)

    # Relationships
    # checklist: Optional[Checklist] = Relationship(back_populates="items")


class Submission(BaseModel, table=True):
    __tablename__ = "submission"  # type: ignore
    __table_args__ = (
        Index("idx_submission_checklist", "checklist_id"),
        Index("idx_submission_user", "user_id"),
        Index("idx_submission_status", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="pending", max_length=20)  # pending, approved, rejected
    reviewer_notes: Optional[str] = Field(default=None, sa_type=Text)
    completion_percentage: float = Field(default=0.0)


class Comment(SQLModel, table=True):
    __tablename__ = "comment"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    file_upload_id: int = Field(foreign_key="fileupload.id")
    user_id: int = Field(foreign_key="user.id")
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # file_upload: Optional["FileUpload"] = Relationship(back_populates="comments")
    file_upload: Optional["FileUpload"] = Relationship(back_populates="comments")


class FileUpload(BaseModel, table=True):
    __tablename__ = "fileupload"  # type: ignore
    __table_args__ = (
        Index("idx_fileupload_checklist", "checklist_id"),
        Index("idx_fileupload_user", "user_id"),
        Index("idx_fileupload_uploaded_at", "uploaded_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: Optional[int] = Field(default=None, foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    filename: str = Field(max_length=255)
    filepath: str = Field(max_length=500)
    file_size: Optional[int] = Field(default=None)
    file_type: Optional[str] = Field(default=None, max_length=50)
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processing_status: str = Field(default="pending", max_length=20)  # pending, processed, failed

    # Relationships
    # user: Optional[User] = Relationship(back_populates="file_uploads")
    # checklist: Optional[Checklist] = Relationship(back_populates="file_uploads")
    # ai_results: List["AIResult"] = Relationship(back_populates="file_upload")

    status: str = Field(default="pending")  # "pending", "approved", "rejected"
    comments: List["Comment"] = Relationship(back_populates="file_upload")


class AIResult(BaseModel, table=True):
    __tablename__ = "airesult"  # type: ignore
    __table_args__ = (
        Index("idx_airesult_file_upload", "file_upload_id"),
        Index("idx_airesult_checklist", "checklist_id"),
        Index("idx_airesult_score", "score"),
        Index("idx_airesult_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    file_upload_id: int = Field(foreign_key="fileupload.id")
    checklist_id: Optional[int] = Field(default=None, foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    raw_text: str = Field(sa_type=Text)
    score: float = Field(ge=0.0, le=1.0)  # Validation: score must be between 0 and 1
    feedback: str = Field(sa_type=Text)
    processing_time_ms: Optional[int] = Field(default=None)
    ai_model_version: str = Field(default="gemini-2.0-flash-exp", max_length=50)
    analysis_metadata: Optional[str] = Field(
        default=None, sa_type=Text
    )  # JSON field for additional data like department context and checklist completeness
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    # file_upload: Optional[FileUpload] = Relationship(back_populates="ai_results")


class AuditLog(SQLModel, table=True):
    """Audit trail for important system actions"""

    __tablename__ = "auditlog"  # type: ignore
    __table_args__ = (
        Index("idx_auditlog_user", "user_id"),
        Index("idx_auditlog_action", "action"),
        Index("idx_auditlog_timestamp", "timestamp"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(foreign_key="user.id")
    action: str = Field(max_length=100)  # e.g., "file_upload", "checklist_create", "login"
    resource_type: Optional[str] = Field(max_length=50)  # e.g., "checklist", "file", "user"
    resource_id: Optional[str] = Field(max_length=100)
    details: Optional[str] = Field(sa_type=Text)  # JSON string with additional details
    ip_address: Optional[str] = Field(max_length=45)  # IPv6 compatible
    user_agent: Optional[str] = Field(max_length=500)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SystemConfig(SQLModel, table=True):
    """System configuration settings"""

    __tablename__ = "systemconfig"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, max_length=100)
    value: str = Field(sa_type=Text)
    description: Optional[str] = Field(sa_type=Text)
    is_sensitive: bool = Field(default=False)  # For passwords, API keys, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)


class SubmissionAnswer(SQLModel, table=True):
    __tablename__ = "submissionanswer"  # type: ignore
    __table_args__ = (
        Index("idx_submissionanswer_checklist", "checklist_id"),
        Index("idx_submissionanswer_question", "question_id"),
        Index("idx_submissionanswer_user", "user_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    question_id: int = Field(foreign_key="checklistitem.id")
    user_id: int = Field(foreign_key="user.id")
    answer_text: str = Field(sa_type=Text)
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Notification(SQLModel, table=True):
    __tablename__ = "notification"  # type: ignore
    __table_args__ = (
        Index("idx_notification_user", "user_id"),
        Index("idx_notification_created_at", "created_at"),
        Index("idx_notification_read", "read"),
        Index("idx_notification_type", "type"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str = Field(max_length=255)
    message: str = Field(sa_type=Text)
    link: Optional[str] = Field(default=None, max_length=500)  # e.g., link to file or submission
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = Field(default=False)
    type: str = Field(default="info", max_length=20)  # e.g., info, warning, error, success


# Real-time Analytics and Tracking Models


class UserActivity(SQLModel, table=True):
    """Track user actions for real-time analytics"""

    __tablename__ = "user_activity"  # type: ignore
    __table_args__ = (
        Index("idx_activity_user", "user_id"),
        Index("idx_activity_timestamp", "timestamp"),
        Index("idx_activity_action", "action_type"),
        Index("idx_activity_session", "session_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    session_id: str = Field(max_length=255)  # Track user session
    action_type: str = Field(max_length=100)  # e.g., "file_upload", "checklist_view", "login"
    action_details: Optional[str] = Field(default=None, sa_type=Text)  # JSON details
    resource_id: Optional[int] = Field(default=None)  # ID of resource (checklist, file, etc.)
    resource_type: Optional[str] = Field(default=None, max_length=50)  # Type of resource
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: Optional[int] = Field(default=None)  # Action duration in milliseconds
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, max_length=500)


class SystemMetrics(SQLModel, table=True):
    """Real-time system performance metrics"""

    __tablename__ = "system_metrics"  # type: ignore
    __table_args__ = (
        Index("idx_metrics_timestamp", "timestamp"),
        Index("idx_metrics_metric_name", "metric_name"),
        Index("idx_metrics_category", "category"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    metric_name: str = Field(
        max_length=100
    )  # e.g., "active_users", "upload_count", "ai_processing_time"
    metric_value: float = Field()
    metric_unit: Optional[str] = Field(
        default=None, max_length=20
    )  # e.g., "seconds", "count", "percentage"
    category: str = Field(max_length=50)  # e.g., "performance", "usage", "ai", "compliance"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    additional_data: Optional[str] = Field(default=None, sa_type=Text)  # JSON for extra context


class AnalyticsSnapshot(SQLModel, table=True):
    """Periodic snapshots for analytics trending"""

    __tablename__ = "analytics_snapshot"  # type: ignore
    __table_args__ = (
        Index("idx_snapshot_timestamp", "snapshot_timestamp"),
        Index("idx_snapshot_type", "snapshot_type"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    snapshot_type: str = Field(max_length=50)  # e.g., "daily", "hourly", "real_time"
    snapshot_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_users: int = Field(default=0)
    active_users_24h: int = Field(default=0)
    total_uploads: int = Field(default=0)
    uploads_24h: int = Field(default=0)
    total_checklists: int = Field(default=0)
    avg_ai_score: Optional[float] = Field(default=None)
    ai_processing_count_24h: int = Field(default=0)
    avg_processing_time_ms: Optional[float] = Field(default=None)
    system_health_score: Optional[float] = Field(default=None)
    additional_metrics: Optional[str] = Field(default=None, sa_type=Text)  # JSON


class RealtimeEvent(SQLModel, table=True):
    """Events for real-time dashboard updates"""

    __tablename__ = "realtime_event"  # type: ignore
    __table_args__ = (
        Index("idx_event_timestamp", "event_timestamp"),
        Index("idx_event_type", "event_type"),
        Index("idx_event_processed", "processed"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str = Field(
        max_length=100
    )  # e.g., "upload_completed", "ai_score_updated", "user_login"
    event_data: str = Field(sa_type=Text)  # JSON event payload
    event_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    processed: bool = Field(default=False)
    broadcast_channels: Optional[str] = Field(
        default=None, max_length=500
    )  # Comma-separated channels


class ComplianceTracking(SQLModel, table=True):
    """Track compliance metrics over time"""

    __tablename__ = "compliance_tracking"  # type: ignore
    __table_args__ = (
        Index("idx_compliance_checklist", "checklist_id"),
        Index("idx_compliance_timestamp", "timestamp"),
        Index("idx_compliance_score", "compliance_score"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    file_upload_id: Optional[int] = Field(default=None, foreign_key="fileupload.id")
    compliance_score: float = Field()  # 0.0 to 1.0
    environmental_score: Optional[float] = Field(default=None)
    social_score: Optional[float] = Field(default=None)
    governance_score: Optional[float] = Field(default=None)
    risk_level: str = Field(max_length=20)  # "Low", "Medium", "High", "Critical"
    compliance_gaps: Optional[str] = Field(default=None, sa_type=Text)  # JSON array of gaps
    recommendations: Optional[str] = Field(default=None, sa_type=Text)  # JSON array
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    auditor_notes: Optional[str] = Field(default=None, sa_type=Text)


# Audit Trail and Enhanced Tracking Models

class AuditTrail(SQLModel, table=True):
    """Track all significant operations for audit trail compliance"""
    
    __tablename__ = "audit_trail"  # type: ignore
    __table_args__ = (
        Index("idx_audit_trail_timestamp", "timestamp"),
        Index("idx_audit_trail_entity_type", "entity_type"),
        Index("idx_audit_trail_action", "action"),
        Index("idx_audit_trail_user", "user_id"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    action: str = Field(max_length=100)  # "create", "update", "delete", "analyze", "export", "email"
    entity_type: str = Field(max_length=50)  # "analysis", "checklist", "user", "file"
    entity_id: Optional[int] = Field(default=None)  # ID of the affected entity
    old_values: Optional[str] = Field(default=None, sa_type=Text)  # JSON of old values
    new_values: Optional[str] = Field(default=None, sa_type=Text)  # JSON of new values
    audit_metadata: Optional[str] = Field(default=None, sa_type=Text)  # Additional context (JSON)
    ip_address: Optional[str] = Field(default=None, max_length=45)  # Support IPv6
    user_agent: Optional[str] = Field(default=None, max_length=500)
    session_id: Optional[str] = Field(default=None, max_length=255)


class AnalysisHistory(SQLModel, table=True):
    """Enhanced tracking for analysis operations and their outcomes"""
    
    model_config = {"protected_namespaces": ()}
    
    __tablename__ = "analysis_history"  # type: ignore
    __table_args__ = (
        Index("idx_analysis_history_created_at", "created_at"),
        Index("idx_analysis_history_user", "user_id"),
        Index("idx_analysis_history_status", "status"),
        Index("idx_analysis_history_file", "file_path"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_result_id: Optional[int] = Field(default=None)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    filename: str = Field(max_length=500)
    file_path: Optional[str] = Field(default=None, max_length=1000)
    file_size: Optional[int] = Field(default=None)
    file_hash: Optional[str] = Field(default=None, max_length=64)  # SHA-256 hash for integrity
    
    # Analysis configuration
    ai_provider: str = Field(max_length=50)
    model_version: Optional[str] = Field(default=None, max_length=100)
    department_context: Optional[str] = Field(default=None, max_length=200)
    
    # Processing details
    status: str = Field(max_length=50)  # "started", "processing", "completed", "failed"
    processing_start: Optional[datetime] = Field(default=None)
    processing_end: Optional[datetime] = Field(default=None)
    processing_duration_ms: Optional[int] = Field(default=None)
    
    # Results summary
    overall_score: Optional[float] = Field(default=None)
    questions_detected: Optional[int] = Field(default=None)
    completion_rate: Optional[float] = Field(default=None)
    quality_score: Optional[float] = Field(default=None)
    
    # Error tracking
    error_message: Optional[str] = Field(default=None, sa_type=Text)
    error_type: Optional[str] = Field(default=None, max_length=100)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)


class EmailNotificationLog(SQLModel, table=True):
    """Track all email notifications sent by the system"""
    
    __tablename__ = "email_notification_log"  # type: ignore
    __table_args__ = (
        Index("idx_email_log_sent_at", "sent_at"),
        Index("idx_email_log_type", "notification_type"),
        Index("idx_email_log_status", "status"),
        Index("idx_email_log_analysis", "analysis_id"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_id: Optional[int] = Field(default=None)
    notification_type: str = Field(max_length=50)  # "incomplete_checklist", "missing_submission", "summary_report"
    
    # Recipients
    to_emails: str = Field(sa_type=Text)  # JSON array of email addresses
    cc_emails: Optional[str] = Field(default=None, sa_type=Text)  # JSON array
    bcc_emails: Optional[str] = Field(default=None, sa_type=Text)  # JSON array
    
    # Email content
    subject: str = Field(max_length=500)
    template_used: Optional[str] = Field(default=None, max_length=100)
    has_attachments: bool = Field(default=False)
    attachment_count: int = Field(default=0)
    
    # Delivery tracking
    status: str = Field(max_length=50)  # "sent", "failed", "bounced", "delivered"
    sent_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    error_message: Optional[str] = Field(default=None, sa_type=Text)
    
    # Metadata
    smtp_server: Optional[str] = Field(default=None, max_length=255)
    message_id: Optional[str] = Field(default=None, max_length=255)  # SMTP message ID
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SystemConfiguration(SQLModel, table=True):
    """Store system configuration changes and their history"""
    
    __tablename__ = "system_configuration"  # type: ignore
    __table_args__ = (
        Index("idx_system_config_key", "config_key"),
        Index("idx_system_config_created_at", "created_at"),
        Index("idx_system_config_active", "is_active"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    config_key: str = Field(max_length=255, unique=True)
    config_value: str = Field(sa_type=Text)  # JSON value
    description: Optional[str] = Field(default=None, sa_type=Text)
    
    # Change tracking
    changed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    previous_value: Optional[str] = Field(default=None, sa_type=Text)
    change_reason: Optional[str] = Field(default=None, sa_type=Text)
    
    # Status
    is_active: bool = Field(default=True)
    effective_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    effective_until: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PerformanceMetrics(SQLModel, table=True):
    """Track system performance metrics for monitoring and optimization"""
    
    __tablename__ = "performance_metrics"  # type: ignore
    __table_args__ = (
        Index("idx_performance_timestamp", "timestamp"),
        Index("idx_performance_metric_type", "metric_type"),
        Index("idx_performance_endpoint", "endpoint"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metric_type: str = Field(max_length=50)  # "api_response_time", "analysis_duration", "file_processing"
    
    # Request context
    endpoint: Optional[str] = Field(default=None, max_length=255)
    method: Optional[str] = Field(default=None, max_length=10)  # HTTP method
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    # Performance data
    duration_ms: Optional[int] = Field(default=None)
    file_size_bytes: Optional[int] = Field(default=None)
    questions_processed: Optional[int] = Field(default=None)
    
    # System metrics
    cpu_usage_percent: Optional[float] = Field(default=None)
    memory_usage_mb: Optional[float] = Field(default=None)
    
    # Results
    status_code: Optional[int] = Field(default=None)
    error_occurred: bool = Field(default=False)
    error_type: Optional[str] = Field(default=None, max_length=100)
    
    # Additional metadata
    performance_metadata: Optional[str] = Field(default=None, sa_type=Text)  # JSON for flexible data storage
