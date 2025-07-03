from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from fastapi.responses import StreamingResponse
from app.models import Checklist, FileUpload, AIResult, User, SubmissionAnswer
from app.database import get_session
from app.auth import require_role
import pandas as pd
from io import StringIO, BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


@router.get("/checklists")
def export_all_checklists(
    format: str = Query("csv", regex="^(csv|excel|json)$"),
    include_inactive: bool = Query(False, description="Include inactive checklists"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export all checklists in various formats"""
    try:
        # Build query
        query = select(Checklist)
        if not include_inactive:
            query = query.where(Checklist.is_active == True)
            
        checklists = db.exec(query).all()
        
        # Prepare data
        data = []
        for checklist in checklists:
            data.append({
                "id": checklist.id,
                "title": checklist.title,
                "description": checklist.description,
                "created_by": checklist.created_by,
                "created_at": checklist.created_at,
                "updated_at": getattr(checklist, 'updated_at', None),  # Safe access in case field doesn't exist
                "is_active": checklist.is_active,
                "version": checklist.version
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            buf = StringIO()
            df.to_csv(buf, index=False)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=checklists_{timestamp}.csv"}
            )
        elif format == "excel":
            buf = BytesIO()
            df.to_excel(buf, index=False, engine="openpyxl")
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=checklists_{timestamp}.xlsx"}
            )
        elif format == "json":
            buf = StringIO()
            df.to_json(buf, orient="records", indent=2)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=checklists_{timestamp}.json"}
            )
            
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/ai-results")
def export_ai_results(
    format: str = Query("csv", regex="^(csv|excel|json)$"),
    checklist_id: int = Query(None, description="Filter by checklist ID"),
    min_score: float = Query(None, ge=0.0, le=1.0, description="Minimum AI score"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export AI scoring results with filtering options"""
    try:
        # Build query with joins
        query = select(AIResult, FileUpload, Checklist, User).join(
            FileUpload, AIResult.file_upload_id == FileUpload.id
        ).join(
            Checklist, AIResult.checklist_id == Checklist.id
        ).join(
            User, AIResult.user_id == User.id
        )
        
        # Apply filters
        if checklist_id:
            query = query.where(AIResult.checklist_id == checklist_id)
        if min_score is not None:
            query = query.where(AIResult.score >= min_score)
        
        # Date filter
        cutoff_date = datetime.now() - pd.Timedelta(days=days)
        query = query.where(AIResult.created_at >= cutoff_date)
        
        results = db.exec(query).all()
        
        # Prepare data
        data = []
        for ai_result, file_upload, checklist, user in results:
            data.append({
                "ai_result_id": ai_result.id,
                "checklist_id": checklist.id,
                "checklist_title": checklist.title,
                "file_id": file_upload.id,
                "filename": file_upload.filename,
                "user_id": user.id,
                "username": user.username,
                "user_email": user.email,
                "ai_score": ai_result.score,
                "feedback": ai_result.feedback[:500] + "..." if len(ai_result.feedback) > 500 else ai_result.feedback,
                "processing_time_ms": ai_result.processing_time_ms,
                "ai_model_version": ai_result.ai_model_version,
                "created_at": ai_result.created_at,
                "uploaded_at": file_upload.uploaded_at,
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            buf = StringIO()
            df.to_csv(buf, index=False)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=ai_results_{timestamp}.csv"}
            )
        elif format == "excel":
            buf = BytesIO()
            df.to_excel(buf, index=False, engine="openpyxl")
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=ai_results_{timestamp}.xlsx"}
            )
        elif format == "json":
            buf = StringIO()
            df.to_json(buf, orient="records", indent=2)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=ai_results_{timestamp}.json"}
            )
            
    except Exception as e:
        logger.error(f"AI results export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/users")
def export_users(
    format: str = Query("csv", regex="^(csv|excel|json)$"),
    role: str = Query(None, description="Filter by user role"),
    include_stats: bool = Query(True, description="Include user activity statistics"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export user data with optional statistics"""
    try:
        # Get users
        query = select(User)
        if role:
            query = query.where(User.role == role)
        users = db.exec(query).all()
        
        # Prepare data
        data = []
        for user in users:
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
                "last_login": user.last_login,
                "is_active": user.is_active,
            }
            
            # Add statistics if requested
            if include_stats:
                file_count = db.exec(select(FileUpload).where(FileUpload.user_id == user.id)).all()
                ai_results = db.exec(select(AIResult).where(AIResult.user_id == user.id)).all()
                
                user_data.update({
                    "total_uploads": len(file_count),
                    "total_ai_analyses": len(ai_results),
                    "avg_ai_score": sum(r.score for r in ai_results) / len(ai_results) if ai_results else 0.0,
                    "last_activity": max([f.uploaded_at for f in file_count] + [user.created_at]) if file_count else user.created_at
                })
            
            data.append(user_data)
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            buf = StringIO()
            df.to_csv(buf, index=False)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.csv"}
            )
        elif format == "excel":
            buf = BytesIO()
            df.to_excel(buf, index=False, engine="openpyxl")
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.xlsx"}
            )
        elif format == "json":
            buf = StringIO()
            df.to_json(buf, orient="records", indent=2)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.json"}
            )
            
    except Exception as e:
        logger.error(f"Users export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/submissions")
def export_submissions(
    format: str = Query("csv", regex="^(csv|excel|json)$"),
    checklist_id: int = Query(None, description="Filter by checklist ID"),
    user_id: int = Query(None, description="Filter by user ID"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export submission answers with filtering options"""
    try:
        # Build query with joins
        query = select(SubmissionAnswer, Checklist, User).join(
            Checklist, SubmissionAnswer.checklist_id == Checklist.id
        ).join(
            User, SubmissionAnswer.user_id == User.id
        )
        
        # Apply filters
        if checklist_id:
            query = query.where(SubmissionAnswer.checklist_id == checklist_id)
        if user_id:
            query = query.where(SubmissionAnswer.user_id == user_id)
        
        # Date filter
        cutoff_date = datetime.now() - pd.Timedelta(days=days)
        query = query.where(SubmissionAnswer.submitted_at >= cutoff_date)
        
        results = db.exec(query).all()
        
        # Prepare data
        data = []
        for submission, checklist, user in results:
            data.append({
                "submission_id": submission.id,
                "checklist_id": checklist.id,
                "checklist_title": checklist.title,
                "question_id": submission.question_id,
                "user_id": user.id,
                "username": user.username,
                "user_email": user.email,
                "user_role": user.role,
                "answer_text": submission.answer_text[:1000] + "..." if len(submission.answer_text) > 1000 else submission.answer_text,
                "submitted_at": submission.submitted_at,
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            buf = StringIO()
            df.to_csv(buf, index=False)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=submissions_{timestamp}.csv"}
            )
        elif format == "excel":
            buf = BytesIO()
            df.to_excel(buf, index=False, engine="openpyxl")
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=submissions_{timestamp}.xlsx"}
            )
        elif format == "json":
            buf = StringIO()
            df.to_json(buf, orient="records", indent=2)
            buf.seek(0)
            return StreamingResponse(
                iter([buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=submissions_{timestamp}.json"}
            )
            
    except Exception as e:
        logger.error(f"Submissions export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
