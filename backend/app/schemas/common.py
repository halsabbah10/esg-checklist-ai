"""Common schemas shared across the application."""

from pydantic import BaseModel


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Generic message response schema."""
    message: str


class StatusResponse(BaseModel):
    """Generic status response schema."""
    success: bool
    message: str
