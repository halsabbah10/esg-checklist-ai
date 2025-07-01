"""Upload and file-related schemas."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FileType(str, Enum):
    """File type enumeration."""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    WORD = "word"
    IMAGE = "image"
    OTHER = "other"


class UploadStatus(str, Enum):
    """Upload status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileUploadRequest(BaseModel):
    """File upload request schema."""
    filename: str
    file_type: FileType
    submission_id: Optional[int] = None
    description: Optional[str] = None


class FileUploadResponse(BaseModel):
    """File upload response schema."""
    id: int
    filename: str
    file_type: FileType
    file_size: int
    upload_url: str
    status: UploadStatus
    submission_id: Optional[int] = None
    uploaded_by: int
    created_at: datetime


class FileRead(BaseModel):
    """File information response schema."""
    id: int
    filename: str
    file_type: FileType
    file_size: int
    status: UploadStatus
    submission_id: Optional[int] = None
    uploaded_by: int
    created_at: datetime
    processed_at: Optional[datetime] = None


class FileListResponse(BaseModel):
    """Response schema for file list with pagination."""
    files: List[FileRead]
    total: int
    page: int
    page_size: int


class FileProcessingResult(BaseModel):
    """File processing result schema."""
    file_id: int
    status: UploadStatus
    extracted_data: Optional[dict] = None
    error_message: Optional[str] = None
    processed_at: datetime
