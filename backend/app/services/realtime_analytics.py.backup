"""
Real-time Analytics Service
Handles tracking, metrics collection, and real-time dashboard updates
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlmodel import Session, desc, func, select

from app.models import (
    AIResult,
    AnalyticsSnapshot,
    Checklist,
    ComplianceTracking,
    FileUpload,
    RealtimeEvent,
    SystemMetrics,
    User,
    UserActivity,
)

logger = logging.getLogger(__name__)


class RealtimeAnalyticsService:
    """Service for real-time analytics tracking and updates"""

    def __init__(self):
        self.active_sessions = set()
        self.metrics_cache = {}

    # User Activity Tracking

    def track_user_action(
        self,
        db: Session,
        user_id: int,
        action_type: str,
        session_id: str,
        action_details: Optional[Dict[str, Any]] = None,
        resource_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        duration_ms: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        """Track user action for analytics"""
        try:
            activity = UserActivity(
                user_id=user_id,
                session_id=session_id,
                action_type=action_type,
                action_details=json.dumps(action_details) if action_details else None,
                resource_id=resource_id,
                resource_type=resource_type,
                duration_ms=duration_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(activity)
            db.commit()

            # Emit real-time event
            self._emit_realtime_event(
                db=db,
                event_type=f"activity.{action_type}",
                event_data={
                    "user_id": user_id,
                    "action_type": action_type,
                    "resource_id": resource_id,
                    "resource_type": resource_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                user_id=user_id,
                broadcast_channels=["dashboard", "admin"],
            )

            logger.info(f"Tracked user action: {action_type} for user {user_id}")

        except Exception as e:
            logger.exception(f"Failed to track user action: {e}")

    # System Metrics Collection

    def record_metric(
        self,
        db: Session,
        metric_name: str,
        metric_value: float,
        metric_unit: Optional[str] = None,
        category: str = "general",
        additional_data: Optional[Dict[str, Any]] = None,
    ):
        """Record system metric"""
        try:
            metric = SystemMetrics(
                metric_name=metric_name,
                metric_value=metric_value,
                metric_unit=metric_unit,
                category=category,
                additional_data=json.dumps(additional_data) if additional_data else None,
            )
            db.add(metric)
            db.commit()

            # Update metrics cache
            self.metrics_cache[metric_name] = {
                "value": metric_value,
                "unit": metric_unit,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Emit real-time event for critical metrics
            if category in ["performance", "ai", "compliance"]:
                self._emit_realtime_event(
                    db=db,
                    event_type="metric.updated",
                    event_data={
                        "metric_name": metric_name,
                        "metric_value": metric_value,
                        "category": category,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                    broadcast_channels=["dashboard", "admin"],
                )

        except Exception as e:
            logger.exception(f"Failed to record metric {metric_name}: {e}")

    # Real-time Dashboard Updates

    def get_realtime_dashboard_data(self, db: Session) -> Dict[str, Any]:
        """Get current dashboard data for real-time updates"""
        try:
            # Get current metrics
            total_users = db.exec(select(func.count()).select_from(User)).one()
            total_uploads = db.exec(select(func.count()).select_from(FileUpload)).one()
            total_checklists = db.exec(select(func.count()).select_from(Checklist)).one()

            # Get average AI score
            avg_score = db.exec(select(func.avg(AIResult.score))).one()

            # Get active users (last 24 hours)
            yesterday = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            active_users = db.exec(
                select(func.count(func.distinct(UserActivity.user_id))).where(
                    UserActivity.timestamp >= yesterday
                )
            ).one()

            # Get recent uploads (last 24 hours)
            recent_uploads = db.exec(
                select(func.count())
                .select_from(FileUpload)
                .where(FileUpload.uploaded_at >= yesterday)
            ).one()

            # Get recent activities
            recent_activities = db.exec(
                select(UserActivity).order_by(desc(UserActivity.timestamp)).limit(10)
            ).all()

            return {
                "overview": {
                    "total_users": total_users,
                    "total_uploads": total_uploads,
                    "total_checklists": total_checklists,
                    "average_ai_score": round(avg_score, 3) if avg_score else 0,
                    "active_users_24h": active_users,
                    "uploads_24h": recent_uploads,
                },
                "recent_activities": [
                    {
                        "id": activity.id,
                        "action_type": activity.action_type,
                        "timestamp": activity.timestamp.isoformat(),
                        "user_id": activity.user_id,
                        "resource_type": activity.resource_type,
                        "resource_id": activity.resource_id,
                    }
                    for activity in recent_activities
                ],
                "metrics_cache": self.metrics_cache,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            logger.exception(f"Failed to get dashboard data: {e}")
            return {"error": str(e)}

    # Compliance Tracking

    def track_compliance_update(
        self,
        db: Session,
        checklist_id: int,
        file_upload_id: Optional[int],
        compliance_score: float,
        environmental_score: Optional[float] = None,
        social_score: Optional[float] = None,
        governance_score: Optional[float] = None,
        risk_level: str = "Medium",
        compliance_gaps: Optional[List[str]] = None,
        recommendations: Optional[List[str]] = None,
        auditor_notes: Optional[str] = None,
    ):
        """Track compliance metrics for analytics"""
        try:
            compliance = ComplianceTracking(
                checklist_id=checklist_id,
                file_upload_id=file_upload_id,
                compliance_score=compliance_score,
                environmental_score=environmental_score,
                social_score=social_score,
                governance_score=governance_score,
                risk_level=risk_level,
                compliance_gaps=json.dumps(compliance_gaps) if compliance_gaps else None,
                recommendations=json.dumps(recommendations) if recommendations else None,
                auditor_notes=auditor_notes,
            )
            db.add(compliance)
            db.commit()

            # Emit real-time compliance update
            self._emit_realtime_event(
                db=db,
                event_type="compliance.updated",
                event_data={
                    "checklist_id": checklist_id,
                    "compliance_score": compliance_score,
                    "risk_level": risk_level,
                    "esg_scores": {
                        "environmental": environmental_score,
                        "social": social_score,
                        "governance": governance_score,
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                broadcast_channels=["dashboard", "compliance", "admin"],
            )

            logger.info(f"Tracked compliance update for checklist {checklist_id}")

        except Exception as e:
            logger.exception(f"Failed to track compliance: {e}")

    # Analytics Snapshots

    def create_analytics_snapshot(self, db: Session, snapshot_type: str = "hourly"):
        """Create analytics snapshot for historical tracking"""
        try:
            # Calculate current metrics
            total_users = db.exec(select(func.count()).select_from(User)).one()
            total_uploads = db.exec(select(func.count()).select_from(FileUpload)).one()
            total_checklists = db.exec(select(func.count()).select_from(Checklist)).one()

            # 24-hour metrics
            yesterday = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

            active_users_24h = db.exec(
                select(func.count(func.distinct(UserActivity.user_id))).where(
                    UserActivity.timestamp >= yesterday
                )
            ).one()

            uploads_24h = db.exec(
                select(func.count())
                .select_from(FileUpload)
                .where(FileUpload.uploaded_at >= yesterday)
            ).one()

            ai_processing_24h = db.exec(
                select(func.count()).select_from(AIResult).where(AIResult.created_at >= yesterday)
            ).one()

            avg_ai_score = db.exec(select(func.avg(AIResult.score))).one()

            # Calculate average processing time from recent activities
            avg_processing_time = db.exec(
                select(func.avg(UserActivity.duration_ms))
                .where(UserActivity.action_type == "ai_processing")
                .where(UserActivity.timestamp >= yesterday)
            ).one()

            snapshot = AnalyticsSnapshot(
                snapshot_type=snapshot_type,
                total_users=total_users,
                active_users_24h=active_users_24h,
                total_uploads=total_uploads,
                uploads_24h=uploads_24h,
                total_checklists=total_checklists,
                avg_ai_score=avg_ai_score,
                ai_processing_count_24h=ai_processing_24h,
                avg_processing_time_ms=avg_processing_time,
                system_health_score=self._calculate_system_health(db),
            )

            db.add(snapshot)
            db.commit()

            logger.info(f"Created {snapshot_type} analytics snapshot")

        except Exception as e:
            logger.exception(f"Failed to create analytics snapshot: {e}")

    # Helper Methods

    def _emit_realtime_event(
        self,
        db: Session,
        event_type: str,
        event_data: Dict[str, Any],
        user_id: Optional[int] = None,
        broadcast_channels: Optional[List[str]] = None,
    ):
        """Emit real-time event for dashboard updates"""
        try:
            event = RealtimeEvent(
                event_type=event_type,
                event_data=json.dumps(event_data),
                user_id=user_id,
                broadcast_channels=",".join(broadcast_channels) if broadcast_channels else None,
            )
            db.add(event)
            db.commit()

            # TODO: Implement WebSocket broadcasting here
            # This would connect to WebSocket manager to push updates

        except Exception as e:
            logger.exception(f"Failed to emit real-time event: {e}")

    def _calculate_system_health(self, db: Session) -> float:
        """Calculate overall system health score"""
        try:
            # Simple health calculation based on recent activity
            recent_errors = db.exec(
                select(func.count())
                .select_from(UserActivity)
                .where(func.lower(UserActivity.action_type).contains("error"))
                .where(
                    UserActivity.timestamp
                    >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                )
            ).one()

            total_activities = db.exec(
                select(func.count())
                .select_from(UserActivity)
                .where(
                    UserActivity.timestamp
                    >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                )
            ).one()

            if total_activities == 0:
                return 1.0

            error_rate = recent_errors / total_activities
            health_score = max(0.0, 1.0 - error_rate)

            return round(health_score, 3)

        except Exception as e:
            logger.exception(f"Failed to calculate system health: {e}")
            return 0.5


# Global service instance
realtime_analytics = RealtimeAnalyticsService()


# Convenience functions for tracking common actions


def track_file_upload(
    db: Session,
    user_id: int,
    session_id: str,
    file_id: int,
    filename: str,
    processing_time_ms: Optional[int] = None,
):
    """Track file upload action"""
    realtime_analytics.track_user_action(
        db=db,
        user_id=user_id,
        session_id=session_id,
        action_type="file_upload",
        action_details={"filename": filename, "processing_time_ms": processing_time_ms},
        resource_id=file_id,
        resource_type="file",
        duration_ms=processing_time_ms,
    )


def track_ai_processing(
    db: Session,
    user_id: int,
    session_id: str,
    file_id: int,
    ai_score: float,
    processing_time_ms: int,
):
    """Track AI processing completion"""
    realtime_analytics.track_user_action(
        db=db,
        user_id=user_id,
        session_id=session_id,
        action_type="ai_processing",
        action_details={"ai_score": ai_score, "processing_time_ms": processing_time_ms},
        resource_id=file_id,
        resource_type="ai_result",
        duration_ms=processing_time_ms,
    )

    # Record AI performance metrics
    realtime_analytics.record_metric(
        db=db,
        metric_name="ai_processing_time",
        metric_value=processing_time_ms,
        metric_unit="milliseconds",
        category="ai",
    )

    realtime_analytics.record_metric(
        db=db,
        metric_name="ai_score",
        metric_value=ai_score,
        metric_unit="score",
        category="ai",
    )


def track_user_login(db: Session, user_id: int, session_id: str, ip_address: str):
    """Track user login"""
    realtime_analytics.track_user_action(
        db=db,
        user_id=user_id,
        session_id=session_id,
        action_type="user_login",
        ip_address=ip_address,
    )


def track_checklist_access(
    db: Session, user_id: int, session_id: str, checklist_id: int, action: str
):
    """Track checklist access (view, edit, submit)"""
    realtime_analytics.track_user_action(
        db=db,
        user_id=user_id,
        session_id=session_id,
        action_type=f"checklist_{action}",
        resource_id=checklist_id,
        resource_type="checklist",
    )
