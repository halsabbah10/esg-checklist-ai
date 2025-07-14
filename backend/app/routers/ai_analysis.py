import contextlib
import io
import json
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.services.realtime_analytics import (
    track_ai_processing,
)
from app.utils.file_security import generate_secure_filepath, validate_upload_file
from app.utils.notifications import notify_user

from ..ai.department_configs import get_all_departments
from ..ai.scorer import AIScorer
from ..auth import require_role
from ..config import get_settings
from ..database import get_session
from ..models import AIResult, Checklist, FileUpload

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/ai-analysis", tags=["ai-analysis"])


class AIModel(str, Enum):
    """Available AI models for analysis."""
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    EAND_CHATGPT = "eand"


class AnalysisRequest(BaseModel):
    """Request model for AI analysis configuration."""
    model: AIModel
    department: str


class AnalysisStep(BaseModel):
    """Response model for analysis step information."""
    step: int
    title: str
    description: str
    completed: bool
    data: Optional[dict] = None


@router.get("/models")
def get_available_models(
    _current_user=Depends(require_role("auditor"))
):
    """Get list of available AI models with their capabilities."""
    return {
        "models": [
            {
                "id": "gemini",
                "name": "Google Gemini 2.0 Flash",
                "description": "Advanced multimodal AI with comprehensive ESG analysis capabilities",
                "provider": "Google",
                "capabilities": [
                    "Comprehensive ESG scoring",
                    "Department-specific analysis",
                    "Multi-language support",
                    "Fast processing"
                ],
                "available": bool(settings.GEMINI_API_KEY),
                "recommended": True
            },
            {
                "id": "deepseek",
                "name": "DeepSeek R1",
                "description": "Advanced reasoning AI model with deep analytical capabilities",
                "provider": "DeepSeek",
                "capabilities": [
                    "Advanced reasoning",
                    "Detailed analysis",
                    "Complex problem solving",
                    "Thorough assessments"
                ],
                "available": bool(settings.DEEPSEEK_API_KEY),
                "recommended": False
            },
            {
                "id": "eand",
                "name": "e& ChatGPT",
                "description": "e& internal AI model based on ChatGPT with regional expertise",
                "provider": "e&",
                "capabilities": [
                    "Regional compliance",
                    "e& specific requirements",
                    "Local regulations",
                    "Industry standards"
                ],
                "available": bool(settings.EAND_API_KEY),
                "recommended": False
            }
        ]
    }


@router.get("/departments")
def get_available_departments_list(
    _current_user=Depends(require_role("auditor"))
):
    """Get list of available departments for analysis."""
    departments = get_all_departments()
    return {
        "departments": [
            {
                "id": dept.lower().replace(" ", "_").replace("&", "and"),
                "name": dept,
                "description": f"Specialized ESG analysis for {dept} department",
                "focus_areas": [
                    "Department-specific compliance",
                    "Regulatory requirements",
                    "Best practices",
                    "Risk assessment"
                ]
            }
            for dept in departments
        ]
    }


# Removed checklist selection - users upload ESG checklist documents directly


@router.post("/validate-configuration")
def validate_analysis_configuration(
    request: AnalysisRequest,
    _current_user=Depends(require_role("auditor"))
):
    """Validate the analysis configuration before proceeding."""
    logger.info(f"Validating configuration: model={request.model.value}, department={request.department}")

    # Validate department
    departments = get_all_departments()
    if request.department not in departments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid department: {request.department}"
        )

    # Validate model availability
    AIScorer()
    model_available = False

    if (request.model == AIModel.GEMINI and settings.GEMINI_API_KEY) or (request.model == AIModel.DEEPSEEK and settings.DEEPSEEK_API_KEY) or (request.model == AIModel.EAND_CHATGPT and settings.EAND_API_KEY):
        model_available = True

    if not model_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI model {request.model.value} is not available or not configured"
        )

    return {
        "valid": True,
        "configuration": {
            "model": request.model.value,
            "model_name": {
                "gemini": "Google Gemini 2.0 Flash",
                "deepseek": "DeepSeek R1",
                "eand": "e& ChatGPT"
            }.get(request.model.value, request.model.value),
            "department": request.department,
            "department_name": request.department,
            "analysis_type": "ESG Checklist Document Analysis"
        }
    }


@router.post("/upload-and-analyze")
async def upload_and_analyze_document(
    model: str = Form(...),
    department: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor"))
):
    """
    Upload ESG checklist document and perform AI analysis with specified model and department.
    This is the main endpoint for the 4-step AI analysis workflow.
    """
    logger.info(f"User {current_user.id} starting AI analysis: model={model}, department={department}")

    # Validate inputs
    if model not in ["gemini", "deepseek", "eand"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid AI model: {model}"
        )

    # Validate department
    departments = get_all_departments()
    if department not in departments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid department: {department}"
        )

    try:
        # Step 1: File validation and storage
        file_content = await file.read()
        file_size = len(file_content)
        await file.seek(0)

        secure_filename, file_extension = await validate_upload_file(file)
        secure_filepath = generate_secure_filepath(secure_filename, current_user.id)
        secure_filepath.parent.mkdir(parents=True, exist_ok=True)

        # Save file
        import aiofiles
        async with aiofiles.open(secure_filepath, "wb") as f:
            await f.write(file_content)

        # Create file record
        file_record = FileUpload(
            checklist_id=None,  # No specific checklist - user uploads ESG document
            user_id=current_user.id,
            filename=secure_filename,
            filepath=str(secure_filepath),
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
            processing_status="processing"
        )

        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        # Step 2: Text extraction
        raw_text = await extract_text_from_file(secure_filepath, file_extension)

        # Step 3: AI Analysis with specified model
        scorer = AIScorer()

        # Temporarily override the scorer's provider for this analysis
        original_provider = scorer.provider
        scorer.provider = model

        try:
            # Perform department-specific analysis on the uploaded ESG document
            ai_start_time = datetime.now(timezone.utc)
            score, feedback, analysis_metadata = scorer.analyze_by_department(
                raw_text, department, []
            )
            ai_end_time = datetime.now(timezone.utc)
            processing_time_ms = int((ai_end_time - ai_start_time).total_seconds() * 1000)

            logger.info(f"AI analysis completed with {model} model: score={score}")

        finally:
            # Restore original provider
            scorer.provider = original_provider

        # Step 4: Store results
        import json
        analysis_metadata_str = json.dumps(analysis_metadata) if analysis_metadata else None

        ai_result = AIResult(
            file_upload_id=file_record.id,
            checklist_id=None,  # No specific checklist - user uploads ESG document
            user_id=current_user.id,
            raw_text=raw_text[:65000] if len(raw_text) > 65000 else raw_text,
            score=score,
            feedback=feedback[:65000] if len(feedback) > 65000 else feedback,
            ai_model_version=f"{model}-{department.lower().replace(' ', '-')}",
            processing_time_ms=processing_time_ms,
            analysis_metadata=analysis_metadata_str
        )

        db.add(ai_result)
        file_record.processing_status = "completed"
        db.add(file_record)
        db.commit()
        db.refresh(ai_result)

        # Send notification
        try:
            notify_user(
                db=db,
                user_id=current_user.id,
                title="AI Analysis Completed ✅",
                message=(
                    f"Analysis of '{secure_filename}' completed using {model.upper()} model. "
                    f"Score: {score:.3f}/1.0 ({score * 100:.1f}%)"
                ),
                link=f"/ai-analysis/results/{ai_result.id}",
                notification_type="success"
            )
        except Exception as e:
            logger.exception(f"Failed to send notification: {e}")

        # Track analytics
        try:
            track_ai_processing(
                db=db,
                user_id=current_user.id,
                session_id=f"ai_analysis_{ai_result.id}",
                file_id=file_record.id,
                ai_score=score,
                processing_time_ms=processing_time_ms
            )
        except Exception as e:
            logger.exception(f"Failed to track analytics: {e}")

        return {
            "success": True,
            "analysis_id": ai_result.id,
            "file_id": file_record.id,
            "configuration": {
                "model": model,
                "department": department,
                "analysis_type": "ESG Checklist Document"
            },
            "results": {
                "score": score,
                "feedback_length": len(feedback),
                "processing_time_ms": processing_time_ms,
                "completeness": analysis_metadata.get("checklist_completeness", {}) if analysis_metadata else {}
            }
        }

    except Exception as e:
        logger.exception(f"AI analysis failed: {e}")

        # Clean up on error
        if "file_record" in locals() and file_record and file_record.id:
            try:
                file_record.processing_status = "failed"
                db.add(file_record)
                db.commit()
            except Exception:
                pass

        if "secure_filepath" in locals() and secure_filepath and secure_filepath.exists():
            with contextlib.suppress(Exception):
                secure_filepath.unlink()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {e!s}"
        )


@router.get("/results/{analysis_id}")
def get_analysis_results(
    analysis_id: int,
    db: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor"))
):
    """Get the results of a completed AI analysis."""
    ai_result = db.get(AIResult, analysis_id)
    if not ai_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID {analysis_id} not found"
        )

    # Get associated file info
    file_upload = db.get(FileUpload, ai_result.file_upload_id)
    # For ESG document uploads, checklist_id is None
    checklist = db.get(Checklist, ai_result.checklist_id) if ai_result.checklist_id else None

    # Parse metadata
    import json
    metadata = {}
    if ai_result.analysis_metadata:
        try:
            metadata = json.loads(ai_result.analysis_metadata)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse metadata for analysis {analysis_id}")

    return {
        "analysis_id": ai_result.id,
        "score": ai_result.score,
        "feedback": ai_result.feedback,
        "processing_time_ms": ai_result.processing_time_ms,
        "created_at": ai_result.created_at,
        "model_version": ai_result.ai_model_version,
        "file_info": {
            "filename": file_upload.filename if file_upload else "Unknown",
            "file_size": file_upload.file_size if file_upload else 0,
            "uploaded_at": file_upload.uploaded_at if file_upload else None
        },
        "checklist_info": {
            "id": checklist.id if checklist else None,
            "title": checklist.title if checklist else "ESG Checklist Document",
            "description": checklist.description if checklist else "User-uploaded ESG checklist document for analysis"
        },
        "metadata": metadata
    }


@router.get("/results/{analysis_id}/export")
def export_analysis_results(
    analysis_id: int,
    format: str = "json",  # json, pdf, excel
    db: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor"))
):
    """Export analysis results in different formats."""
    # Get analysis result
    ai_result = db.get(AIResult, analysis_id)
    if not ai_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID {analysis_id} not found"
        )

    # Get associated file info
    file_upload = db.get(FileUpload, ai_result.file_upload_id)
    checklist = db.get(Checklist, ai_result.checklist_id) if ai_result.checklist_id else None

    # Parse metadata
    metadata = {}
    if ai_result.analysis_metadata:
        try:
            metadata = json.loads(ai_result.analysis_metadata)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse metadata for analysis {analysis_id}")

    # Prepare export data
    export_data = {
        "analysis_id": ai_result.id,
        "score": ai_result.score,
        "score_percentage": f"{ai_result.score * 100:.1f}%",
        "feedback": ai_result.feedback,
        "processing_time_ms": ai_result.processing_time_ms,
        "created_at": ai_result.created_at.isoformat(),
        "model_version": ai_result.ai_model_version,
        "file_info": {
            "filename": file_upload.filename if file_upload else "Unknown",
            "file_size": file_upload.file_size if file_upload else 0,
            "uploaded_at": file_upload.uploaded_at.isoformat() if file_upload else None
        },
        "checklist_info": {
            "title": checklist.title if checklist else "ESG Checklist Document",
            "description": checklist.description if checklist else "User-uploaded ESG checklist document for analysis"
        },
        "metadata": metadata
    }

    if format.lower() == "json":
        # Return JSON format
        json_str = json.dumps(export_data, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(json_str.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.json"}
        )

    if format.lower() == "excel":
        # Create Excel export (simplified implementation)
        import pandas as pd

        # Create DataFrame with analysis data
        df_data = {
            "Metric": [
                "Analysis ID", "Overall Score", "Score Percentage", "Model Version",
                "Processing Time (ms)", "Created At", "Filename", "File Size"
            ],
            "Value": [
                export_data["analysis_id"],
                export_data["score"],
                export_data["score_percentage"],
                export_data["model_version"],
                export_data["processing_time_ms"],
                export_data["created_at"],
                export_data["file_info"]["filename"],
                export_data["file_info"]["file_size"]
            ]
        }

        df = pd.DataFrame(df_data)

        # Create Excel file in memory
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Analysis Summary", index=False)

            # Add feedback as separate sheet
            feedback_df = pd.DataFrame({"AI Analysis Feedback": [export_data["feedback"]]})
            feedback_df.to_excel(writer, sheet_name="Detailed Feedback", index=False)

        excel_buffer.seek(0)

        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.xlsx"}
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported export format: {format}. Supported formats: json, excel"
    )


# Helper function for text extraction
async def extract_text_from_file(file_path, file_extension: str) -> str:
    """Extract text from uploaded file based on its extension."""
    import csv

    import openpyxl
    import pdfplumber
    from docx import Document

    try:
        if file_extension == "pdf":
            with pdfplumber.open(file_path) as pdf:
                return "\n".join([page.extract_text() or "" for page in pdf.pages])
        elif file_extension == "docx":
            doc = Document(str(file_path))
            return "\n".join([p.text for p in doc.paragraphs])
        elif file_extension == "xlsx":
            wb = openpyxl.load_workbook(file_path)
            text = []

            # First try to find the "ESG Questionnaires" tab specifically
            target_sheet = None
            for ws in wb.worksheets:
                if "esg" in ws.title.lower() and ("questionnaire" in ws.title.lower() or "question" in ws.title.lower()):
                    target_sheet = ws
                    logger.info(f"Found ESG questionnaires sheet: '{ws.title}'")
                    break

            # If no ESG questionnaires sheet found, use all sheets (fallback)
            if target_sheet:
                worksheets_to_process = [target_sheet]
                logger.info(f"Processing only the ESG questionnaires sheet: '{target_sheet.title}'")
            else:
                worksheets_to_process = wb.worksheets
                logger.info("No ESG questionnaires sheet found, processing all sheets")

            for ws in worksheets_to_process:
                for row in ws.iter_rows(values_only=True):
                    text.append(" ".join([str(cell) if cell else "" for cell in row]))
            return "\n".join(text)
        elif file_extension == "csv":
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                return "\n".join([", ".join(row) for row in reader])
        elif file_extension == "txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported file extension: {file_extension}")
    except Exception as e:
        logger.exception(f"Error extracting text from {file_path}: {e}")
        return f"Error extracting text: {e}"
