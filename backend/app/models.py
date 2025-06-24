from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, timezone


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    password_hash: str
    role: str  # e.g., "admin", "auditor", "reviewer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Checklist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str]
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    items: List["ChecklistItem"] = Relationship(back_populates="checklist")


class ChecklistItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    question_text: str
    weight: Optional[float]
    category: Optional[str]
    checklist: Optional[Checklist] = Relationship(back_populates="items")


class Submission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"


class FileUpload(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    filename: str
    filepath: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_upload_id: int = Field(foreign_key="fileupload.id")
    checklist_id: int = Field(foreign_key="checklist.id")
    user_id: int = Field(foreign_key="user.id")
    raw_text: str
    score: float
    feedback: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
