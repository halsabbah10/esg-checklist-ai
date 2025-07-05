"""
Production-grade Admin CRUD endpoints for User management.
Implements comprehensive user administration with proper validation,
security, logging, and error handling.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlmodel import Session, and_, select

from app.auth import UserRoles, hash_password, require_role
from app.database import get_session
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


# Enhanced Pydantic models for admin operations
class UserCreateAdmin(BaseModel):
    """Admin user creation model with enhanced validation."""

    username: str
    email: EmailStr
    password: str
    role: str = UserRoles.AUDITOR
    is_active: bool = True

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be between 3 and 50 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, hyphens, and underscores")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed_roles = UserRoles.all_roles()
        if v not in allowed_roles:
            raise ValueError(f"Role must be one of: {', '.join(allowed_roles)}")
        return v


class UserUpdateAdmin(BaseModel):
    """Admin user update model with optional fields."""

    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3 or len(v) > 50:
                raise ValueError("Username must be between 3 and 50 characters")
            if not v.replace("_", "").replace("-", "").isalnum():
                raise ValueError(
                    "Username can only contain letters, numbers, hyphens, and underscores"
                )
            return v.lower()
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None:
            allowed_roles = UserRoles.all_roles()
            if v not in allowed_roles:
                raise ValueError(f"Role must be one of: {', '.join(allowed_roles)}")
        return v


class UserReadAdmin(BaseModel):
    """Enhanced user read model for admin operations."""

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated user list response."""

    users: List[UserReadAdmin]
    total: int
    page: int
    per_page: int
    total_pages: int


class PasswordResetAdmin(BaseModel):
    """Admin password reset model."""

    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


# CRUD Operations
@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    List all users with pagination, search, and filtering capabilities.

    Requires admin role.
    """
    try:
        # Build base queries
        query = select(User)
        count_query = select(User)

        # Apply filters
        filters = []

        # Search filter
        if search:
            # Simple approach: get all users and filter in Python for now
            # In production, you'd want to use proper SQL LIKE operations
            pass  # Will filter after query execution

        # Role filter
        if role:
            filters.append(User.role == role)

        # Active status filter
        if is_active is not None:
            filters.append(User.is_active == is_active)

        # Apply filters to queries
        if filters:
            combined_filter = and_(*filters) if len(filters) > 1 else filters[0]
            query = query.where(combined_filter)  # type: ignore[arg-type]
            count_query = count_query.where(combined_filter)  # type: ignore[arg-type]

        # Get all users for counting and filtering
        all_users = db.exec(query).all()

        # Apply search filter in Python if provided
        if search:
            search_lower = search.lower()
            all_users = [
                u
                for u in all_users
                if search_lower in u.username.lower() or search_lower in u.email.lower()
            ]

        # Calculate pagination
        total = len(all_users)
        total_pages = (total + per_page - 1) // per_page

        # Apply pagination
        offset = (page - 1) * per_page
        users = all_users[offset : offset + per_page]

        logger.info(f"Admin {current_user.email} listed users: page={page}, total={total}")

        return UserListResponse(
            users=[UserReadAdmin.from_orm(user) for user in users],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    except Exception as e:
        logger.exception(f"Failed to list users: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users",
        )


@router.get("/{user_id}", response_model=UserReadAdmin)
async def get_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Get a specific user by ID.

    Requires admin role.
    """
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        logger.info(f"Admin {current_user.email} retrieved user {user.email}")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get user {user_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user",
        )


@router.post("/", response_model=UserReadAdmin, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Create a new user.

    Requires admin role. Validates uniqueness of username and email.
    """
    try:
        # Check if username already exists
        existing_username = db.exec(select(User).where(User.username == user_data.username)).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{user_data.username}' already exists",
            )

        # Check if email already exists
        existing_email = db.exec(select(User).where(User.email == user_data.email)).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' already exists",
            )

        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            role=user_data.role,
            is_active=user_data.is_active,
            created_at=datetime.now(timezone.utc),
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"Admin {current_user.email} created user {new_user.email}")
        return new_user

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to create user: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )


@router.put("/{user_id}", response_model=UserReadAdmin)
async def update_user(
    user_id: int,
    user_data: UserUpdateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Update an existing user.

    Requires admin role. Only updates provided fields.
    """
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Prevent admin from deactivating themselves
        if user.id == current_user.id and user_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account",
            )

        # Check for username uniqueness if updating
        if user_data.username and user_data.username != user.username:
            existing_username = db.exec(
                select(User).where(and_(User.username == user_data.username, User.id != user_id))
            ).first()
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Username '{user_data.username}' already exists",
                )

        # Check for email uniqueness if updating
        if user_data.email and user_data.email != user.email:
            existing_email = db.exec(
                select(User).where(and_(User.email == user_data.email, User.id != user_id))
            ).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{user_data.email}' already exists",
                )

        # Update only provided fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"Admin {current_user.email} updated user {user.email}")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update user {user_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user",
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Delete a user (soft delete by deactivating).

    Requires admin role. Prevents deletion of own account.
    """
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Prevent admin from deleting themselves
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )

        # Soft delete by deactivating
        user.is_active = False
        db.add(user)
        db.commit()

        logger.info(f"Admin {current_user.email} deleted user {user.email}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete user {user_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user",
        )


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_user_password(
    user_id: int,
    password_data: PasswordResetAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Reset a user's password.

    Requires admin role.
    """
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Hash new password
        user.password_hash = hash_password(password_data.new_password)
        db.add(user)
        db.commit()

        logger.info(f"Admin {current_user.email} reset password for user {user.email}")
        return {"detail": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to reset password for user {user_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password",
        )


@router.post("/{user_id}/activate", status_code=status.HTTP_200_OK)
async def activate_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Activate a deactivated user.

    Requires admin role.
    """
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        user.is_active = True
        db.add(user)
        db.commit()

        logger.info(f"Admin {current_user.email} activated user {user.email}")
        return {"detail": "User activated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to activate user {user_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user",
        )


@router.get("/stats/summary")
async def get_user_stats(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Get user statistics summary.

    Requires admin role.
    """
    try:
        total_users = len(db.exec(select(User.id)).all())
        active_users = len(db.exec(select(User.id).where(User.is_active)).all())

        # Count by role
        roles_query = select(User.role, User.id).where(User.is_active)
        roles_data = db.exec(roles_query).all()
        role_counts: dict[str, int] = {}
        for role, _ in roles_data:
            role_counts[role] = role_counts.get(role, 0) + 1

        logger.info(f"Admin {current_user.email} retrieved user statistics")

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "role_distribution": role_counts,
        }

    except Exception as e:
        logger.exception(f"Failed to get user stats: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user statistics",
        )
