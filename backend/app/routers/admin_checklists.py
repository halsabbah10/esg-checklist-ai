"""
Production-grade Admin CRUD endpoints for Checklist management.
Implements comprehensive checklist administration with proper validation,
security, logging, and error handling.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlmodel import Session, and_, select

from app.auth import UserRoles, require_role
from app.database import get_session
from app.models import Checklist, ChecklistItem, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/checklists", tags=["admin-checklists"])

# Constants for validation
MAX_QUESTION_TEXT_LENGTH = 1000
MAX_TITLE_LENGTH = 255
MAX_DESCRIPTION_LENGTH = 5000
MAX_CATEGORY_LENGTH = 100
MAX_WEIGHT_VALUE = 10
MIN_WEIGHT_VALUE = 0


# Enhanced Pydantic models for admin operations
class ChecklistItemCreateAdmin(BaseModel):
    """Admin checklist item creation model with enhanced validation."""

    question_text: str
    weight: Optional[float] = 1.0
    category: Optional[str] = None
    is_required: bool = True
    order_index: int = 0

    @field_validator("question_text")
    @classmethod
    def validate_question_text(cls, v):
        if not v or not v.strip():
            raise ValueError("Question text cannot be empty")
        if len(v) > MAX_QUESTION_TEXT_LENGTH:
            raise ValueError(f"Question text cannot exceed {MAX_QUESTION_TEXT_LENGTH} characters")
        return v.strip()

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v):
        if v is not None and (v < MIN_WEIGHT_VALUE or v > MAX_WEIGHT_VALUE):
            raise ValueError(f"Weight must be between {MIN_WEIGHT_VALUE} and {MAX_WEIGHT_VALUE}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v is not None and len(v) > MAX_CATEGORY_LENGTH:
            raise ValueError(f"Category cannot exceed {MAX_CATEGORY_LENGTH} characters")
        return v


class ChecklistItemUpdateAdmin(BaseModel):
    """Admin checklist item update model with enhanced validation."""

    question_text: Optional[str] = None
    weight: Optional[float] = None
    category: Optional[str] = None
    is_required: Optional[bool] = None
    order_index: Optional[int] = None

    @field_validator("question_text")
    @classmethod
    def validate_question_text(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Question text cannot be empty")
            if len(v) > MAX_QUESTION_TEXT_LENGTH:
                raise ValueError(
                    f"Question text cannot exceed {MAX_QUESTION_TEXT_LENGTH} characters"
                )
            return v.strip()
        return v

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v):
        if v is not None and (v < MIN_WEIGHT_VALUE or v > MAX_WEIGHT_VALUE):
            raise ValueError(f"Weight must be between {MIN_WEIGHT_VALUE} and {MAX_WEIGHT_VALUE}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v is not None and len(v) > MAX_CATEGORY_LENGTH:
            raise ValueError(f"Category cannot exceed {MAX_CATEGORY_LENGTH} characters")
        return v


# Response models
class ChecklistItemResponse(BaseModel):
    """Checklist item response model."""

    id: int
    question_text: str
    weight: float
    category: Optional[str]
    is_required: bool
    order_index: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ChecklistResponseAdmin(BaseModel):
    """Admin checklist response model with item count."""

    id: int
    title: str
    description: Optional[str]
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    items_count: Optional[int] = None
    items: Optional[List[ChecklistItemResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class ChecklistCreateAdmin(BaseModel):
    """Admin checklist creation model with enhanced validation."""

    title: str
    description: Optional[str] = None
    is_active: bool = True

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        if len(v) > MAX_TITLE_LENGTH:
            raise ValueError(f"Title cannot exceed {MAX_TITLE_LENGTH} characters")
        return v.strip()

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if v is not None and len(v) > MAX_DESCRIPTION_LENGTH:
            raise ValueError(f"Description cannot exceed {MAX_DESCRIPTION_LENGTH} characters")
        return v


class ChecklistUpdateAdmin(BaseModel):
    """Admin checklist update model with enhanced validation."""

    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Title cannot be empty")
            if len(v) > MAX_TITLE_LENGTH:
                raise ValueError(f"Title cannot exceed {MAX_TITLE_LENGTH} characters")
            return v.strip()
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if v is not None and len(v) > MAX_DESCRIPTION_LENGTH:
            raise ValueError(f"Description cannot exceed {MAX_DESCRIPTION_LENGTH} characters")
        return v


# Pagination response models
class ChecklistListResponse(BaseModel):
    """Response model for checklist listing with pagination."""

    checklists: List[ChecklistResponseAdmin]
    total_count: int
    page: int
    per_page: int
    total_pages: int


# Checklist CRUD Operations
@router.get("/", response_model=ChecklistListResponse)
async def list_checklists(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    created_by: Optional[int] = Query(None, description="Filter by creator user ID"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    List all checklists with pagination, search, and filtering capabilities.

    Requires admin role.
    """
    try:
        # Build base query
        query = select(Checklist)

        # Apply filters
        filters = []

        # Active status filter
        if is_active is not None:
            filters.append(Checklist.is_active == is_active)

        # Creator filter
        if created_by is not None:
            filters.append(Checklist.created_by == created_by)

        # Apply filters to query
        if filters:
            combined_filter = and_(*filters) if len(filters) > 1 else filters[0]
            query = query.where(combined_filter)  # type: ignore[arg-type]

        # Get all checklists for search and pagination
        all_checklists = db.exec(query).all()

        # Apply search filter in Python if provided
        if search:
            search_lower = search.lower()
            all_checklists = [
                c
                for c in all_checklists
                if search_lower in c.title.lower()
                or (c.description and search_lower in c.description.lower())
            ]

        # Calculate pagination
        total = len(all_checklists)
        total_pages = (total + per_page - 1) // per_page

        # Apply pagination
        offset = (page - 1) * per_page
        checklists = all_checklists[offset : offset + per_page]

        # Add items count for each checklist
        enhanced_checklists = []
        for checklist in checklists:
            items_count = len(
                db.exec(
                    select(ChecklistItem.id).where(ChecklistItem.checklist_id == checklist.id)
                ).all()
            )

            checklist_dict = (
                checklist.dict()
                if hasattr(checklist, "dict")
                else {
                    "id": checklist.id,
                    "title": checklist.title,
                    "description": checklist.description,
                    "created_by": checklist.created_by,
                    "is_active": checklist.is_active,
                    "version": checklist.version,
                    "created_at": checklist.created_at,
                    "updated_at": checklist.updated_at,
                    "items_count": items_count,
                }
            )
            checklist_dict["items_count"] = items_count
            enhanced_checklists.append(ChecklistResponseAdmin(**checklist_dict))

        logger.info(f"Admin {current_user.email} listed checklists: page={page}, total={total}")

        return ChecklistListResponse(
            checklists=enhanced_checklists,
            total_count=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    except Exception as e:
        logger.exception(f"Failed to list checklists: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklists",
        )


@router.get("/{checklist_id}", response_model=ChecklistResponseAdmin)
async def get_checklist(
    checklist_id: int,
    include_items: bool = Query(False, description="Include checklist items"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Get a specific checklist by ID.

    Requires admin role.
    """
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist with ID {checklist_id} not found",
            )

        # Get items count
        items_count = len(
            db.exec(
                select(ChecklistItem.id).where(ChecklistItem.checklist_id == checklist_id)
            ).all()
        )

        # Prepare response data
        response_data = {
            "id": checklist.id,
            "title": checklist.title,
            "description": checklist.description,
            "is_active": checklist.is_active,
            "created_by": checklist.created_by,
            "created_at": checklist.created_at,
            "updated_at": checklist.updated_at,
            "items_count": items_count,
        }

        # Include items if requested
        if include_items:
            items = db.exec(
                select(ChecklistItem)
                .where(ChecklistItem.checklist_id == checklist_id)
                .order_by("order_index")
            ).all()
            items_list = [ChecklistItemResponse.from_orm(item) for item in items]

            # Create response with proper typing
            return ChecklistResponseAdmin(
                id=checklist.id or 0,  # Handle optional ID
                title=checklist.title,
                description=checklist.description,
                is_active=checklist.is_active,
                created_by=checklist.created_by,
                created_at=checklist.created_at,
                updated_at=checklist.updated_at,
                items_count=items_count,
                items=items_list,
            )

        logger.info(f"Admin {current_user.email} retrieved checklist {checklist.title}")
        return ChecklistResponseAdmin(**response_data)  # type: ignore[arg-type]

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get checklist {checklist_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist",
        )


@router.post("/", response_model=ChecklistResponseAdmin, status_code=status.HTTP_201_CREATED)
async def create_checklist(
    checklist_data: ChecklistCreateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Create a new checklist with optional items.

    Requires admin role.
    """
    try:
        # Check if title already exists
        existing_checklist = db.exec(
            select(Checklist).where(Checklist.title == checklist_data.title)
        ).first()
        if existing_checklist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Checklist with title '{checklist_data.title}' already exists",
            )

        # Create new checklist
        new_checklist = Checklist(
            title=checklist_data.title,
            description=checklist_data.description,
            created_by=current_user.id or 0,  # Handle None case
            is_active=checklist_data.is_active,
            created_at=datetime.now(timezone.utc),
        )

        db.add(new_checklist)
        db.commit()
        db.refresh(new_checklist)

        # Get items count (no items are created during checklist creation)
        items_count = 0

        logger.info(f"Admin {current_user.email} created checklist {new_checklist.title}")
        return ChecklistResponseAdmin(
            id=new_checklist.id or 0,  # Handle None case
            title=new_checklist.title,
            description=new_checklist.description,
            created_by=new_checklist.created_by,
            is_active=new_checklist.is_active,
            created_at=new_checklist.created_at,
            updated_at=new_checklist.updated_at,
            items_count=items_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to create checklist: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist",
        )


@router.put("/{checklist_id}", response_model=ChecklistResponseAdmin)
async def update_checklist(
    checklist_id: int,
    checklist_data: ChecklistUpdateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Update an existing checklist.

    Requires admin role. Only updates provided fields.
    """
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist with ID {checklist_id} not found",
            )

        # Check for title uniqueness if updating
        if checklist_data.title and checklist_data.title != checklist.title:
            existing_checklist = db.exec(
                select(Checklist).where(
                    and_(
                        Checklist.title == checklist_data.title,
                        Checklist.id != checklist_id,
                    )
                )
            ).first()
            if existing_checklist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Checklist with title '{checklist_data.title}' already exists",
                )

        # Update only provided fields
        update_data = checklist_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(checklist, field, value)

        checklist.updated_at = datetime.now(timezone.utc)

        db.add(checklist)
        db.commit()
        db.refresh(checklist)

        # Get items count
        items_count = len(
            db.exec(
                select(ChecklistItem.id).where(ChecklistItem.checklist_id == checklist_id)
            ).all()
        )

        logger.info(f"Admin {current_user.email} updated checklist {checklist.title}")
        return ChecklistResponseAdmin(
            id=checklist.id or 0,  # Handle None case
            title=checklist.title,
            description=checklist.description,
            created_by=checklist.created_by,
            is_active=checklist.is_active,
            created_at=checklist.created_at,
            updated_at=checklist.updated_at,
            items_count=items_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update checklist {checklist_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update checklist",
        )


@router.delete("/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist(
    checklist_id: int,
    force_delete: bool = Query(False, description="Force delete even with associated items"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Delete a checklist (soft delete by deactivating).

    Requires admin role. Can force delete with associated items.
    """
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist with ID {checklist_id} not found",
            )

        # Check for associated items
        items = db.exec(
            select(ChecklistItem).where(ChecklistItem.checklist_id == checklist_id)
        ).all()

        if items and not force_delete:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Checklist has {len(items)} associated items. "
                    "Use force_delete=true to delete anyway."
                ),
            )

        if force_delete and items:
            # Delete all associated items first
            for item in items:
                db.delete(item)

        # Soft delete by deactivating
        checklist.is_active = False
        checklist.updated_at = datetime.now(timezone.utc)
        db.add(checklist)
        db.commit()

        logger.info(f"Admin {current_user.email} deleted checklist {checklist.title}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete checklist {checklist_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete checklist",
        )


# Checklist Items CRUD Operations
@router.get("/{checklist_id}/items", response_model=List[ChecklistItemResponse])
async def list_checklist_items(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    List all items for a specific checklist.

    Requires admin role.
    """
    try:
        # Verify checklist exists
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist with ID {checklist_id} not found",
            )

        # Get items ordered by order_index
        items = db.exec(
            select(ChecklistItem).where(ChecklistItem.checklist_id == checklist_id)
        ).all()

        # Sort by order_index in Python
        items = sorted(items, key=lambda x: x.order_index)

        logger.info(f"Admin {current_user.email} listed items for checklist {checklist_id}")
        return [ChecklistItemResponse.from_orm(item) for item in items]

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to list items for checklist {checklist_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist items",
        )


@router.post(
    "/{checklist_id}/items",
    response_model=ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checklist_item(
    checklist_id: int,
    item_data: ChecklistItemCreateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Create a new item for a checklist.

    Requires admin role.
    """
    try:
        # Verify checklist exists
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist with ID {checklist_id} not found",
            )

        # Create new item
        new_item = ChecklistItem(
            checklist_id=checklist_id,
            question_text=item_data.question_text,
            weight=item_data.weight,
            category=item_data.category,
            is_required=item_data.is_required,
            order_index=item_data.order_index,
            created_at=datetime.now(timezone.utc),
            created_by_user_id=current_user.id,
        )

        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        logger.info(f"Admin {current_user.email} created item for checklist {checklist_id}")
        return ChecklistItemResponse.from_orm(new_item)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to create item for checklist {checklist_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist item",
        )


@router.put("/items/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: int,
    item_data: ChecklistItemUpdateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Update an existing checklist item.

    Requires admin role.
    """
    try:
        item = db.get(ChecklistItem, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist item with ID {item_id} not found",
            )

        # Update only provided fields
        update_data = item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)

        item.updated_at = datetime.now(timezone.utc)

        db.add(item)
        db.commit()
        db.refresh(item)

        logger.info(f"Admin {current_user.email} updated checklist item {item_id}")
        return ChecklistItemResponse.from_orm(item)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update checklist item {item_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update checklist item",
        )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Delete a checklist item.

    Requires admin role.
    """
    try:
        item = db.get(ChecklistItem, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Checklist item with ID {item_id} not found",
            )

        db.delete(item)
        db.commit()

        logger.info(f"Admin {current_user.email} deleted checklist item {item_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete checklist item {item_id}: {e!s}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete checklist item",
        )


@router.get("/stats/summary")
async def get_checklist_stats(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """
    Get checklist statistics summary.

    Requires admin role.
    """
    try:
        total_checklists = len(db.exec(select(Checklist.id)).all())
        active_checklists = len(db.exec(select(Checklist.id).where(Checklist.is_active)).all())
        total_items = len(db.exec(select(ChecklistItem.id)).all())

        # Average items per checklist
        avg_items = total_items / total_checklists if total_checklists > 0 else 0

        logger.info(f"Admin {current_user.email} retrieved checklist statistics")

        return {
            "total_checklists": total_checklists,
            "active_checklists": active_checklists,
            "inactive_checklists": total_checklists - active_checklists,
            "total_items": total_items,
            "average_items_per_checklist": round(avg_items, 2),
        }

    except Exception as e:
        logger.exception(f"Failed to get checklist stats: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist statistics",
        )
