"""
Configuration management endpoints for dynamic system settings
Provides runtime configuration management alongside existing static configuration
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..database import get_session as get_db
from ..services.configuration_service import get_configuration_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/configuration", tags=["configuration"])


class ConfigurationRequest(BaseModel):
    """Request model for configuration updates"""
    config_key: str
    config_value: Any
    description: Optional[str] = None
    change_reason: Optional[str] = None


class ConfigurationResponse(BaseModel):
    """Response model for configuration operations"""
    success: bool
    message: str
    config_key: Optional[str] = None
    config_value: Optional[Any] = None


@router.get("/", response_model=Dict[str, Any])
async def get_all_configurations(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all system configurations
    
    Args:
        include_inactive: Whether to include inactive configurations
    """
    try:
        config_service = get_configuration_service(db)
        configurations = config_service.get_all_configurations(include_inactive=include_inactive)
        
        return {
            "success": True,
            "configurations": configurations,
            "count": len(configurations)
        }
        
    except Exception as e:
        logger.error(f"Error getting all configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{config_key}")
async def get_configuration(
    config_key: str,
    db: Session = Depends(get_db)
):
    """Get specific configuration by key"""
    try:
        config_service = get_configuration_service(db)
        config_value = config_service.get_configuration(config_key)
        
        if config_value is None:
            raise HTTPException(status_code=404, detail=f"Configuration key '{config_key}' not found")
        
        return {
            "success": True,
            "config_key": config_key,
            "config_value": config_value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting configuration '{config_key}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ConfigurationResponse)
async def set_configuration(
    request: ConfigurationRequest,
    db: Session = Depends(get_db)
):
    """Set or update configuration value"""
    try:
        config_service = get_configuration_service(db)
        
        success = config_service.set_configuration(
            config_key=request.config_key,
            config_value=request.config_value,
            description=request.description,
            change_reason=request.change_reason
        )
        
        if success:
            return ConfigurationResponse(
                success=True,
                message=f"Configuration '{request.config_key}' updated successfully",
                config_key=request.config_key,
                config_value=request.config_value
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to update configuration")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting configuration '{request.config_key}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{config_key}/history")
async def get_configuration_history(
    config_key: str,
    db: Session = Depends(get_db)
):
    """Get configuration change history"""
    try:
        config_service = get_configuration_service(db)
        history = config_service.get_configuration_history(config_key)
        
        return {
            "success": True,
            "config_key": config_key,
            "history": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error getting configuration history for '{config_key}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{config_key}", response_model=ConfigurationResponse)
async def delete_configuration(
    config_key: str,
    change_reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Delete (deactivate) configuration"""
    try:
        config_service = get_configuration_service(db)
        
        success = config_service.delete_configuration(
            config_key=config_key,
            change_reason=change_reason
        )
        
        if success:
            return ConfigurationResponse(
                success=True,
                message=f"Configuration '{config_key}' deleted successfully",
                config_key=config_key
            )
        else:
            raise HTTPException(status_code=404, detail=f"Configuration key '{config_key}' not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting configuration '{config_key}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initialize-defaults", response_model=ConfigurationResponse)
async def initialize_default_configurations(db: Session = Depends(get_db)):
    """Initialize default system configurations"""
    try:
        config_service = get_configuration_service(db)
        config_service.initialize_default_configurations()
        
        return ConfigurationResponse(
            success=True,
            message="Default configurations initialized successfully"
        )
        
    except Exception as e:
        logger.error(f"Error initializing default configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Specific configuration endpoints for common settings

@router.get("/email/settings")
async def get_email_settings(db: Session = Depends(get_db)):
    """Get email notification settings"""
    try:
        config_service = get_configuration_service(db)
        settings = config_service.get_email_settings()
        
        return {
            "success": True,
            "email_settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error getting email settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/email/settings")
async def update_email_settings(
    settings: Dict[str, Any],
    change_reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update email notification settings"""
    try:
        config_service = get_configuration_service(db)
        
        success = config_service.update_email_settings(
            settings=settings,
            change_reason=change_reason
        )
        
        if success:
            return {
                "success": True,
                "message": "Email settings updated successfully",
                "settings": settings
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update email settings")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating email settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/settings")
async def get_analysis_settings(db: Session = Depends(get_db)):
    """Get analysis settings"""
    try:
        config_service = get_configuration_service(db)
        settings = config_service.get_analysis_settings()
        
        return {
            "success": True,
            "analysis_settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error getting analysis settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/analysis/settings")
async def update_analysis_settings(
    settings: Dict[str, Any],
    change_reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update analysis settings"""
    try:
        config_service = get_configuration_service(db)
        
        success = config_service.update_analysis_settings(
            settings=settings,
            change_reason=change_reason
        )
        
        if success:
            return {
                "success": True,
                "message": "Analysis settings updated successfully",
                "settings": settings
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update analysis settings")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating analysis settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/settings")
async def get_audit_trail_settings(db: Session = Depends(get_db)):
    """Get audit trail settings"""
    try:
        config_service = get_configuration_service(db)
        settings = config_service.get_audit_trail_settings()
        
        return {
            "success": True,
            "audit_trail_settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error getting audit trail settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reporting/settings")
async def get_reporting_settings(db: Session = Depends(get_db)):
    """Get reporting settings"""
    try:
        config_service = get_configuration_service(db)
        settings = config_service.get_reporting_settings()
        
        return {
            "success": True,
            "reporting_settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error getting reporting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/security/settings")
async def get_security_settings(db: Session = Depends(get_db)):
    """Get security settings"""
    try:
        config_service = get_configuration_service(db)
        settings = config_service.get_security_settings()
        
        return {
            "success": True,
            "security_settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error getting security settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema")
async def get_configuration_schema():
    """Get configuration schema and available settings"""
    return {
        "configuration_categories": {
            "email_notification_settings": {
                "description": "Email notification configuration",
                "schema": {
                    "enabled": {"type": "boolean", "description": "Enable email notifications"},
                    "default_sender": {"type": "string", "description": "Default sender name"},
                    "retry_attempts": {"type": "integer", "description": "Number of retry attempts"},
                    "retry_delay_minutes": {"type": "integer", "description": "Delay between retries"},
                    "batch_size": {"type": "integer", "description": "Email batch size"}
                }
            },
            "analysis_settings": {
                "description": "Analysis configuration",
                "schema": {
                    "default_ai_provider": {"type": "string", "description": "Default AI provider"},
                    "max_file_size_mb": {"type": "integer", "description": "Maximum file size"},
                    "timeout_minutes": {"type": "integer", "description": "Analysis timeout"},
                    "enable_comment_quality_analysis": {"type": "boolean", "description": "Enable comment analysis"},
                    "min_completion_rate_threshold": {"type": "number", "description": "Minimum completion rate"}
                }
            },
            "audit_trail_settings": {
                "description": "Audit trail configuration",
                "schema": {
                    "enabled": {"type": "boolean", "description": "Enable audit trail"},
                    "retention_days": {"type": "integer", "description": "Data retention period"},
                    "log_performance_metrics": {"type": "boolean", "description": "Log performance data"},
                    "sensitive_data_masking": {"type": "boolean", "description": "Mask sensitive data"}
                }
            },
            "reporting_settings": {
                "description": "Reporting configuration",
                "schema": {
                    "default_period_days": {"type": "integer", "description": "Default reporting period"},
                    "max_report_items": {"type": "integer", "description": "Maximum items per report"},
                    "cache_duration_minutes": {"type": "integer", "description": "Report cache duration"},
                    "enable_automated_reports": {"type": "boolean", "description": "Enable automated reports"}
                }
            },
            "security_settings": {
                "description": "Security configuration",
                "schema": {
                    "enable_rate_limiting": {"type": "boolean", "description": "Enable rate limiting"},
                    "max_requests_per_minute": {"type": "integer", "description": "Rate limit threshold"},
                    "enable_ip_whitelisting": {"type": "boolean", "description": "Enable IP whitelisting"},
                    "session_timeout_minutes": {"type": "integer", "description": "Session timeout"}
                }
            }
        },
        "notes": [
            "All configurations support change tracking and history",
            "Changes take effect immediately unless otherwise specified",
            "Default values are provided for all settings",
            "Configuration changes are logged in the audit trail"
        ]
    }