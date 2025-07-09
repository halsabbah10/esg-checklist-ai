import logging
from datetime import datetime
from io import BytesIO, StringIO
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.auth import require_role
from app.database import get_session
from app.models import AIResult, Checklist, FileUpload, SubmissionAnswer, User, UserActivity, SystemMetrics
from app.rate_limiting import admin_rate_limit, export_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


@router.get("/checklists")
@export_rate_limit
def export_all_checklists(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    include_inactive: bool = Query(False, description="Include inactive checklists"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export all checklists in various formats"""
    try:
        # Build query
        query: Any = select(Checklist)
        if not include_inactive:
            query = query.where(Checklist.is_active is True)

        checklists = db.exec(query).all()

        # Prepare data
        data = []
        for checklist in checklists:
            data.append(
                {
                    "id": checklist.id,
                    "title": checklist.title,
                    "description": checklist.description,
                    "created_by": checklist.created_by,
                    "created_at": checklist.created_at,
                    "updated_at": getattr(checklist, "updated_at", None),  # Safe access
                    "is_active": checklist.is_active,
                    "version": checklist.version,
                }
            )

        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=checklists_{timestamp}.csv"},
            )
        if format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=checklists_{timestamp}.xlsx"
                },
            )
        if format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=checklists_{timestamp}.json"
                },
            )

    except Exception as e:
        logger.exception(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/ai-results")
@export_rate_limit
def export_ai_results(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    checklist_id: int = Query(None, description="Filter by checklist ID"),
    min_score: float = Query(None, ge=0.0, le=1.0, description="Minimum AI score"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export AI scoring results with filtering options"""
    try:
        # Build query with joins
        query: Any = (
            select(AIResult, FileUpload, Checklist, User)
            .join(FileUpload, AIResult.file_upload_id == FileUpload.id)
            .join(Checklist, AIResult.checklist_id == Checklist.id)
            .join(User, AIResult.user_id == User.id)
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
            data.append(
                {
                    "ai_result_id": ai_result.id,
                    "checklist_id": checklist.id,
                    "checklist_title": checklist.title,
                    "file_id": file_upload.id,
                    "filename": file_upload.filename,
                    "user_id": user.id,
                    "username": user.username,
                    "user_email": user.email,
                    "ai_score": ai_result.score,
                    "feedback": (
                        ai_result.feedback[:500] + "..."
                        if len(ai_result.feedback) > 500
                        else ai_result.feedback
                    ),
                    "processing_time_ms": ai_result.processing_time_ms,
                    "ai_model_version": ai_result.ai_model_version,
                    "created_at": ai_result.created_at,
                    "uploaded_at": file_upload.uploaded_at,
                }
            )

        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=ai_results_{timestamp}.csv"},
            )
        if format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=ai_results_{timestamp}.xlsx"
                },
            )
        if format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=ai_results_{timestamp}.json"
                },
            )

    except Exception as e:
        logger.exception(f"AI results export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/users")
@admin_rate_limit
def export_users(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    role: str = Query(None, description="Filter by user role"),
    include_stats: bool = Query(True, description="Include user activity statistics"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export user data with optional statistics"""
    try:
        # Get users
        query: Any = select(User)
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

                user_data.update(
                    {
                        "total_uploads": len(file_count),
                        "total_ai_analyses": len(ai_results),
                        "avg_ai_score": (
                            sum(r.score for r in ai_results) / len(ai_results)
                            if ai_results
                            else 0.0
                        ),
                        "last_activity": (
                            max([f.uploaded_at for f in file_count] + [user.created_at])
                            if file_count
                            else user.created_at
                        ),
                    }
                )

            data.append(user_data)

        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.csv"},
            )
        if format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.xlsx"},
            )
        if format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=users_{timestamp}.json"},
            )

    except Exception as e:
        logger.exception(f"Users export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/submissions")
@export_rate_limit
def export_submissions(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    checklist_id: int = Query(None, description="Filter by checklist ID"),
    user_id: int = Query(None, description="Filter by user ID"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export submission answers with filtering options"""
    try:
        # Build query with joins
        query: Any = (
            select(SubmissionAnswer, Checklist, User)
            .join(
                Checklist, SubmissionAnswer.checklist_id == Checklist.id
            )
            .join(User, SubmissionAnswer.user_id == User.id)
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
            data.append(
                {
                    "submission_id": submission.id,
                    "checklist_id": checklist.id,
                    "checklist_title": checklist.title,
                    "question_id": submission.question_id,
                    "user_id": user.id,
                    "username": user.username,
                    "user_email": user.email,
                    "user_role": user.role,
                    "answer_text": (
                        submission.answer_text[:1000] + "..."
                        if len(submission.answer_text) > 1000
                        else submission.answer_text
                    ),
                    "submitted_at": submission.submitted_at,
                }
            )

        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=submissions_{timestamp}.csv"
                },
            )
        if format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=submissions_{timestamp}.xlsx"
                },
            )
        if format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=submissions_{timestamp}.json"
                },
            )

    except Exception as e:
        logger.exception(f"Submissions export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/analytics")
@export_rate_limit
def export_analytics_data(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    include_scores: bool = Query(True, description="Include AI scores in export"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export comprehensive analytics data"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get comprehensive analytics data
        data = []
        
        # Get users with their activity
        users = db.exec(select(User)).all()
        for user in users:
            # Get user's uploads
            user_uploads = db.exec(
                select(FileUpload).where(
                    FileUpload.user_id == user.id,
                    FileUpload.uploaded_at >= cutoff_date
                )
            ).all()
            
            # Get user's AI results
            user_ai_results = db.exec(
                select(AIResult).where(
                    AIResult.user_id == user.id,
                    AIResult.created_at >= cutoff_date
                )
            ).all()
            
            # Get user activities
            user_activities = db.exec(
                select(UserActivity).where(
                    UserActivity.user_id == user.id,
                    UserActivity.timestamp >= cutoff_date
                )
            ).all()
            
            # Calculate metrics
            avg_score = (
                sum(r.score for r in user_ai_results) / len(user_ai_results)
                if user_ai_results and include_scores
                else 0
            )
            
            avg_processing_time = (
                sum(r.processing_time_ms or 0 for r in user_ai_results) / len(user_ai_results)
                if user_ai_results
                else 0
            )
            
            data.append({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
                "last_login": user.last_login,
                "is_active": user.is_active,
                "total_uploads": len(user_uploads),
                "total_ai_analyses": len(user_ai_results),
                "avg_ai_score": round(avg_score, 3) if include_scores else None,
                "avg_processing_time_ms": round(avg_processing_time, 2),
                "total_activities": len(user_activities),
                "most_recent_activity": max([a.timestamp for a in user_activities]) if user_activities else None,
                "activity_types": list(set(a.action_type for a in user_activities)),
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=analytics_{timestamp}.csv"},
            )
        elif format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=analytics_{timestamp}.xlsx"},
            )
        elif format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=analytics_{timestamp}.json"},
            )
            
    except Exception as e:
        logger.exception(f"Analytics export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/system-metrics")
@export_rate_limit
def export_system_metrics(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    days: int = Query(7, ge=1, le=365, description="Days of data to include"),
    category: str = Query(None, description="Filter by metric category"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export system metrics and performance data"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Build query
        query = select(SystemMetrics).where(SystemMetrics.recorded_at >= cutoff_date)
        if category:
            query = query.where(SystemMetrics.category == category)
        
        metrics = db.exec(query.order_by(SystemMetrics.recorded_at.desc())).all()
        
        # Prepare data
        data = []
        for metric in metrics:
            data.append({
                "id": metric.id,
                "metric_name": metric.metric_name,
                "metric_value": metric.metric_value,
                "metric_unit": metric.metric_unit,
                "category": metric.category,
                "recorded_at": metric.recorded_at,
                "additional_data": metric.additional_data,
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=system_metrics_{timestamp}.csv"},
            )
        elif format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=system_metrics_{timestamp}.xlsx"},
            )
        elif format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=system_metrics_{timestamp}.json"},
            )
            
    except Exception as e:
        logger.exception(f"System metrics export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/user-activities")
@export_rate_limit
def export_user_activities(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    days: int = Query(7, ge=1, le=30, description="Days of data to include"),
    user_id: int = Query(None, description="Filter by user ID"),
    action_type: str = Query(None, description="Filter by action type"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export user activity logs"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Build query with joins
        query = (
            select(UserActivity, User.username, User.email)
            .join(User, UserActivity.user_id == User.id)
            .where(UserActivity.timestamp >= cutoff_date)
        )
        
        if user_id:
            query = query.where(UserActivity.user_id == user_id)
        if action_type:
            query = query.where(UserActivity.action_type == action_type)
        
        activities = db.exec(query.order_by(UserActivity.timestamp.desc())).all()
        
        # Prepare data
        data = []
        for activity, username, email in activities:
            data.append({
                "id": activity.id,
                "user_id": activity.user_id,
                "username": username,
                "email": email,
                "session_id": activity.session_id,
                "action_type": activity.action_type,
                "resource_type": activity.resource_type,
                "resource_id": activity.resource_id,
                "duration_ms": activity.duration_ms,
                "ip_address": activity.ip_address,
                "user_agent": activity.user_agent,
                "timestamp": activity.timestamp,
                "action_details": activity.action_details,
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=user_activities_{timestamp}.csv"},
            )
        elif format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=user_activities_{timestamp}.xlsx"},
            )
        elif format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=user_activities_{timestamp}.json"},
            )
            
    except Exception as e:
        logger.exception(f"User activities export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")


@router.get("/compliance-report")
@export_rate_limit
def export_compliance_report(
    request: Request,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    days: int = Query(30, ge=1, le=365, description="Days of data to include"),
    min_score: float = Query(0.0, ge=0.0, le=1.0, description="Minimum compliance score"),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Export comprehensive compliance report"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get comprehensive compliance data
        query = (
            select(AIResult, FileUpload, Checklist, User)
            .join(FileUpload, AIResult.file_upload_id == FileUpload.id)
            .join(Checklist, AIResult.checklist_id == Checklist.id)
            .join(User, AIResult.user_id == User.id)
            .where(AIResult.created_at >= cutoff_date)
            .where(AIResult.score >= min_score)
        )
        
        results = db.exec(query).all()
        
        # Prepare compliance data
        data = []
        for ai_result, file_upload, checklist, user in results:
            # Determine compliance status
            compliance_status = "Compliant" if ai_result.score >= 0.7 else "Non-Compliant"
            risk_level = (
                "Low" if ai_result.score >= 0.8 
                else "Medium" if ai_result.score >= 0.6 
                else "High"
            )
            
            data.append({
                "assessment_id": ai_result.id,
                "checklist_id": checklist.id,
                "checklist_title": checklist.title,
                "file_id": file_upload.id,
                "filename": file_upload.filename,
                "user_id": user.id,
                "username": user.username,
                "user_role": user.role,
                "compliance_score": ai_result.score,
                "compliance_status": compliance_status,
                "risk_level": risk_level,
                "ai_model_version": ai_result.ai_model_version,
                "processing_time_ms": ai_result.processing_time_ms,
                "assessment_date": ai_result.created_at,
                "file_upload_date": file_upload.uploaded_at,
                "feedback_summary": (
                    ai_result.feedback[:200] + "..." if len(ai_result.feedback) > 200 
                    else ai_result.feedback
                ),
            })
        
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            csv_buf = StringIO()
            df.to_csv(csv_buf, index=False)
            csv_buf.seek(0)
            return StreamingResponse(
                iter([csv_buf.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=compliance_report_{timestamp}.csv"},
            )
        elif format == "excel":
            excel_buf = BytesIO()
            df.to_excel(excel_buf, index=False, engine="openpyxl")
            excel_buf.seek(0)
            return StreamingResponse(
                iter([excel_buf.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=compliance_report_{timestamp}.xlsx"},
            )
        elif format == "json":
            json_buf = StringIO()
            df.to_json(json_buf, orient="records", indent=2)
            json_buf.seek(0)
            return StreamingResponse(
                iter([json_buf.getvalue()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=compliance_report_{timestamp}.json"},
            )
            
    except Exception as e:
        logger.exception(f"Compliance report export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}")
