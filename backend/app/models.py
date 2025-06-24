from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    password_hash: str
    role: str  # e.g., "admin", "auditor", "reviewer"
    created_at: datetime = Field(default_factory=datetime.utcnow)
