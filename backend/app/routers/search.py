"""
Search router for finding various entities in the ESG system
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select, and_, or_, func

from ..auth import require_role
from ..database import get_session
from ..models import AIResult, FileUpload, Checklist, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/ai-results")
def search_ai_results(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    filename: Optional[str] = Query(None),
    ai_model_version: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor")),
):
    """
    Search AI analysis results with filtering and pagination.
    """
    try:
        # Build the query
        query = select(AIResult).join(FileUpload, AIResult.file_upload_id == FileUpload.id)
        
        # Apply filters
        conditions = []
        
        if filename:
            conditions.append(FileUpload.filename.contains(filename))
        
        if ai_model_version and ai_model_version != 'all':
            conditions.append(AIResult.ai_model_version.contains(ai_model_version))
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Apply ordering
        query = query.order_by(AIResult.created_at.desc())
        
        # Get total count
        count_query = select(func.count()).select_from(
            select(AIResult).join(FileUpload, AIResult.file_upload_id == FileUpload.id)
        )
        if conditions:
            count_query = count_query.where(and_(*conditions))
        
        total = session.exec(count_query).first()
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        # Execute query
        results = session.exec(query).all()
        
        # Format results with file information
        formatted_results = []
        for result in results:
            file_upload = session.get(FileUpload, result.file_upload_id)
            
            # Extract metadata safely without recursion
            metadata = None
            completeness_status = None
            checklist_completeness = None
            
            if hasattr(result, 'analysis_metadata') and result.analysis_metadata:
                try:
                    import json
                    parsed_metadata = json.loads(result.analysis_metadata)
                    
                    # Extract only the fields we need
                    if isinstance(parsed_metadata, dict):
                        metadata = {
                            "department_context": parsed_metadata.get("department_context"),
                            "category_scores": parsed_metadata.get("category_scores"),
                            "quality_score": parsed_metadata.get("quality_score"),
                        }
                        checklist_completeness = parsed_metadata.get("checklist_completeness")
                        
                        # Determine completeness status from checklist_completeness
                        if checklist_completeness and isinstance(checklist_completeness, dict):
                            completion_rate = checklist_completeness.get("completion_rate", 0)
                            if completion_rate >= 0.95:
                                completeness_status = "Complete"
                            elif completion_rate >= 0.5:
                                completeness_status = "Incomplete"
                            else:
                                completeness_status = "Missing"
                        else:
                            completeness_status = "Unknown"
                except Exception as e:
                    logger.warning(f"Failed to parse metadata for result {result.id}: {e}")
                    completeness_status = "Unknown"
            else:
                completeness_status = "Unknown"
            
            formatted_result = {
                "id": result.id,
                "score": float(result.score),
                "overall_score": float(result.score),  # Add overall_score field for frontend compatibility
                "ai_model_version": str(result.ai_model_version),
                "created_at": result.created_at.isoformat(),
                "updated_at": result.created_at.isoformat(),  # Add updated_at field
                "processing_time_ms": int(result.processing_time_ms) if result.processing_time_ms else 0,
                "file_upload_id": result.file_upload_id,
                "upload_id": result.file_upload_id,  # Add upload_id alias
                "feedback": str(result.feedback) if result.feedback else None,
                "analysis": str(result.feedback) if result.feedback else None,  # Add analysis alias
                "status": "completed",  # Add status field
                "checklist_id": result.checklist_id,
                "filename": file_upload.filename if file_upload else "Unknown",
                "file_info": {
                    "filename": file_upload.filename if file_upload else "Unknown",
                    "file_size": file_upload.file_size if file_upload else 0,
                } if file_upload else None,
                "metadata": {
                    "checklist_completeness": checklist_completeness,
                    **(metadata or {})
                },
                "analysis_metadata": metadata,  # Add analysis_metadata alias
                "checklist_completeness": checklist_completeness,  # Add direct completeness field
                "completeness_status": completeness_status,
                "quality_score": getattr(result, 'quality_score', None),
                "revision_count": getattr(result, 'revision_count', None),
            }
            formatted_results.append(formatted_result)
        
        return {
            "results": formatted_results,
            "total": total or 0,
            "limit": limit,
            "offset": offset,
        }
        
    except Exception as e:
        logger.error(f"Error searching AI results: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/ai-results/{result_id}")
def get_ai_result(
    result_id: int,
    session: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor")),
):
    """
    Get a specific AI analysis result by ID.
    """
    try:
        result = session.get(AIResult, result_id)
        if not result:
            raise HTTPException(status_code=404, detail="AI result not found")
        
        # Get file upload information
        file_upload = session.get(FileUpload, result.file_upload_id)
        
        # Extract metadata safely without recursion
        metadata = None
        completeness_status = None
        checklist_completeness = None
        
        if hasattr(result, 'analysis_metadata') and result.analysis_metadata:
            try:
                import json
                parsed_metadata = json.loads(result.analysis_metadata)
                
                # Extract only the fields we need
                if isinstance(parsed_metadata, dict):
                    metadata = {
                        "department_context": parsed_metadata.get("department_context"),
                        "category_scores": parsed_metadata.get("category_scores"),
                        "quality_score": parsed_metadata.get("quality_score"),
                    }
                    checklist_completeness = parsed_metadata.get("checklist_completeness")
                    
                    # Determine completeness status from checklist_completeness
                    if checklist_completeness and isinstance(checklist_completeness, dict):
                        completion_rate = checklist_completeness.get("completion_rate", 0)
                        if completion_rate >= 0.95:
                            completeness_status = "Complete"
                        elif completion_rate >= 0.5:
                            completeness_status = "Incomplete"
                        else:
                            completeness_status = "Missing"
                    else:
                        completeness_status = "Unknown"
            except Exception as e:
                logger.warning(f"Failed to parse metadata for result {result.id}: {e}")
                completeness_status = "Unknown"
        else:
            completeness_status = "Unknown"
        
        return {
            "id": result.id,
            "score": float(result.score),
            "overall_score": float(result.score),  # Add overall_score field for frontend compatibility
            "ai_model_version": result.ai_model_version,
            "created_at": result.created_at.isoformat(),
            "updated_at": result.created_at.isoformat(),  # Add updated_at field
            "processing_time_ms": result.processing_time_ms,
            "file_upload_id": result.file_upload_id,
            "upload_id": result.file_upload_id,  # Add upload_id alias
            "feedback": result.feedback,
            "analysis": result.feedback,  # Add analysis alias
            "status": "completed",  # Add status field
            "checklist_id": result.checklist_id,
            "filename": file_upload.filename if file_upload else "Unknown",
            "file_info": {
                "filename": file_upload.filename if file_upload else "Unknown",
                "file_size": file_upload.file_size if file_upload else 0,
            } if file_upload else None,
            "metadata": {
                "checklist_completeness": checklist_completeness,
                **(metadata or {})
            },
            "analysis_metadata": metadata,  # Add analysis_metadata alias
            "checklist_completeness": checklist_completeness,  # Add direct completeness field
            "completeness_status": completeness_status,
            "quality_score": getattr(result, 'quality_score', None),
            "revision_count": getattr(result, 'revision_count', None),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI result {result_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/file-uploads")
def search_file_uploads(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    filename: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor")),
):
    """
    Search file uploads with filtering and pagination.
    """
    try:
        query = select(FileUpload)
        
        if filename:
            query = query.where(FileUpload.filename.contains(filename))
        
        query = query.order_by(FileUpload.created_at.desc())
        
        # Get total count
        count_query = select(func.count()).select_from(FileUpload)
        if filename:
            count_query = count_query.where(FileUpload.filename.contains(filename))
        
        total = session.exec(count_query).first()
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        results = session.exec(query).all()
        
        return {
            "results": [
                {
                    "id": upload.id,
                    "filename": upload.filename,
                    "file_size": upload.file_size,
                    "created_at": upload.created_at.isoformat(),
                    "checklist_id": upload.checklist_id,
                }
                for upload in results
            ],
            "total": total or 0,
            "limit": limit,
            "offset": offset,
        }
        
    except Exception as e:
        logger.error(f"Error searching file uploads: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/submissions")
def search_submissions(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user=Depends(require_role("auditor")),
):
    """
    Search checklist submissions with filtering and pagination.
    """
    try:
        query = select(Checklist).order_by(Checklist.created_at.desc())
        
        # Get total count
        total = session.exec(select(func.count()).select_from(Checklist)).first()
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        results = session.exec(query).all()
        
        return {
            "results": [
                {
                    "id": checklist.id,
                    "title": checklist.title,
                    "description": checklist.description,
                    "created_at": checklist.created_at.isoformat(),
                    "user_id": checklist.user_id,
                }
                for checklist in results
            ],
            "total": total or 0,
            "limit": limit,
            "offset": offset,
        }
        
    except Exception as e:
        logger.error(f"Error searching submissions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/users")
def search_users(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _current_user=Depends(require_role("admin")),
):
    """
    Search users with filtering and pagination (admin only).
    """
    try:
        query = select(User)
        
        if search:
            query = query.where(
                or_(
                    User.username.contains(search),
                    User.email.contains(search),
                )
            )
        
        query = query.order_by(User.created_at.desc())
        
        # Get total count
        count_query = select(func.count()).select_from(User)
        if search:
            count_query = count_query.where(
                or_(
                    User.username.contains(search),
                    User.email.contains(search),
                )
            )
        
        total = session.exec(count_query).first()
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        results = session.exec(query).all()
        
        return {
            "results": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "created_at": user.created_at.isoformat(),
                }
                for user in results
            ],
            "total": total or 0,
            "limit": limit,
            "offset": offset,
        }
        
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")