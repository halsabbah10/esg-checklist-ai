import logging
import mimetypes
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select

from app.auth import require_role
from app.config import get_settings
from app.database import get_session
from app.models import AIResult, FileUpload, User

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Download a file by its ID.

    Requires admin, auditor, or reviewer role.
    Users can only download files they uploaded or if they have admin/reviewer privileges.
    """
    try:
        # Get file record from database
        file_record = db.exec(select(FileUpload).where(FileUpload.id == file_id)).first()

        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Check permissions - users can download their own files, admins and reviewers can download any
        if (
            current_user.role not in ["admin", "reviewer"]
            and file_record.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you can only download your own files",
            )

        # Check if file exists on disk
        file_path = Path(file_record.filepath)
        if not file_path.exists():
            logger.error(f"File not found on disk: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server"
            )

        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file_record.filename)
        if mime_type is None:
            mime_type = "application/octet-stream"

        # Log download access
        logger.info(
            f"File download: user_id={current_user.id}, file_id={file_id}, "
            f"filename={file_record.filename}, size={file_record.file_size}"
        )

        # Return file response
        return FileResponse(
            path=str(file_path),
            filename=file_record.filename,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file_record.filename}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error downloading file {file_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error downloading file"
        )


@router.get("/{file_id}/view")
async def view_file(
    file_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    View a file inline (for supported types like PDFs, images, text files).

    Requires admin, auditor, or reviewer role.
    Users can only view files they uploaded or if they have admin/reviewer privileges.
    """
    try:
        # Get file record from database
        file_record = db.exec(select(FileUpload).where(FileUpload.id == file_id)).first()

        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Check permissions
        if (
            current_user.role not in ["admin", "reviewer"]
            and file_record.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you can only view your own files",
            )

        # Check if file exists on disk
        file_path = Path(file_record.filepath)
        if not file_path.exists():
            logger.error(f"File not found on disk: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server"
            )

        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file_record.filename)
        if mime_type is None:
            mime_type = "application/octet-stream"

        # Log view access
        logger.info(
            f"File view: user_id={current_user.id}, file_id={file_id}, "
            f"filename={file_record.filename}, mime_type={mime_type}"
        )

        # Return file for inline viewing
        return FileResponse(
            path=str(file_path),
            filename=file_record.filename,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'inline; filename="{file_record.filename}"',
                "Cache-Control": "public, max-age=3600",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error viewing file {file_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error viewing file"
        )


@router.get("/{file_id}/stream")
async def stream_file(
    file_id: int,
    range_header: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Stream a file with range support (useful for large files and video/audio).

    Requires admin, auditor, or reviewer role.
    """
    try:
        # Get file record from database
        file_record = db.exec(select(FileUpload).where(FileUpload.id == file_id)).first()

        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Check permissions
        if (
            current_user.role not in ["admin", "reviewer"]
            and file_record.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you can only stream your own files",
            )

        # Check if file exists on disk
        file_path = Path(file_record.filepath)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server"
            )

        # Get file size
        file_size = file_path.stat().st_size

        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file_record.filename)
        if mime_type is None:
            mime_type = "application/octet-stream"

        # Handle range requests for partial content
        start = 0
        end = file_size - 1

        if range_header:
            range_match = range_header.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1

        # Create streaming response
        def file_streamer():
            with open(file_path, "rb") as file:
                file.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = file.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
            "Content-Type": mime_type,
        }

        return StreamingResponse(
            file_streamer(),
            status_code=206 if range_header else 200,
            headers=headers,
            media_type=mime_type,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error streaming file {file_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error streaming file"
        )


@router.get("/{file_id}/info")
async def get_file_info(
    file_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Get file metadata and information.

    Requires admin, auditor, or reviewer role.
    """
    try:
        # Get file record from database
        file_record = db.exec(select(FileUpload).where(FileUpload.id == file_id)).first()

        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Check permissions
        if (
            current_user.role not in ["admin", "reviewer"]
            and file_record.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you can only access your own file info",
            )

        # Check if file exists on disk
        file_exists = Path(file_record.filepath).exists()

        return {
            "id": file_record.id,
            "filename": file_record.filename,
            "file_size": file_record.file_size,
            "file_type": file_record.file_type,
            "uploaded_at": file_record.uploaded_at,
            "processing_status": file_record.processing_status,
            "checklist_id": file_record.checklist_id,
            "user_id": file_record.user_id,
            "file_exists": file_exists,
            "download_url": f"/api/v1/files/{file_id}/download",
            "view_url": f"/api/v1/files/{file_id}/view",
            "stream_url": f"/api/v1/files/{file_id}/stream",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting file info {file_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting file information",
        )


@router.get("/{file_id}/ai-analysis")
async def get_file_ai_analysis(
    file_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_role(["admin", "auditor", "reviewer"])),
):
    """
    Get AI analysis results for a specific file upload.

    Requires admin, auditor, or reviewer role.
    Users can only access analysis for files they uploaded or if they have admin/reviewer privileges.
    """
    try:
        # Get file record from database
        file_record = db.exec(select(FileUpload).where(FileUpload.id == file_id)).first()

        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Check permissions
        if (
            current_user.role not in ["admin", "reviewer"]
            and file_record.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you can only access analysis for your own files",
            )

        # Get AI analysis results for this file
        ai_results = db.exec(select(AIResult).where(AIResult.file_upload_id == file_id)).all()

        if not ai_results:
            return {
                "file_id": file_id,
                "filename": file_record.filename,
                "has_analysis": False,
                "message": "No AI analysis results found for this file",
            }

        # Get the latest analysis result (in case there are multiple)
        latest_result = max(ai_results, key=lambda x: x.created_at)

        # Parse analysis metadata if it exists
        analysis_metadata = None
        if latest_result.analysis_metadata:
            try:
                import json

                analysis_metadata = json.loads(latest_result.analysis_metadata)
            except (json.JSONDecodeError, TypeError):
                analysis_metadata = None

        return {
            "file_id": file_id,
            "filename": file_record.filename,
            "has_analysis": True,
            "analysis": {
                "id": latest_result.id,
                "overall_score": latest_result.score,
                "score": latest_result.score,  # Alias for compatibility
                "analysis": latest_result.feedback,
                "feedback": latest_result.feedback,  # Alias for compatibility
                "raw_text": latest_result.raw_text,
                "processing_time_ms": latest_result.processing_time_ms,
                "ai_model_version": latest_result.ai_model_version,
                "analysis_metadata": analysis_metadata,
                "created_at": latest_result.created_at,
                "status": "completed",
            },
            "file_info": {
                "checklist_id": file_record.checklist_id,
                "user_id": file_record.user_id,
                "uploaded_at": file_record.uploaded_at,
                "processing_status": file_record.processing_status,
                "file_size": file_record.file_size,
                "file_type": file_record.file_type,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting AI analysis for file {file_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error getting AI analysis"
        )
