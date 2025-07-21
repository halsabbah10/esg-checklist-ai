"""
Audit trail service for tracking system operations and maintaining compliance
This service works alongside existing functionality to provide comprehensive audit logging
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..database import get_session
from ..models import AuditTrail, AnalysisHistory, EmailNotificationLog, PerformanceMetrics

logger = logging.getLogger(__name__)


class AuditService:
    """Service for managing audit trails and operational logging"""

    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> int:
        """
        Log an action to the audit trail
        
        Args:
            action: Action performed (create, update, delete, analyze, export, email)
            entity_type: Type of entity affected (analysis, checklist, user, file)
            entity_id: ID of the affected entity
            user_id: ID of the user who performed the action
            old_values: Previous values (for updates)
            new_values: New values (for creates/updates)
            metadata: Additional context information
            ip_address: Client IP address
            user_agent: Client user agent
            session_id: Session identifier
            
        Returns:
            ID of the created audit trail entry
        """
        try:
            audit_entry = AuditTrail(
                timestamp=datetime.now(timezone.utc),
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                old_values=json.dumps(old_values) if old_values else None,
                new_values=json.dumps(new_values) if new_values else None,
                audit_metadata=json.dumps(metadata) if metadata else None,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id
            )
            
            self.db.add(audit_entry)
            self.db.commit()
            self.db.refresh(audit_entry)
            
            logger.info(f"Audit trail entry created: {action} on {entity_type} {entity_id}")
            return audit_entry.id
            
        except Exception as e:
            logger.error(f"Failed to create audit trail entry: {e}")
            self.db.rollback()
            raise

    def log_analysis_start(
        self,
        user_id: Optional[int],
        filename: str,
        file_path: Optional[str] = None,
        file_size: Optional[int] = None,
        file_hash: Optional[str] = None,
        ai_provider: str = "gemini",
        model_version: Optional[str] = None,
        department_context: Optional[str] = None
    ) -> int:
        """
        Log the start of an analysis operation
        
        Returns:
            ID of the created analysis history entry
        """
        try:
            analysis_history = AnalysisHistory(
                user_id=user_id,
                filename=filename,
                file_path=file_path,
                file_size=file_size,
                file_hash=file_hash,
                ai_provider=ai_provider,
                model_version=model_version,
                department_context=department_context,
                status="started",
                processing_start=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(analysis_history)
            self.db.commit()
            self.db.refresh(analysis_history)
            
            logger.info(f"Analysis history started for file: {filename}")
            return analysis_history.id
            
        except Exception as e:
            logger.error(f"Failed to log analysis start: {e}")
            self.db.rollback()
            raise

    def update_analysis_progress(
        self,
        analysis_history_id: int,
        status: str,
        analysis_result_id: Optional[int] = None,
        overall_score: Optional[float] = None,
        questions_detected: Optional[int] = None,
        completion_rate: Optional[float] = None,
        quality_score: Optional[float] = None,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None
    ):
        """Update analysis progress and results"""
        try:
            analysis_history = self.db.query(AnalysisHistory).filter(
                AnalysisHistory.id == analysis_history_id
            ).first()
            
            if not analysis_history:
                logger.warning(f"Analysis history {analysis_history_id} not found")
                return
            
            # Update fields
            analysis_history.status = status
            analysis_history.updated_at = datetime.now(timezone.utc)
            
            if analysis_result_id is not None:
                analysis_history.analysis_result_id = analysis_result_id
            if overall_score is not None:
                analysis_history.overall_score = overall_score
            if questions_detected is not None:
                analysis_history.questions_detected = questions_detected
            if completion_rate is not None:
                analysis_history.completion_rate = completion_rate
            if quality_score is not None:
                analysis_history.quality_score = quality_score
            if error_message is not None:
                analysis_history.error_message = error_message
            if error_type is not None:
                analysis_history.error_type = error_type
            
            # Set end time if completed or failed
            if status in ["completed", "failed"]:
                analysis_history.processing_end = datetime.now(timezone.utc)
                if analysis_history.processing_start:
                    duration = analysis_history.processing_end - analysis_history.processing_start
                    analysis_history.processing_duration_ms = int(duration.total_seconds() * 1000)
            
            self.db.commit()
            logger.info(f"Analysis history {analysis_history_id} updated to status: {status}")
            
        except Exception as e:
            logger.error(f"Failed to update analysis progress: {e}")
            self.db.rollback()
            raise

    def log_email_notification(
        self,
        notification_type: str,
        to_emails: List[str],
        subject: str,
        analysis_id: Optional[int] = None,
        template_used: Optional[str] = None,
        has_attachments: bool = False,
        attachment_count: int = 0,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        smtp_server: Optional[str] = None,
        message_id: Optional[str] = None
    ) -> int:
        """
        Log email notification attempts and results
        
        Returns:
            ID of the created email log entry
        """
        try:
            email_log = EmailNotificationLog(
                analysis_id=analysis_id,
                notification_type=notification_type,
                to_emails=json.dumps(to_emails),
                cc_emails=json.dumps(cc_emails) if cc_emails else None,
                bcc_emails=json.dumps(bcc_emails) if bcc_emails else None,
                subject=subject,
                template_used=template_used,
                has_attachments=has_attachments,
                attachment_count=attachment_count,
                status="sent",  # Will be updated if delivery fails
                sent_at=datetime.now(timezone.utc),
                smtp_server=smtp_server,
                message_id=message_id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(email_log)
            self.db.commit()
            self.db.refresh(email_log)
            
            logger.info(f"Email notification logged: {notification_type} to {len(to_emails)} recipients")
            return email_log.id
            
        except Exception as e:
            logger.error(f"Failed to log email notification: {e}")
            self.db.rollback()
            raise

    def update_email_status(
        self,
        email_log_id: int,
        status: str,
        error_message: Optional[str] = None,
        delivered_at: Optional[datetime] = None
    ):
        """Update email delivery status"""
        try:
            email_log = self.db.query(EmailNotificationLog).filter(
                EmailNotificationLog.id == email_log_id
            ).first()
            
            if not email_log:
                logger.warning(f"Email log {email_log_id} not found")
                return
            
            email_log.status = status
            if error_message:
                email_log.error_message = error_message
            if delivered_at:
                email_log.delivered_at = delivered_at
            
            self.db.commit()
            logger.info(f"Email log {email_log_id} status updated to: {status}")
            
        except Exception as e:
            logger.error(f"Failed to update email status: {e}")
            self.db.rollback()
            raise

    def log_performance_metric(
        self,
        metric_type: str,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        user_id: Optional[int] = None,
        duration_ms: Optional[int] = None,
        file_size_bytes: Optional[int] = None,
        questions_processed: Optional[int] = None,
        cpu_usage_percent: Optional[float] = None,
        memory_usage_mb: Optional[float] = None,
        status_code: Optional[int] = None,
        error_occurred: bool = False,
        error_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Log performance metrics for monitoring and optimization
        
        Returns:
            ID of the created performance metric entry
        """
        try:
            metric = PerformanceMetrics(
                timestamp=datetime.now(timezone.utc),
                metric_type=metric_type,
                endpoint=endpoint,
                method=method,
                user_id=user_id,
                duration_ms=duration_ms,
                file_size_bytes=file_size_bytes,
                questions_processed=questions_processed,
                cpu_usage_percent=cpu_usage_percent,
                memory_usage_mb=memory_usage_mb,
                status_code=status_code,
                error_occurred=error_occurred,
                error_type=error_type,
                performance_metadata=json.dumps(metadata) if metadata else None
            )
            
            self.db.add(metric)
            self.db.commit()
            self.db.refresh(metric)
            
            logger.debug(f"Performance metric logged: {metric_type}")
            return metric.id
            
        except Exception as e:
            logger.error(f"Failed to log performance metric: {e}")
            self.db.rollback()
            raise

    def get_audit_trail(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditTrail]:
        """Query audit trail with filters"""
        try:
            query = self.db.query(AuditTrail)
            
            if entity_type:
                query = query.filter(AuditTrail.entity_type == entity_type)
            if entity_id:
                query = query.filter(AuditTrail.entity_id == entity_id)
            if user_id:
                query = query.filter(AuditTrail.user_id == user_id)
            if action:
                query = query.filter(AuditTrail.action == action)
            if start_date:
                query = query.filter(AuditTrail.timestamp >= start_date)
            if end_date:
                query = query.filter(AuditTrail.timestamp <= end_date)
            
            return query.order_by(AuditTrail.timestamp.desc()).offset(offset).limit(limit).all()
            
        except Exception as e:
            logger.error(f"Failed to query audit trail: {e}")
            raise

    def get_analysis_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get analysis statistics for reporting"""
        try:
            query = self.db.query(AnalysisHistory)
            
            if start_date:
                query = query.filter(AnalysisHistory.created_at >= start_date)
            if end_date:
                query = query.filter(AnalysisHistory.created_at <= end_date)
            
            all_analyses = query.all()
            
            # Calculate statistics
            total_analyses = len(all_analyses)
            completed_analyses = len([a for a in all_analyses if a.status == "completed"])
            failed_analyses = len([a for a in all_analyses if a.status == "failed"])
            
            avg_duration = 0
            if completed_analyses > 0:
                durations = [a.processing_duration_ms for a in all_analyses 
                           if a.processing_duration_ms is not None]
                if durations:
                    avg_duration = sum(durations) / len(durations)
            
            avg_score = 0
            if completed_analyses > 0:
                scores = [a.overall_score for a in all_analyses 
                         if a.overall_score is not None]
                if scores:
                    avg_score = sum(scores) / len(scores)
            
            return {
                "total_analyses": total_analyses,
                "completed_analyses": completed_analyses,
                "failed_analyses": failed_analyses,
                "success_rate": completed_analyses / total_analyses if total_analyses > 0 else 0,
                "average_duration_ms": avg_duration,
                "average_score": avg_score,
                "ai_providers_used": list(set(a.ai_provider for a in all_analyses if a.ai_provider))
            }
            
        except Exception as e:
            logger.error(f"Failed to get analysis statistics: {e}")
            raise


def get_audit_service(db: Session = None) -> AuditService:
    """Get audit service instance with database session"""
    if db is None:
        db = next(get_session())
    return AuditService(db)


# Context manager for automatic audit logging
class AuditContext:
    """Context manager for automatic audit trail logging"""
    
    def __init__(
        self,
        action: str,
        entity_type: str,
        user_id: Optional[int] = None,
        entity_id: Optional[int] = None,
        db: Optional[Session] = None
    ):
        self.action = action
        self.entity_type = entity_type
        self.user_id = user_id
        self.entity_id = entity_id
        self.db = db or next(get_session())
        self.audit_service = AuditService(self.db)
        self.start_time = None
        self.audit_id = None
    
    def __enter__(self):
        self.start_time = datetime.now(timezone.utc)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Log the action with success/failure status
        metadata = {
            "duration_ms": int((datetime.now(timezone.utc) - self.start_time).total_seconds() * 1000),
            "success": exc_type is None
        }
        
        if exc_type:
            metadata["error_type"] = exc_type.__name__
            metadata["error_message"] = str(exc_val)
        
        try:
            self.audit_id = self.audit_service.log_action(
                action=self.action,
                entity_type=self.entity_type,
                entity_id=self.entity_id,
                user_id=self.user_id,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Failed to log audit trail in context manager: {e}")
    
    def add_metadata(self, key: str, value: Any):
        """Add metadata to be logged when context exits"""
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        self._metadata[key] = value