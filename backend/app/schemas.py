from typing import List, Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "auditor"  # default; can adjust


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ChecklistItemCreate(BaseModel):
    question_text: str
    weight: Optional[float] = None
    category: Optional[str] = None


class ChecklistItemRead(BaseModel):
    id: int
    question_text: str
    weight: Optional[float]
    category: Optional[str]


class ChecklistCreate(BaseModel):
    title: str
    description: Optional[str] = None
    items: List[ChecklistItemCreate]


class ChecklistRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    items: List[ChecklistItemRead] = []
