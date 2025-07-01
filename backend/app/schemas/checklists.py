"""Checklist and checklist item schemas."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChecklistItemCreate(BaseModel):
    """Checklist item creation schema."""

    question_text: str
    weight: Optional[float] = None
    category: Optional[str] = None
    is_required: Optional[bool] = True


class ChecklistItemRead(BaseModel):
    """Checklist item response schema."""

    id: int
    question_text: str
    weight: Optional[float]
    category: Optional[str]
    is_required: Optional[bool] = True
    created_at: Optional[datetime] = None


class ChecklistItemUpdate(BaseModel):
    """Checklist item update schema."""

    question_text: Optional[str] = None
    weight: Optional[float] = None
    category: Optional[str] = None
    is_required: Optional[bool] = None


class ChecklistCreate(BaseModel):
    """Checklist creation schema."""

    title: str
    description: Optional[str] = None
    items: List[ChecklistItemCreate] = []
    is_template: Optional[bool] = False


class ChecklistRead(BaseModel):
    """Checklist response schema."""

    id: int
    title: str
    description: Optional[str]
    items: List[ChecklistItemRead] = []
    is_template: Optional[bool] = False
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None


class ChecklistUpdate(BaseModel):
    """Checklist update schema."""

    title: Optional[str] = None
    description: Optional[str] = None
    is_template: Optional[bool] = None


# Admin-specific schemas with additional fields
class ChecklistItemCreateAdmin(BaseModel):
    """Admin checklist item creation schema with additional fields."""

    question_text: str
    weight: Optional[float] = None
    category: Optional[str] = None
    is_required: Optional[bool] = True
    help_text: Optional[str] = None
    validation_rules: Optional[str] = None


class ChecklistItemUpdateAdmin(BaseModel):
    """Admin checklist item update schema with additional fields."""

    question_text: Optional[str] = None
    weight: Optional[float] = None
    category: Optional[str] = None
    is_required: Optional[bool] = None
    help_text: Optional[str] = None
    validation_rules: Optional[str] = None
    is_active: Optional[bool] = None


class ChecklistItemReadAdmin(BaseModel):
    """Admin checklist item response schema with additional fields."""

    id: int
    question_text: str
    weight: Optional[float]
    category: Optional[str]
    is_required: Optional[bool] = True
    help_text: Optional[str] = None
    validation_rules: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ChecklistCreateAdmin(BaseModel):
    """Admin checklist creation schema with additional fields."""

    title: str
    description: Optional[str] = None
    items: List[ChecklistItemCreateAdmin] = []
    is_template: Optional[bool] = False
    version: Optional[str] = "1.0"
    tags: Optional[List[str]] = []


class ChecklistUpdateAdmin(BaseModel):
    """Admin checklist update schema with additional fields."""

    title: Optional[str] = None
    description: Optional[str] = None
    is_template: Optional[bool] = None
    version: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ChecklistReadAdmin(BaseModel):
    """Admin checklist response schema with additional fields."""

    id: int
    title: str
    description: Optional[str]
    items: List[ChecklistItemReadAdmin] = []
    is_template: Optional[bool] = False
    version: Optional[str] = "1.0"
    tags: Optional[List[str]] = []
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None


class ChecklistListResponse(BaseModel):
    """Response schema for checklist list with pagination."""

    checklists: List[ChecklistReadAdmin]
    total: int
    page: int
    page_size: int
