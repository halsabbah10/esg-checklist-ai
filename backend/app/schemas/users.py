"""User-related schemas."""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime


class UserLogin(BaseModel):
    """User login request schema."""

    email: EmailStr
    password: str


class UserCreate(BaseModel):
    """User creation request schema."""

    username: str = Field(
        ..., min_length=3, max_length=50, description="Username must be 3-50 characters"
    )
    email: EmailStr
    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters"
    )
    role: str = Field(
        default="auditor", description="Role must be admin, auditor, or reviewer"
    )

    @validator("password")
    def validate_password_strength(cls, v):
        """Validate password meets minimum strength requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

    @validator("role")
    def validate_role(cls, v):
        """Validate role is one of the allowed values."""
        allowed_roles = {"admin", "auditor", "reviewer"}
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class UserRead(BaseModel):
    """User response schema."""

    id: int
    username: str
    email: EmailStr
    role: str
    created_at: Optional[datetime] = None
    is_active: Optional[bool] = True

    class Config:
        """Pydantic configuration."""

        from_attributes = True  # Allows creation from ORM objects
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


class UserUpdate(BaseModel):
    """User update request schema."""

    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserCreateAdmin(BaseModel):
    """Admin user creation schema with additional fields."""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str
    is_active: bool = True
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

    @validator("phone")
    def validate_phone(cls, v):
        """Validate phone number format."""
        if v is not None:
            import re

            if not re.match(r"^\+?[\d\s\-\(\)]+$", v):
                raise ValueError("Invalid phone number format")
        return v

    @validator("password")
    def validate_password_strength(cls, v):
        """Validate password meets minimum strength requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

    @validator("role")
    def validate_role(cls, v):
        """Validate role is one of the allowed values."""
        allowed_roles = {"admin", "auditor", "reviewer"}
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


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

    class Config:
        """Pydantic configuration."""

        from_attributes = True  # Allows creation from ORM objects
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


class UserListResponse(BaseModel):
    """Response schema for user list with pagination."""

    users: List[UserReadAdmin]
    total: int
    page: int
    page_size: int


class PasswordResetAdmin(BaseModel):
    """Admin password reset schema."""

    new_password: str = Field(
        ..., min_length=8, description="New password must be at least 8 characters"
    )

    @validator("new_password")
    def validate_password_strength(cls, v):
        """Validate password meets minimum strength requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class PasswordChange(BaseModel):
    """Password change request schema."""

    current_password: str
    new_password: str = Field(
        ..., min_length=8, description="New password must be at least 8 characters"
    )
    confirm_password: str

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        """Validate that new_password and confirm_password match."""
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Password confirmation does not match new password")
        return v

    @validator("new_password")
    def validate_password_strength(cls, v):
        """Validate password meets minimum strength requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
