"""
Enhanced reporting endpoints for comprehensive ESG checklist analysis
Works alongside existing export functionality to provide additional reporting capabilities
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..database import get_session as get_db
from ..services.enhanced_reporting import get_enhanced_reporting_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["enhanced-reports"])


class ReportResponse(BaseModel):
    """Base response model for reports"""
    success: bool
    report_type: str
    generated_at: str
    data: dict


@router.get("/executive-summary", response_model=ReportResponse)
async def get_executive_summary(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    db: Session = Depends(get_db)
):
    """
    Generate executive summary report for stakeholders
    Provides high-level overview of ESG checklist performance and trends
    """
    try:
        reporting_service = get_enhanced_reporting_service(db)
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
        
        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
        
        # Generate summary
        summary_data = reporting_service.generate_executive_summary(
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            department=department
        )
        
        return ReportResponse(
            success=True,
            report_type="executive_summary",
            generated_at=datetime.now(timezone.utc).isoformat(),
            data=summary_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating executive summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance-dashboard", response_model=ReportResponse)
async def get_compliance_dashboard_data(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Generate compliance dashboard data for visualization
    Provides trending data, KPIs, and department performance metrics
    """
    try:
        reporting_service = get_enhanced_reporting_service(db)
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
        
        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
        
        # Generate dashboard data
        dashboard_data = reporting_service.generate_compliance_dashboard_data(
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
        
        return ReportResponse(
            success=True,
            report_type="compliance_dashboard",
            generated_at=datetime.now(timezone.utc).isoformat(),
            data=dashboard_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating compliance dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-readiness", response_model=ReportResponse)
async def get_audit_readiness_assessment(
    target_compliance_rate: float = Query(0.9, description="Target compliance rate for audit readiness", ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """
    Generate audit readiness assessment based on recent analyses
    Evaluates current compliance status and provides action items for audit preparation
    """
    try:
        reporting_service = get_enhanced_reporting_service(db)
        
        # Generate audit readiness assessment
        readiness_data = reporting_service.generate_audit_readiness_report(
            target_compliance_rate=target_compliance_rate
        )
        
        return ReportResponse(
            success=True,
            report_type="audit_readiness",
            generated_at=datetime.now(timezone.utc).isoformat(),
            data=readiness_data
        )
        
    except Exception as e:
        logger.error(f"Error generating audit readiness assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary-for-email")
async def get_summary_for_email_notification(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Generate summary data optimized for email notifications
    This endpoint provides data that can be used by the email notification system
    """
    try:
        reporting_service = get_enhanced_reporting_service(db)
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
        
        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
        
        # Generate executive summary for email
        summary_data = reporting_service.generate_executive_summary(
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
        
        # Format data for email template
        email_data = {
            "review_period": f"{summary_data['period']['start_date']} to {summary_data['period']['end_date']}",
            "total_audits": summary_data["summary"]["total_analyses"],
            "complete_audits": len([
                perf for perf in summary_data.get("top_performers", [])
                if perf.get("completion_rate", 0) >= 90
            ]),
            "incomplete_audits": len([
                need for need in summary_data.get("needs_attention", [])
                if 50 <= need.get("completion_rate", 0) < 90
            ]),
            "missing_audits": len([
                need for need in summary_data.get("needs_attention", [])
                if need.get("completion_rate", 0) < 50
            ]),
            "overall_completion_rate": summary_data["summary"]["average_completion_rate"],
            "audit_details": [],
            "recommendations": summary_data.get("recommendations", [])
        }
        
        # Add audit details from top performers and needs attention
        for performer in summary_data.get("top_performers", [])[:5]:
            email_data["audit_details"].append({
                "name": performer.get("filename", "Unknown"),
                "status": "Complete" if performer.get("completion_rate", 0) >= 90 else "Incomplete",
                "completion_rate": performer.get("completion_rate", 0),
                "last_updated": summary_data["generated_at"][:10],  # Date only
                "issue_count": performer.get("incomplete_count", 0) + performer.get("missing_count", 0)
            })
        
        for need in summary_data.get("needs_attention", [])[:5]:
            email_data["audit_details"].append({
                "name": need.get("filename", "Unknown"),
                "status": "Incomplete" if need.get("completion_rate", 0) >= 50 else "Missing",
                "completion_rate": need.get("completion_rate", 0),
                "last_updated": summary_data["generated_at"][:10],  # Date only
                "issue_count": need.get("incomplete_count", 0) + need.get("missing_count", 0)
            })
        
        return {
            "success": True,
            "email_data": email_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating summary for email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report-types")
async def get_available_report_types():
    """List all available report types and their descriptions"""
    return {
        "available_reports": [
            {
                "type": "executive_summary",
                "name": "Executive Summary",
                "description": "High-level overview of ESG performance and trends",
                "parameters": ["start_date", "end_date", "department"],
                "use_case": "Board reporting and stakeholder communication"
            },
            {
                "type": "compliance_dashboard",
                "name": "Compliance Dashboard Data",
                "description": "Trending data and KPIs for dashboard visualization",
                "parameters": ["start_date", "end_date"],
                "use_case": "Real-time monitoring and performance tracking"
            },
            {
                "type": "audit_readiness",
                "name": "Audit Readiness Assessment",
                "description": "Current compliance status and audit preparation guidance",
                "parameters": ["target_compliance_rate"],
                "use_case": "Pre-audit preparation and gap analysis"
            },
            {
                "type": "email_summary",
                "name": "Email Summary Data",
                "description": "Summary data optimized for email notifications",
                "parameters": ["start_date", "end_date"],
                "use_case": "Automated reporting and stakeholder notifications"
            }
        ],
        "integration_notes": [
            "All reports work alongside existing PDF/Excel export functionality",
            "Reports can be combined with email notification system",
            "Data is optimized for dashboard visualization and automated workflows"
        ]
    }