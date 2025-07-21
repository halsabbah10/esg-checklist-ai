"""
Configuration management service for dynamic system settings
Works alongside existing static configuration to provide runtime configuration management
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..database import get_session
from ..models import SystemConfiguration

logger = logging.getLogger(__name__)


class ConfigurationService:
    """Service for managing dynamic system configuration"""

    def __init__(self, db: Session):
        self.db = db

    def get_configuration(self, config_key: str) -> Optional[Any]:
        """
        Get configuration value by key
        
        Args:
            config_key: Configuration key to retrieve
            
        Returns:
            Configuration value or None if not found
        """
        try:
            config = self.db.query(SystemConfiguration).filter(
                SystemConfiguration.config_key == config_key,
                SystemConfiguration.is_active == True
            ).first()
            
            if config:
                return json.loads(config.config_value)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get configuration for key '{config_key}': {e}")
            return None

    def set_configuration(
        self,
        config_key: str,
        config_value: Any,
        description: Optional[str] = None,
        changed_by: Optional[int] = None,
        change_reason: Optional[str] = None
    ) -> bool:
        """
        Set configuration value
        
        Args:
            config_key: Configuration key
            config_value: Configuration value (will be JSON serialized)
            description: Description of the configuration
            changed_by: User ID who made the change
            change_reason: Reason for the change
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing configuration if it exists
            existing_config = self.db.query(SystemConfiguration).filter(
                SystemConfiguration.config_key == config_key,
                SystemConfiguration.is_active == True
            ).first()
            
            previous_value = None
            if existing_config:
                previous_value = existing_config.config_value
                # Deactivate existing configuration
                existing_config.is_active = False
                existing_config.effective_until = datetime.now(timezone.utc)
            
            # Create new configuration
            new_config = SystemConfiguration(
                config_key=config_key,
                config_value=json.dumps(config_value),
                description=description,
                changed_by=changed_by,
                previous_value=previous_value,
                change_reason=change_reason,
                is_active=True,
                effective_from=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(new_config)
            self.db.commit()
            
            logger.info(f"Configuration updated: {config_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set configuration for key '{config_key}': {e}")
            self.db.rollback()
            return False

    def get_all_configurations(self, include_inactive: bool = False) -> Dict[str, Any]:
        """
        Get all active configurations
        
        Args:
            include_inactive: Whether to include inactive configurations
            
        Returns:
            Dictionary of all configurations
        """
        try:
            query = self.db.query(SystemConfiguration)
            
            if not include_inactive:
                query = query.filter(SystemConfiguration.is_active == True)
            
            configs = query.all()
            
            result = {}
            for config in configs:
                try:
                    result[config.config_key] = {
                        "value": json.loads(config.config_value),
                        "description": config.description,
                        "effective_from": config.effective_from.isoformat() if config.effective_from else None,
                        "effective_until": config.effective_until.isoformat() if config.effective_until else None,
                        "is_active": config.is_active,
                        "changed_by": config.changed_by,
                        "change_reason": config.change_reason
                    }
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in configuration key '{config.config_key}'")
                    continue
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get all configurations: {e}")
            return {}

    def get_configuration_history(self, config_key: str) -> List[Dict[str, Any]]:
        """
        Get configuration change history for a specific key
        
        Args:
            config_key: Configuration key to get history for
            
        Returns:
            List of configuration changes
        """
        try:
            configs = self.db.query(SystemConfiguration).filter(
                SystemConfiguration.config_key == config_key
            ).order_by(SystemConfiguration.created_at.desc()).all()
            
            history = []
            for config in configs:
                try:
                    history.append({
                        "value": json.loads(config.config_value),
                        "description": config.description,
                        "effective_from": config.effective_from.isoformat() if config.effective_from else None,
                        "effective_until": config.effective_until.isoformat() if config.effective_until else None,
                        "is_active": config.is_active,
                        "changed_by": config.changed_by,
                        "change_reason": config.change_reason,
                        "created_at": config.created_at.isoformat() if config.created_at else None
                    })
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in configuration history for key '{config_key}'")
                    continue
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get configuration history for key '{config_key}': {e}")
            return []

    def delete_configuration(
        self,
        config_key: str,
        changed_by: Optional[int] = None,
        change_reason: Optional[str] = None
    ) -> bool:
        """
        Delete (deactivate) a configuration
        
        Args:
            config_key: Configuration key to delete
            changed_by: User ID who made the change
            change_reason: Reason for deletion
            
        Returns:
            True if successful, False otherwise
        """
        try:
            config = self.db.query(SystemConfiguration).filter(
                SystemConfiguration.config_key == config_key,
                SystemConfiguration.is_active == True
            ).first()
            
            if not config:
                logger.warning(f"Configuration key '{config_key}' not found or already inactive")
                return False
            
            config.is_active = False
            config.effective_until = datetime.now(timezone.utc)
            
            # Log the deletion
            deletion_record = SystemConfiguration(
                config_key=f"{config_key}_DELETED",
                config_value=json.dumps({"deleted": True, "original_key": config_key}),
                description=f"Deletion record for {config_key}",
                changed_by=changed_by,
                previous_value=config.config_value,
                change_reason=change_reason or "Configuration deleted",
                is_active=False,
                effective_from=datetime.now(timezone.utc),
                effective_until=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(deletion_record)
            self.db.commit()
            
            logger.info(f"Configuration deleted: {config_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete configuration for key '{config_key}': {e}")
            self.db.rollback()
            return False

    def initialize_default_configurations(self):
        """Initialize default system configurations if they don't exist"""
        try:
            default_configs = {
                "email_notification_settings": {
                    "enabled": True,
                    "default_sender": "ESG Checklist AI System",
                    "retry_attempts": 3,
                    "retry_delay_minutes": 5,
                    "batch_size": 10
                },
                "analysis_settings": {
                    "default_ai_provider": "gemini",
                    "max_file_size_mb": 50,
                    "timeout_minutes": 10,
                    "enable_comment_quality_analysis": True,
                    "min_completion_rate_threshold": 0.7
                },
                "audit_trail_settings": {
                    "enabled": True,
                    "retention_days": 365,
                    "log_performance_metrics": True,
                    "sensitive_data_masking": True
                },
                "reporting_settings": {
                    "default_period_days": 30,
                    "max_report_items": 1000,
                    "cache_duration_minutes": 15,
                    "enable_automated_reports": True
                },
                "security_settings": {
                    "enable_rate_limiting": True,
                    "max_requests_per_minute": 100,
                    "enable_ip_whitelisting": False,
                    "session_timeout_minutes": 60
                }
            }
            
            for key, value in default_configs.items():
                existing = self.get_configuration(key)
                if existing is None:
                    self.set_configuration(
                        config_key=key,
                        config_value=value,
                        description=f"Default system configuration for {key}",
                        change_reason="System initialization"
                    )
                    logger.info(f"Initialized default configuration: {key}")
            
        except Exception as e:
            logger.error(f"Failed to initialize default configurations: {e}")

    def get_email_settings(self) -> Dict[str, Any]:
        """Get email notification settings with defaults"""
        settings = self.get_configuration("email_notification_settings")
        if settings is None:
            return {
                "enabled": True,
                "default_sender": "ESG Checklist AI System",
                "retry_attempts": 3,
                "retry_delay_minutes": 5,
                "batch_size": 10
            }
        return settings

    def get_analysis_settings(self) -> Dict[str, Any]:
        """Get analysis settings with defaults"""
        settings = self.get_configuration("analysis_settings")
        if settings is None:
            return {
                "default_ai_provider": "gemini",
                "max_file_size_mb": 50,
                "timeout_minutes": 10,
                "enable_comment_quality_analysis": True,
                "min_completion_rate_threshold": 0.7
            }
        return settings

    def get_audit_trail_settings(self) -> Dict[str, Any]:
        """Get audit trail settings with defaults"""
        settings = self.get_configuration("audit_trail_settings")
        if settings is None:
            return {
                "enabled": True,
                "retention_days": 365,
                "log_performance_metrics": True,
                "sensitive_data_masking": True
            }
        return settings

    def get_reporting_settings(self) -> Dict[str, Any]:
        """Get reporting settings with defaults"""
        settings = self.get_configuration("reporting_settings")
        if settings is None:
            return {
                "default_period_days": 30,
                "max_report_items": 1000,
                "cache_duration_minutes": 15,
                "enable_automated_reports": True
            }
        return settings

    def get_security_settings(self) -> Dict[str, Any]:
        """Get security settings with defaults"""
        settings = self.get_configuration("security_settings")
        if settings is None:
            return {
                "enable_rate_limiting": True,
                "max_requests_per_minute": 100,
                "enable_ip_whitelisting": False,
                "session_timeout_minutes": 60
            }
        return settings

    def update_email_settings(
        self,
        settings: Dict[str, Any],
        changed_by: Optional[int] = None,
        change_reason: Optional[str] = None
    ) -> bool:
        """Update email notification settings"""
        return self.set_configuration(
            config_key="email_notification_settings",
            config_value=settings,
            description="Email notification configuration",
            changed_by=changed_by,
            change_reason=change_reason or "Email settings updated"
        )

    def update_analysis_settings(
        self,
        settings: Dict[str, Any],
        changed_by: Optional[int] = None,
        change_reason: Optional[str] = None
    ) -> bool:
        """Update analysis settings"""
        return self.set_configuration(
            config_key="analysis_settings",
            config_value=settings,
            description="Analysis configuration",
            changed_by=changed_by,
            change_reason=change_reason or "Analysis settings updated"
        )


def get_configuration_service(db: Session = None) -> ConfigurationService:
    """Get configuration service instance"""
    if db is None:
        db = next(get_session())
    return ConfigurationService(db)