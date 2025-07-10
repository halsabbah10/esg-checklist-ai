"""
Department-specific ESG analysis endpoints.
Provides specialized AI analysis tailored to different department contexts.
"""

import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from ..auth import require_role
from ..database import get_session
from ..ai.scorer import AIScorer
from ..ai.department_configs import get_all_departments, get_department_config, format_department_context
from ..models import AIResult, Checklist, FileUpload, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/departments", tags=["departments"])


class DepartmentAnalysisRequest(BaseModel):
    """Request model for department-specific analysis."""
    text: str = Field(..., min_length=1, description="Text content to analyze")
    department_name: str = Field(..., description="Department name for specialized analysis")
    checklist_items: Optional[List[Dict[str, Any]]] = Field(None, description="Optional checklist items for context")
    file_upload_id: Optional[int] = Field(None, description="Optional file upload ID for tracking")
    checklist_id: Optional[int] = Field(None, description="Optional checklist ID for context")


class DepartmentAnalysisResponse(BaseModel):
    """Response model for department-specific analysis."""
    score: float = Field(..., ge=0.0, le=1.0, description="ESG compliance score")
    feedback: str = Field(..., description="Detailed analysis feedback")
    department_name: str = Field(..., description="Department that performed the analysis")
    audit_context: Dict[str, Any] = Field(..., description="Department-specific audit context")
    analysis_type: str = Field(default="department_specific", description="Type of analysis performed")


class DepartmentInfo(BaseModel):
    """Department information model."""
    department_name: str
    mandate: str
    focus_areas: List[str]
    frameworks: List[str]
    key_metrics: List[str]


@router.get("/public", response_model=List[str])
def get_departments_public():
    """
    Get list of all available department names for dropdown/selection purposes.
    This is a public endpoint that doesn't require authentication.
    
    Returns:
        List of department names
    """
    try:
        departments = get_all_departments()
        logger.info(f"Retrieved {len(departments)} departments for public access")
        return departments
    except Exception as e:
        logger.exception(f"Error retrieving departments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve departments"
        )


@router.get("/", response_model=List[str])
def get_departments(
    current_user=Depends(require_role(["admin", "reviewer", "auditor"]))
):
    """
    Get list of all available departments for analysis.
    Requires authentication.
    
    Returns:
        List of department names
    """
    try:
        departments = get_all_departments()
        logger.info(f"Retrieved {len(departments)} departments")
        return departments
    except Exception as e:
        logger.exception(f"Error retrieving departments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve departments"
        )


@router.get("/{department_name}/info")
def get_department_info(
    department_name: str,
    current_user=Depends(require_role(["admin", "reviewer", "auditor"]))
):
    """
    Get detailed information about a specific department.
    
    Args:
        department_name: Name of the department
        
    Returns:
        Department configuration and context information
    """
    try:
        config = get_department_config(department_name)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department '{department_name}' not found"
            )
        
        audit_context = config.get("audit_context", {})
        
        # Extract mandate from department name mapping
        mandate_mapping = {
            "Group Legal & Compliance": "Regulatory compliance, anti-bribery, and contract management",
            "Group Finance": "Sustainable finance, risk, budgeting, and ESG financial planning",
            "Group Strategy": "Strategic sustainability planning, targets, and performance tracking",
            "Group Operations": "Operational sustainability, environmental controls, and resource efficiency",
            "Group Human Resources": "Workforce welfare, diversity & inclusion, and employee engagement",
            "Branding & Communications": "ESG disclosures, internal and external communications",
            "Admin & Contracts": "Sustainable procurement, vendor management, and administrative ESG practices",
            "Group Risk & Internal Audit": "Risk assessment, ESG internal controls, and audit practices",
            "Technology": "Digital sustainability, data management, and system resilience"
        }
        
        return {
            "department_name": department_name,
            "mandate": mandate_mapping.get(department_name, "ESG compliance and management"),
            "focus_areas": audit_context.get("focus_areas", []),
            "frameworks": (
                audit_context.get("compliance_frameworks", []) or
                audit_context.get("financial_frameworks", []) or
                audit_context.get("strategic_frameworks", []) or
                audit_context.get("operational_frameworks", []) or
                audit_context.get("hr_frameworks", []) or
                audit_context.get("communication_frameworks", []) or
                audit_context.get("procurement_frameworks", []) or
                audit_context.get("risk_frameworks", []) or
                audit_context.get("technology_frameworks", [])
            ),
            "key_metrics": audit_context.get("key_metrics", []),
            "ui_config": config.get("ui_config", {}),
            "audit_context": audit_context
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving department info for {department_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve department information"
        )


@router.post("/analyze", response_model=DepartmentAnalysisResponse)
def analyze_by_department(
    request: DepartmentAnalysisRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_role(["admin", "reviewer", "auditor"]))
):
    """
    Perform department-specific ESG analysis on provided text.
    
    Args:
        request: Analysis request with text and department specification
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Department-specific analysis results with score and feedback
    """
    try:
        # Validate department exists
        dept_config = get_department_config(request.department_name)
        if not dept_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department '{request.department_name}' not found"
            )
        
        # Initialize AI scorer
        scorer = AIScorer()
        
        # Perform department-specific analysis
        logger.info(f"Starting department-specific analysis for {request.department_name}")
        score, feedback = scorer.analyze_by_department(
            text=request.text,
            department_name=request.department_name,
            checklist_items=request.checklist_items
        )
        
        # Store result in database if file_upload_id is provided
        if request.file_upload_id:
            ai_result = AIResult(
                file_upload_id=request.file_upload_id,
                checklist_id=request.checklist_id,
                user_id=current_user.id,
                score=score,
                feedback=feedback,
                ai_model_version=f"gemini-{request.department_name.lower().replace(' ', '-')}",
                processing_time_ms=None,  # Could be tracked if needed
                metadata={
                    "department": request.department_name,
                    "analysis_type": "department_specific",
                    "audit_context": dept_config.get("audit_context", {})
                }
            )
            db.add(ai_result)
            db.commit()
            db.refresh(ai_result)
            logger.info(f"Stored department analysis result with ID: {ai_result.id}")
        
        # Get audit context for response
        audit_context = format_department_context(request.department_name)
        
        return DepartmentAnalysisResponse(
            score=score,
            feedback=feedback,
            department_name=request.department_name,
            audit_context=audit_context,
            analysis_type="department_specific"
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid input for department analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Department analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed. Please try again later."
        )


@router.get("/analyze/history/{department_name}")
def get_department_analysis_history(
    department_name: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_session),
    current_user=Depends(require_role(["admin", "reviewer"]))
):
    """
    Get analysis history for a specific department.
    
    Args:
        department_name: Name of the department
        limit: Maximum number of results to return
        offset: Number of results to skip
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of analysis results for the department
    """
    try:
        # Validate department exists
        if not get_department_config(department_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department '{department_name}' not found"
            )
        
        # Query analysis results with department metadata
        results = db.query(AIResult).filter(
            AIResult.metadata.op("->>")(department_name).isnot(None)
        ).offset(offset).limit(limit).all()
        
        return [
            {
                "id": result.id,
                "score": result.score,
                "feedback": result.feedback[:200] + "..." if len(result.feedback) > 200 else result.feedback,
                "created_at": result.created_at,
                "user_id": result.user_id,
                "file_upload_id": result.file_upload_id,
                "checklist_id": result.checklist_id,
                "department": department_name,
                "ai_model_version": result.ai_model_version
            }
            for result in results
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving analysis history for {department_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analysis history"
        )