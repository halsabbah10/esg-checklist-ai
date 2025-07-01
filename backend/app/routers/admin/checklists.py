"""
Production-grade Admin CRUD endpoints for Checklist management.
Implements comprehensive checklist administration with proper validation,
security, logging, and error handling.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
import logging
from datetime import datetime, timezone

from app.models import User, Checklist, ChecklistItem
from app.database import get_session
from app.auth import require_role, UserRoles
from app.schemas import (
    ChecklistItemCreateAdmin,
    ChecklistItemUpdateAdmin,
    ChecklistItemReadAdmin,
    ChecklistCreateAdmin,
    ChecklistUpdateAdmin,
    ChecklistReadAdmin,
    ChecklistListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/admin/checklists", tags=["admin-checklists"])


@router.get("/", response_model=ChecklistListResponse)
async def list_checklists(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """List all checklists with pagination and filtering."""
    try:
        # Get all checklists and filter in Python for simplicity
        all_checklists = db.exec(select(Checklist)).all()

        # Apply search filter in Python
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

        # Apply pagination manually
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        checklists = all_checklists[start_idx:end_idx]

        logger.info(
            f"Admin {current_user.email} listed checklists: page={page}, total={total}"
        )

        return ChecklistListResponse(
            checklists=[
                ChecklistReadAdmin.model_validate(checklist) for checklist in checklists
            ],
            total=total,
            page=page,
            page_size=per_page,
        )

    except Exception as e:
        logger.error(f"Failed to list checklists: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklists",
        )


@router.post("/", response_model=ChecklistReadAdmin)
async def create_checklist(
    checklist_data: ChecklistCreateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """Create a new checklist with items."""
    try:
        # Create the checklist
        new_checklist = Checklist(
            title=checklist_data.title,
            description=checklist_data.description,
            created_by=current_user.id
            if current_user.id
            else 1,  # Fallback to admin user
        )

        db.add(new_checklist)
        db.commit()
        db.refresh(new_checklist)

        # Create checklist items if provided
        if checklist_data.items and new_checklist.id:
            for item_data in checklist_data.items:
                new_item = ChecklistItem(
                    checklist_id=new_checklist.id,
                    question_text=item_data.question_text,
                    weight=item_data.weight,
                    category=item_data.category,
                    is_required=item_data.is_required
                    if item_data.is_required is not None
                    else True,
                )
                db.add(new_item)

            db.commit()

        # Fetch the complete checklist with items
        db.refresh(new_checklist)

        logger.info(f"Admin {current_user.email} created checklist: {new_checklist.id}")

        return ChecklistReadAdmin.model_validate(new_checklist)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create checklist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist",
        )


@router.get("/{checklist_id}", response_model=ChecklistReadAdmin)
async def get_checklist(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """Get a specific checklist with all its items."""
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checklist not found",
            )

        logger.info(f"Admin {current_user.email} retrieved checklist: {checklist_id}")

        return ChecklistReadAdmin.model_validate(checklist)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get checklist {checklist_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist",
        )


@router.put("/{checklist_id}", response_model=ChecklistReadAdmin)
async def update_checklist(
    checklist_id: int,
    checklist_data: ChecklistUpdateAdmin,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """Update a checklist."""
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checklist not found",
            )

        # Update fields
        if checklist_data.title is not None:
            checklist.title = checklist_data.title
        if checklist_data.description is not None:
            checklist.description = checklist_data.description

        db.add(checklist)
        db.commit()
        db.refresh(checklist)

        logger.info(f"Admin {current_user.email} updated checklist: {checklist_id}")

        return ChecklistReadAdmin.model_validate(checklist)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update checklist {checklist_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update checklist",
        )


@router.delete("/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRoles.ADMIN)),
):
    """Delete a checklist and all its items."""
    try:
        checklist = db.get(Checklist, checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checklist not found",
            )

        # Delete associated items first
        items = db.exec(
            select(ChecklistItem).where(ChecklistItem.checklist_id == checklist_id)
        ).all()

        for item in items:
            db.delete(item)

        # Delete the checklist
        db.delete(checklist)
        db.commit()

        logger.info(f"Admin {current_user.email} deleted checklist: {checklist_id}")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete checklist {checklist_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete checklist",
        )


# Checklist Items CRUD Operations
@router.get("/{checklist_id}/items", response_model=List[ChecklistItemReadAdmin])
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

        logger.info(
            f"Admin {current_user.email} listed items for checklist {checklist_id}"
        )
        return [ChecklistItemReadAdmin.from_orm(item) for item in items]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list items for checklist {checklist_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist items",
        )


@router.post(
    "/{checklist_id}/items",
    response_model=ChecklistItemReadAdmin,
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
            is_required=item_data.is_required
            if item_data.is_required is not None
            else True,
            order_index=0,  # Default order index since schema doesn't have it
            created_at=datetime.now(timezone.utc),
            created_by_user_id=current_user.id,
        )

        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        logger.info(
            f"Admin {current_user.email} created item for checklist {checklist_id}"
        )
        return ChecklistItemReadAdmin.from_orm(new_item)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create item for checklist {checklist_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist item",
        )


@router.put("/items/{item_id}", response_model=ChecklistItemReadAdmin)
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
        return ChecklistItemReadAdmin.from_orm(item)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update checklist item {item_id}: {str(e)}")
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
        logger.error(f"Failed to delete checklist item {item_id}: {str(e)}")
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
        active_checklists = len(
            db.exec(select(Checklist.id).where(Checklist.is_active)).all()
        )
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
        logger.error(f"Failed to get checklist stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve checklist statistics",
        )
