"""User-related schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserLogin(BaseModel):
    """User login request schema."""
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    """User creation request schema."""
    username: str
    email: EmailStr
    password: str
    role: str = "auditor"  # default; can adjust


class UserRead(BaseModel):
    """User response schema."""
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: Optional[datetime] = None
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    """User update request schema."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserCreateAdmin(BaseModel):
    """Admin user creation schema with additional fields."""
    username: str
    email: EmailStr
    password: str
    role: str
    is_active: bool = True
    department: Optional[str] = None
    phone: Optional[str] = None


class UserUpdateAdmin(BaseModel):
    """Admin user update schema with additional fields."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class UserReadAdmin(BaseModel):
    """Admin user response schema with additional fields."""
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class UserListResponse(BaseModel):
    """Response schema for user list with pagination."""
    users: List[UserReadAdmin]
    total: int
    page: int
    page_size: int


class PasswordResetAdmin(BaseModel):
    """Admin password reset schema."""
    new_password: str
