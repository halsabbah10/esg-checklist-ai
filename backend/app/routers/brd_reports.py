"""
BRD-compliant reporting endpoints for ESG checklist automation
Provides reports specifically aligned with Business Requirements Document
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_session as get_db
from ..services.enhanced_reporting import get_enhanced_reporting_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brd-reports", tags=["brd-reports"])


@router.get("/review-cycle-summary")
async def get_review_cycle_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Generate BRD-compliant ESG review cycle summary report
    
    Returns comprehensive summary with:
    - Number of files checked
    - Number of completed and incomplete audits
    - Missing audit files
    - Audit team performance
    - Validation results
    """
    try:
        # Parse dates if provided
        start_dt = None
        end_dt = None
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        if end_date:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
        
        reporting_service = get_enhanced_reporting_service(db)
        summary = reporting_service.generate_brd_compliance_summary(
            start_date=start_dt,
            end_date=end_dt
        )
        
        return {
            "success": True,
            "data": summary
        }
        
    except Exception as e:
        logger.error(f"Failed to generate review cycle summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/missing-submissions")
async def get_missing_submissions_report(
    target_date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Generate missing submissions alert report for Advisory team
    
    Returns:
    - Users who haven't submitted ESG checklists
    - Overdue submissions
    - Compliance rates
    """
    try:
        target_dt = None
        if target_date:
            target_dt = datetime.fromisoformat(target_date).replace(tzinfo=timezone.utc)
        
        reporting_service = get_enhanced_reporting_service(db)
        report = reporting_service.generate_missing_submissions_report(
            target_date=target_dt
        )
        
        return {
            "success": True,
            "data": report
        }
        
    except Exception as e:
        logger.error(f"Failed to generate missing submissions report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/advisory-dashboard")
async def get_advisory_dashboard(
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """
    Generate Advisory team dashboard with monitoring metrics
    
    Returns:
    - Submission monitoring statistics
    - Quality validation results
    - Notification history
    - Turnaround time metrics
    """
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        reporting_service = get_enhanced_reporting_service(db)
        
        # Get both BRD compliance summary and missing submissions
        compliance_summary = reporting_service.generate_brd_compliance_summary(
            start_date=start_date,
            end_date=end_date
        )
        
        missing_submissions = reporting_service.generate_missing_submissions_report(
            target_date=end_date
        )
        
        # Combine into Advisory team dashboard
        dashboard = {
            "period": compliance_summary["period"],
            "overview": {
                "files_monitored": compliance_summary["summary"]["files_checked"],
                "completed_audits": compliance_summary["summary"]["completed_audits"],
                "incomplete_audits": compliance_summary["summary"]["incomplete_audits"],
                "missing_audits": compliance_summary["summary"]["missing_audits"],
                "overall_compliance_rate": compliance_summary["summary"]["completion_rate"],
                "missing_submissions": missing_submissions["summary"]["missing"],
                "overdue_submissions": missing_submissions["summary"]["overdue"]
            },
            "team_performance": compliance_summary["audit_teams"],
            "quality_metrics": compliance_summary["validation_results"],
            "notifications": compliance_summary["notifications_sent"],
            "efficiency": {
                "avg_processing_time_ms": compliance_summary["cycle_completion_time"],
                "total_notifications_sent": compliance_summary["notifications_sent"]["total_notifications"]
            },
            "missing_submissions_detail": missing_submissions["missing_submissions"],
            "overdue_submissions_detail": missing_submissions["overdue_submissions"],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "success": True,
            "data": dashboard
        }
        
    except Exception as e:
        logger.error(f"Failed to generate advisory dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quality-validation-summary")
async def get_quality_validation_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Generate quality validation summary report
    
    Returns:
    - NLP/rule-based validation results
    - Comment quality scores
    - Validation trends
    """
    try:
        # Parse dates if provided
        start_dt = None
        end_dt = None
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        if end_date:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
        
        reporting_service = get_enhanced_reporting_service(db)
        summary = reporting_service.generate_brd_compliance_summary(
            start_date=start_dt,
            end_date=end_dt
        )
        
        # Extract quality validation specific data
        quality_report = {
            "period": summary["period"],
            "validation_summary": summary["validation_results"],
            "team_quality_scores": [
                {
                    "team_name": team["team_name"],
                    "avg_quality_score": team["avg_quality_score"],
                    "files_processed": team["submitted_files"]
                }
                for team in summary["audit_teams"]
            ],
            "quality_trends": {
                "high_quality_rate": round(
                    (summary["validation_results"]["high_quality"] / 
                     max(1, summary["validation_results"]["total_validated"])) * 100, 1
                ),
                "needs_improvement_rate": round(
                    (summary["validation_results"]["low_quality"] / 
                     max(1, summary["validation_results"]["total_validated"])) * 100, 1
                )
            },
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "success": True,
            "data": quality_report
        }
        
    except Exception as e:
        logger.error(f"Failed to generate quality validation summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))