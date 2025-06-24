from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    password_hash: str
    role: str  # e.g., "admin", "auditor", "reviewer"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Checklist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str]
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"
