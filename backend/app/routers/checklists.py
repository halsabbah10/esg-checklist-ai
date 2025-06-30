from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from ..models import Checklist, ChecklistItem, FileUpload
from ..schemas import ChecklistCreate, ChecklistRead, ChecklistItemRead
from ..database import get_session
import os
from datetime import datetime
from ..auth import require_role
from app.utils.ai import ai_score_text_with_gemini
from app.utils.email import send_ai_score_notification
from app.utils.notifications import notify_user
from ..models import AIResult
import pdfplumber
from docx import Document
import openpyxl
import csv
from fastapi.responses import StreamingResponse
import pandas as pd
from io import StringIO, BytesIO
from fpdf import FPDF
import logging

logger = logging.getLogger(__name__)

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

# Security constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "csv", "txt"}


def validate_file_security(file: UploadFile) -> None:
    """Validate file security constraints"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a filename"
        )

    # Check file extension
    ext = file.filename.lower().split(".")[-1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type .{ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Check file size (Note: file.size might not be available in all cases)
    if hasattr(file, "size") and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
        )


@router.post("/{checklist_id}/upload")
def upload_file(
    checklist_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    # Validate file security first
    validate_file_security(file)

    # Validate checklist exists
    checklist = db.exec(select(Checklist).where(Checklist.id == checklist_id)).first()
    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checklist with ID {checklist_id} not found",
        )

    # Validate file security
    validate_file_security(file)

    # Save file
    filename = f"{current_user.id}_{checklist_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # Store record in DB (filename is guaranteed to exist after validation)
    file_record = FileUpload(
        checklist_id=checklist_id,
        user_id=current_user.id,
        filename=file.filename
        or "unknown",  # Fallback, though validation ensures this won't be None
        filepath=file_path,
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    # Ensure the file record has an ID after database insertion
    if file_record.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create file record",
        )

    # Extract text based on file extension
    ext = (file.filename or "").lower().split(".")[-1]
    raw_text = ""
    try:
        if ext == "pdf":
            with pdfplumber.open(file_path) as pdf:
                raw_text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        elif ext == "docx":
            doc = Document(file_path)
            raw_text = "\n".join([p.text for p in doc.paragraphs])
        elif ext == "xlsx":
            wb = openpyxl.load_workbook(file_path)
            text = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    text.append(" ".join([str(cell) if cell else "" for cell in row]))
            raw_text = "\n".join(text)
        elif ext == "csv":
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                raw_text = "\n".join([", ".join(row) for row in reader])
        else:
            # Fallback: treat as text file
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
    except Exception as e:
        raw_text = f"Error extracting text: {e}"

    # AI/NLP scoring using Gemini
    score, feedback = ai_score_text_with_gemini(raw_text)

    # Truncate text if too long for database (TEXT can hold ~65k chars)
    max_text_length = 65000
    if len(raw_text) > max_text_length:
        raw_text = raw_text[:max_text_length] + "...[truncated]"

    if len(feedback) > max_text_length:
        feedback = feedback[:max_text_length] + "...[truncated]"

    # Store AI result in DB
    ai_result = AIResult(
        file_upload_id=file_record.id,  # Now guaranteed to be int
        checklist_id=checklist_id,
        user_id=current_user.id,
        raw_text=raw_text,
        score=score,
        feedback=feedback,
    )
    db.add(ai_result)
    db.commit()
    db.refresh(ai_result)

    # Send email notification asynchronously (best effort)
    try:
        send_ai_score_notification(
            user_email=current_user.email,
            filename=file.filename or "unknown",
            score=score,
            feedback=feedback,
            checklist_title=checklist.title,
        )
    except Exception as e:
        # Log error but don't fail the upload
        logger.error(f"Failed to send email notification: {e}")

    # Send in-app notification for successful upload
    try:
        notify_user(
            db=db,
            user_id=current_user.id,
            title="File Upload Successful ✅",
            message=f"Your file '{file.filename}' has been uploaded and analyzed. AI Score: {score:.1f}/100",
            link=f"/uploads/{file_record.id}",
            notification_type="success",
        )
    except Exception as e:
        # Log error but don't fail the upload
        logger.error(f"Failed to send upload notification: {e}")

    return {
        "detail": "File uploaded and AI scored",
        "file_id": file_record.id,
        "filename": file.filename,
        "ai_score": score,
        "ai_feedback": feedback,
        "email_sent": True,  # Could be enhanced to track actual status
    }


@router.get("/{checklist_id}/export", tags=["checklists"])
def export_checklist_results(
    checklist_id: int,
    format: str = "csv",
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    # Query all uploads & AI results for this checklist
    results = db.exec(
        select(FileUpload, AIResult)
        .where(FileUpload.checklist_id == checklist_id)
        .where(FileUpload.id == AIResult.file_upload_id)
    ).all()

    # Prepare data
    data = []
    for upload, ai in results:
        data.append(
            {
                "file_id": upload.id,
                "filename": upload.filename,
                "user_id": upload.user_id,
                "ai_score": ai.score,
                "ai_feedback": ai.feedback,
                "uploaded_at": upload.uploaded_at,
            }
        )

    df = pd.DataFrame(data)

    # Ensure exports folder exists
    os.makedirs("exports", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_filename = f"exports/checklist_{checklist_id}_results_{timestamp}.{format}"

    # Export as CSV
    if format == "csv":
        df.to_csv(export_filename, index=False)
        buf = StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=checklist_{checklist_id}_results.csv"
            },
        )

    # Export as Excel
    elif format == "excel":
        df.to_excel(export_filename, index=False)
        buf = BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=checklist_{checklist_id}_results.xlsx"
            },
        )

    # Export as Word
    elif format == "word":
        doc = Document()
        doc.add_heading(f"Checklist {checklist_id} Results", 0)
        table = doc.add_table(rows=1, cols=len(df.columns))
        hdr_cells = table.rows[0].cells
        for idx, column in enumerate(df.columns):
            hdr_cells[idx].text = column
        for row in df.itertuples(index=False):
            row_cells = table.add_row().cells
            for idx, value in enumerate(row):
                row_cells[idx].text = str(value)
        doc.save(export_filename)
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename=checklist_{checklist_id}_results.docx"
            },
        )

    # Export as PDF
    elif format == "pdf":
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 10, f"Checklist {checklist_id} Results", ln=True)
        # Table header
        for col in df.columns:
            pdf.cell(40, 10, col, border=1)
        pdf.ln()
        # Table rows
        for row in df.itertuples(index=False):
            for value in row:
                # Only print first 30 chars to keep things neat
                cell = str(value)[:30] if value is not None else ""
                pdf.cell(40, 10, cell, border=1)
            pdf.ln()
        pdf.output(export_filename)
        # Serve file
        with open(export_filename, "rb") as f:
            pdf_bytes = f.read()
        buf = BytesIO(pdf_bytes)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=checklist_{checklist_id}_results.pdf"
            },
        )

    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
