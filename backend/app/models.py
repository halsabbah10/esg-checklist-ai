from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Text, Index
from datetime import datetime, timezone
import uuid


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
    id: Optional[int] = Field(default=None, primary_key=True)
    file_upload_id: int = Field(foreign_key="fileupload.id")
    user_id: int = Field(foreign_key="user.id")
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # file_upload: Optional["FileUpload"] = Relationship(back_populates="comments")


class FileUpload(BaseModel, table=True):
    __tablename__ = "fileupload"  # type: ignore
    __table_args__ = (
        Index("idx_fileupload_checklist", "checklist_id"),
        Index("idx_fileupload_user", "user_id"),
        Index("idx_fileupload_uploaded_at", "uploaded_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    filename: str = Field(max_length=255)
    filepath: str = Field(max_length=500)
    file_size: Optional[int] = Field(default=None)
    file_type: Optional[str] = Field(default=None, max_length=50)
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processing_status: str = Field(
        default="pending", max_length=20
    )  # pending, processed, failed

    # Relationships
    # user: Optional[User] = Relationship(back_populates="file_uploads")
    # checklist: Optional[Checklist] = Relationship(back_populates="file_uploads")
    # ai_results: List["AIResult"] = Relationship(back_populates="file_upload")

    status: str = Field(default="pending")  # "pending", "approved", "rejected"
    # comments: List["Comment"] = Relationship(back_populates="file_upload")


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
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    raw_text: str = Field(sa_type=Text)
    score: float = Field(ge=0.0, le=1.0)  # Validation: score must be between 0 and 1
    feedback: str = Field(sa_type=Text)
    processing_time_ms: Optional[int] = Field(default=None)
    ai_model_version: str = Field(default="gemini-1.5-flash", max_length=50)
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
    action: str = Field(
        max_length=100
    )  # e.g., "file_upload", "checklist_create", "login"
    resource_type: Optional[str] = Field(
        max_length=50
    )  # e.g., "checklist", "file", "user"
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
