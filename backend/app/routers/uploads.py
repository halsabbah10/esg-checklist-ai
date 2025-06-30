from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from app.models import FileUpload
from app.database import get_session
from app.auth import require_role
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.get("/search")
def search_uploads(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    checklist_id: Optional[int] = Query(None, description="Filter by checklist ID"),
    status: Optional[str] = Query(None, description="Filter by status (pending/approved/rejected)"),
    filename: Optional[str] = Query(None, description="Filter by part of filename (case-insensitive)"),
    uploaded_from: Optional[datetime] = Query(None, description="Filter by uploaded_at >= this datetime (ISO format)"),
    uploaded_to: Optional[datetime] = Query(None, description="Filter by uploaded_at <= this datetime (ISO format)"),
    offset: int = Query(0, ge=0, description="Result offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),  # or reviewer role
):
    """
    Search file uploads with various filters.
    
    Args:
        user_id: Filter by user ID
        checklist_id: Filter by checklist ID
        status: Filter by status (pending/approved/rejected)
        filename: Filter by part of filename (case-insensitive)
        uploaded_from: Filter by uploaded_at >= this datetime
        uploaded_to: Filter by uploaded_at <= this datetime
        offset: Result offset for pagination
        limit: Max records per page
        db: Database session
        current_user: Current authenticated user (admin required)
        
    Returns:
        Dictionary with total count and paginated results
    """
    # Build query using SQLModel syntax
    query = select(FileUpload)

    if user_id is not None:
        query = query.where(FileUpload.user_id == user_id)
    if checklist_id is not None:
        query = query.where(FileUpload.checklist_id == checklist_id)
    if status is not None:
        if status.lower() not in ("pending", "approved", "rejected"):
            raise HTTPException(status_code=400, detail="Invalid status (must be pending/approved/rejected)")
        query = query.where(FileUpload.status == status.lower())
    if filename is not None:
        # We'll filter by filename in Python since SQLModel doesn't have direct ilike support
        pass  # Will be handled after query execution
    if uploaded_from is not None:
        query = query.where(FileUpload.uploaded_at >= uploaded_from)
    if uploaded_to is not None:
        query = query.where(FileUpload.uploaded_at <= uploaded_to)

    # Get total count and records
    all_records = db.exec(query).all()
    
    # Apply case-insensitive filename filter in Python if needed
    if filename is not None:
        all_records = [f for f in all_records if filename.lower() in f.filename.lower()]
    
    total = len(all_records)
    
    # Sort by uploaded_at descending (newest first)
    all_records = sorted(all_records, key=lambda x: x.uploaded_at, reverse=True)
    
    # Apply pagination
    records = all_records[offset:offset + limit]

    return {
        "total": total,
        "results": [
            {
                "id": f.id,
                "user_id": f.user_id,
                "checklist_id": f.checklist_id,
                "filename": f.filename,
                "status": f.status,
                "uploaded_at": f.uploaded_at
            }
            for f in records
        ]
    }
