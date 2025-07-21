"""
Email notification endpoints for ESG checklist automation
Works alongside existing export functionality to provide email delivery options
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from ..database import get_session as get_db
from ..models import AIResult
from ..services.email_service import get_email_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email-notifications"])


class EmailNotificationRequest(BaseModel):
    """Request model for email notifications"""
    to_emails: List[EmailStr]
    analysis_id: Optional[int] = None
    include_attachment: bool = True


class MissingSubmissionRequest(BaseModel):
    """Request model for missing submission alerts"""
    to_emails: List[EmailStr]
    audit_name: str
    due_date: Optional[str] = None


class SummaryReportRequest(BaseModel):
    """Request model for summary reports"""
    to_emails: List[EmailStr]
    review_period: str = "Current"
    include_detailed_report: bool = True


class EmailResponse(BaseModel):
    """Response model for email operations"""
    success: bool
    message: str
    email_count: int


@router.post("/incomplete-checklist", response_model=EmailResponse)
async def send_incomplete_checklist_notification(
    request: EmailNotificationRequest,
    db: Session = Depends(get_db)
):
    """
    Send notification about incomplete checklist to audit team
    This works alongside the existing export functionality
    """
    try:
        email_service = get_email_service()
        
        # Get analysis result from database
        if not request.analysis_id:
            raise HTTPException(status_code=400, detail="Analysis ID is required")
        
        analysis = db.query(AIResult).filter(
            AIResult.id == request.analysis_id
        ).first()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis result not found")
        
        # Prepare analysis data for email
        analysis_data = {
            'file_info': {
                'filename': analysis.filename or 'Unknown'
            },
            'created_at': analysis.created_at.isoformat() if analysis.created_at else '',
            'metadata': analysis.metadata or {}
        }
        
        # Send email notification
        success = email_service.send_incomplete_checklist_notification(
            to_emails=request.to_emails,
            analysis_result=analysis_data,
            checklist_file_path=analysis.file_path if request.include_attachment else None
        )
        
        if success:
            # Log the email notification in analysis metadata
            if analysis.metadata is None:
                analysis.metadata = {}
            
            if 'email_notifications' not in analysis.metadata:
                analysis.metadata['email_notifications'] = []
            
            analysis.metadata['email_notifications'].append({
                'type': 'incomplete_checklist',
                'sent_to': request.to_emails,
                'sent_at': analysis_data['created_at'],
                'include_attachment': request.include_attachment
            })
            
            db.commit()
            
            return EmailResponse(
                success=True,
                message="Incomplete checklist notification sent successfully",
                email_count=len(request.to_emails)
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send email notification")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending incomplete checklist notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/missing-submission", response_model=EmailResponse)
async def send_missing_submission_alert(request: MissingSubmissionRequest):
    """Send alert about missing ESG checklist submission to Advisory team"""
    try:
        email_service = get_email_service()
        
        success = email_service.send_missing_submission_alert(
            to_emails=request.to_emails,
            audit_name=request.audit_name,
            due_date=request.due_date
        )
        
        if success:
            return EmailResponse(
                success=True,
                message="Missing submission alert sent successfully",
                email_count=len(request.to_emails)
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send missing submission alert")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending missing submission alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary-report", response_model=EmailResponse)
async def send_summary_report(
    request: SummaryReportRequest,
    db: Session = Depends(get_db)
):
    """Send comprehensive summary report to stakeholders"""
    try:
        email_service = get_email_service()
        
        # Generate summary data from recent analyses
        recent_analyses = db.query(AnalysisResult).order_by(
            AnalysisResult.created_at.desc()
        ).limit(50).all()
        
        # Calculate summary statistics
        total_audits = len(recent_analyses)
        complete_audits = 0
        incomplete_audits = 0
        missing_audits = 0
        
        audit_details = []
        
        for analysis in recent_analyses:
            metadata = analysis.metadata or {}
            completeness = metadata.get('checklist_completeness', {})
            completion_rate = completeness.get('completion_rate', 0) * 100
            
            if completion_rate >= 90:
                complete_audits += 1
                status = "Complete"
            elif completion_rate >= 50:
                incomplete_audits += 1
                status = "Incomplete"
            else:
                missing_audits += 1
                status = "Missing"
            
            # Count issues (incomplete + missing items)
            summary = completeness.get('summary', {})
            issue_count = summary.get('incomplete', 0) + summary.get('missing', 0)
            
            audit_details.append({
                'name': analysis.filename or f"Analysis {analysis.id}",
                'status': status,
                'completion_rate': round(completion_rate, 1),
                'last_updated': analysis.created_at.strftime('%Y-%m-%d') if analysis.created_at else '',
                'issue_count': issue_count
            })
        
        overall_completion_rate = round(
            (complete_audits / total_audits * 100) if total_audits > 0 else 0, 1
        )
        
        # Generate recommendations based on data
        recommendations = []
        if incomplete_audits > complete_audits:
            recommendations.append(
                "Focus on improving checklist completion quality - many audits have incomplete responses"
            )
        if missing_audits > 0:
            recommendations.append(
                f"Follow up on {missing_audits} audits with significant missing information"
            )
        if overall_completion_rate < 80:
            recommendations.append(
                "Consider providing additional training on ESG checklist requirements"
            )
        
        summary_data = {
            'review_period': request.review_period,
            'total_audits': total_audits,
            'complete_audits': complete_audits,
            'incomplete_audits': incomplete_audits,
            'missing_audits': missing_audits,
            'overall_completion_rate': overall_completion_rate,
            'audit_details': audit_details if request.include_detailed_report else [],
            'recommendations': recommendations
        }
        
        success = email_service.send_summary_report(
            to_emails=request.to_emails,
            summary_data=summary_data
        )
        
        if success:
            return EmailResponse(
                success=True,
                message="Summary report sent successfully",
                email_count=len(request.to_emails)
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send summary report")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending summary report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def list_email_templates():
    """List available email templates for configuration"""
    return {
        "templates": [
            {
                "name": "incomplete_checklist",
                "description": "Notification for audit teams about incomplete checklists",
                "variables": [
                    "filename", "analysis_date", "total_questions", "complete_count",
                    "incomplete_count", "missing_count", "completion_rate",
                    "incomplete_items", "missing_items"
                ]
            },
            {
                "name": "missing_submission",
                "description": "Alert for Advisory team about missing submissions",
                "variables": ["audit_name", "due_date", "current_date"]
            },
            {
                "name": "summary_report",
                "description": "Comprehensive summary report for stakeholders",
                "variables": [
                    "review_period", "report_date", "total_audits", "complete_audits",
                    "incomplete_audits", "missing_audits", "overall_completion_rate",
                    "audit_details", "recommendations"
                ]
            }
        ]
    }


@router.get("/status")
async def get_email_service_status():
    """Get email service configuration status"""
    try:
        email_service = get_email_service()
        settings = email_service.settings
        
        return {
            "email_enabled": settings.enable_email_notifications,
            "smtp_configured": bool(settings.smtp_server and settings.from_email),
            "smtp_server": settings.smtp_server,
            "from_email": settings.from_email,
            "templates_available": True
        }
    except Exception as e:
        logger.error(f"Error checking email service status: {e}")
        return {
            "email_enabled": False,
            "smtp_configured": False,
            "error": str(e)
        }