"""Admin checklist management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import Optional
import logging

from app.models import User, Checklist, ChecklistItem
from app.database import get_session
from app.auth import require_role, UserRoles
from app.schemas import (
    ChecklistCreateAdmin,
    ChecklistUpdateAdmin,
    ChecklistReadAdmin,
    ChecklistListResponse,
    MessageResponse,
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
                c for c in all_checklists
                if search_lower in c.title.lower() or 
                   (c.description and search_lower in c.description.lower())
            ]

        # Calculate pagination
        total = len(all_checklists)

        # Apply pagination manually
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        checklists = all_checklists[start_idx:end_idx]

        logger.info(f"Admin {current_user.email} listed checklists: page={page}, total={total}")

        return ChecklistListResponse(
            checklists=[ChecklistReadAdmin.model_validate(checklist) for checklist in checklists],
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
            created_by=current_user.id if current_user.id else 1,  # Fallback to admin user
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
                    is_required=item_data.is_required if item_data.is_required is not None else True,
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


@router.delete("/{checklist_id}")
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

        return MessageResponse(message="Checklist deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete checklist {checklist_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete checklist",
        )