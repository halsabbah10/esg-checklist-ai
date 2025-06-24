from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from ..models import Checklist, ChecklistItem, FileUpload
from ..schemas import ChecklistCreate, ChecklistRead, ChecklistItemRead
from ..database import get_session
import os
from ..auth import require_role

router = APIRouter(prefix="/checklists", tags=["checklists"])


@router.post("/", response_model=ChecklistRead)
def create_checklist(
    checklist: ChecklistCreate,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    new_checklist = Checklist(
        title=checklist.title,
        description=checklist.description,
        created_by=current_user.id,
    )
    db.add(new_checklist)
    db.commit()
    db.refresh(new_checklist)

    # Ensure the checklist has an ID after database insertion
    if new_checklist.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist",
        )

    # Add items
    for item in checklist.items:
        new_item = ChecklistItem(
            checklist_id=new_checklist.id,  # Now guaranteed to be int
            question_text=item.question_text,
            weight=item.weight,
            category=item.category,
        )
        db.add(new_item)
    db.commit()
    return new_checklist


@router.get("/", response_model=list[ChecklistRead])
def list_checklists(
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),  # All roles can view
):
    return db.exec(select(Checklist)).all()


@router.get("/{checklist_id}/items", response_model=list[ChecklistItemRead])
def get_checklist_items(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    items = db.exec(
        select(ChecklistItem).where(ChecklistItem.checklist_id == checklist_id)
    ).all()
    return items


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{checklist_id}/upload")
def upload_file(
    checklist_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    # Validate file has a filename
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a filename"
        )

    # Save file
    filename = f"{current_user.id}_{checklist_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # Store record in DB
    file_record = FileUpload(
        checklist_id=checklist_id,
        user_id=current_user.id,
        filename=file.filename,  # Now guaranteed to be str
        filepath=file_path,
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    return {
        "detail": "File uploaded",
        "file_id": file_record.id,
        "filename": file.filename,
    }
