"""
Real-time Analytics API Endpoints
Enhanced analytics with real-time capabilities, action tracking, and live dashboard updates
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlmodel import Session, desc, select

from app.auth import get_current_user, require_role
from app.database import get_session
from app.models import (
    AnalyticsSnapshot,
    ComplianceTracking,
    RealtimeEvent,
    SystemMetrics,
    User,
    UserActivity,
)
from app.services.realtime_analytics import realtime_analytics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/realtime-analytics", tags=["realtime-analytics"])


# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        logger.info(f"Client connected to channel: {channel}")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)
            logger.info(f"Client disconnected from channel: {channel}")

    async def broadcast_to_channel(self, channel: str, message: dict):
        if channel not in self.active_connections:
            return

        connections = self.active_connections[channel].copy()
        if not connections:
            return

        # Send to all connections concurrently
        tasks = [connection.send_json(message) for connection in connections]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Remove connections that failed
        dead_connections = [
            conn for conn, result in zip(connections, results) if isinstance(result, Exception)
        ]

        if dead_connections:
            for dead in dead_connections:
                if dead in self.active_connections[channel]:
                    self.active_connections[channel].remove(dead)


manager = ConnectionManager()


# WebSocket endpoint for real-time updates
@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            _ = await websocket.receive_text()
            # Echo back or handle client messages if needed
            await websocket.send_json({"type": "pong", "channel": channel})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


# Real-time dashboard data
@router.get("/dashboard")
async def get_realtime_dashboard(
    current_user=Depends(require_role("admin")), db: Session = Depends(get_session)
):
    """Get real-time dashboard data"""
    try:
        dashboard_data = realtime_analytics.get_realtime_dashboard_data(db)

        # Add real-time enhancements
        dashboard_data.update(
            {
                "system_status": "online",
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "active_sessions": len(realtime_analytics.active_sessions),
            }
        )

        return dashboard_data

    except Exception as e:
        logger.exception("Failed to get realtime dashboard data")
        raise HTTPException(status_code=500, detail=str(e))


# Live metrics endpoint
@router.get("/metrics/live")
async def get_live_metrics(
    category: Optional[str] = None,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Get live system metrics"""
    try:
        query: Any = select(SystemMetrics).order_by(desc(SystemMetrics.timestamp)).limit(50)

        if category:
            query = query.where(SystemMetrics.category == category)

        metrics = db.exec(query).all()

        return {
            "metrics": [
                {
                    "id": metric.id,
                    "name": metric.metric_name,
                    "value": metric.metric_value,
                    "unit": metric.metric_unit,
                    "category": metric.category,
                    "timestamp": metric.timestamp.isoformat(),
                }
                for metric in metrics
            ],
            "total": len(metrics),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.exception("Failed to get live metrics")
        raise HTTPException(status_code=500, detail=str(e))


# User activity tracking
@router.get("/activity")
async def get_user_activity(
    hours: int = 24,
    user_id: Optional[int] = None,
    action_type: Optional[str] = None,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Get user activity for analytics"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        query: Any = select(UserActivity).where(UserActivity.timestamp >= cutoff)

        if user_id:
            query = query.where(UserActivity.user_id == user_id)
        if action_type:
            query = query.where(UserActivity.action_type == action_type)

        activities = db.exec(query.order_by(desc(UserActivity.timestamp))).all()

        return {
            "activities": [
                {
                    "id": activity.id,
                    "user_id": activity.user_id,
                    "session_id": activity.session_id,
                    "action_type": activity.action_type,
                    "resource_id": activity.resource_id,
                    "resource_type": activity.resource_type,
                    "timestamp": activity.timestamp.isoformat(),
                    "duration_ms": activity.duration_ms,
                    "ip_address": activity.ip_address,
                }
                for activity in activities
            ],
            "total": len(activities),
            "time_range_hours": hours,
        }

    except Exception as e:
        logger.exception("Failed to get user activity")
        raise HTTPException(status_code=500, detail=str(e))


# Compliance tracking endpoint
@router.get("/compliance/trends")
async def get_compliance_trends(
    days: int = 30,
    checklist_id: Optional[int] = None,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Get compliance trends over time"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        query: Any = select(ComplianceTracking).where(ComplianceTracking.timestamp >= cutoff)

        if checklist_id:
            query = query.where(ComplianceTracking.checklist_id == checklist_id)

        compliance_data = db.exec(query.order_by(desc(ComplianceTracking.timestamp))).all()

        return {
            "compliance_trends": [
                {
                    "id": comp.id,
                    "checklist_id": comp.checklist_id,
                    "compliance_score": comp.compliance_score,
                    "environmental_score": comp.environmental_score,
                    "social_score": comp.social_score,
                    "governance_score": comp.governance_score,
                    "risk_level": comp.risk_level,
                    "timestamp": comp.timestamp.isoformat(),
                }
                for comp in compliance_data
            ],
            "total": len(compliance_data),
            "time_range_days": days,
        }

    except Exception as e:
        logger.exception("Failed to get compliance trends")
        raise HTTPException(status_code=500, detail=str(e))


# Real-time events endpoint
@router.get("/events")
async def get_realtime_events(
    limit: int = 100,
    event_type: Optional[str] = None,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Get recent real-time events"""
    try:
        query: Any = (
            select(RealtimeEvent)
            .order_by(desc(RealtimeEvent.event_timestamp))
            .limit(limit)
        )

        if event_type:
            query = query.where(RealtimeEvent.event_type == event_type)

        events = db.exec(query).all()

        return {
            "events": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "event_data": event.event_data,
                    "timestamp": event.event_timestamp.isoformat(),
                    "user_id": event.user_id,
                    "broadcast_channels": event.broadcast_channels,
                    "processed": event.processed,
                }
                for event in events
            ],
            "total": len(events),
        }

    except Exception as e:
        logger.exception("Failed to get realtime events")
        raise HTTPException(status_code=500, detail=str(e))


# Performance metrics
@router.get("/performance")
async def get_performance_metrics(
    current_user=Depends(require_role("admin")), db: Session = Depends(get_session)
):
    """Get system performance metrics"""
    try:
        # Get recent performance metrics
        recent_metrics = db.exec(
            select(SystemMetrics)
            .where(SystemMetrics.category == "performance")
            .order_by(desc(SystemMetrics.timestamp))
            .limit(50)
        ).all()

        # Calculate averages
        ai_processing_times = [
            m.metric_value for m in recent_metrics if m.metric_name == "ai_processing_time"
        ]

        avg_ai_processing = (
            sum(ai_processing_times) / len(ai_processing_times) if ai_processing_times else 0
        )

        # System health
        health_score = realtime_analytics._calculate_system_health(db)

        return {
            "performance_summary": {
                "average_ai_processing_time_ms": round(avg_ai_processing, 2),
                "system_health_score": health_score,
                "total_performance_metrics": len(recent_metrics),
            },
            "recent_metrics": [
                {
                    "name": metric.metric_name,
                    "value": metric.metric_value,
                    "unit": metric.metric_unit,
                    "timestamp": metric.timestamp.isoformat(),
                }
                for metric in recent_metrics[:10]
            ],
        }

    except Exception as e:
        logger.exception("Failed to get performance metrics")
        raise HTTPException(status_code=500, detail=str(e))


# Action tracking endpoint (for middleware to call)
@router.post("/track")
async def track_action(
    request: Request,
    action_data: Dict,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Track user action (called by middleware)"""
    try:
        user_id = current_user.id if current_user else None
        session_id = action_data.get("session_id", "anonymous")
        action_type = action_data.get("action_type", "unknown")

        if user_id:
            realtime_analytics.track_user_action(
                db=db,
                user_id=user_id,
                session_id=session_id,
                action_type=action_type,
                action_details=action_data.get("details"),
                resource_id=action_data.get("resource_id"),
                resource_type=action_data.get("resource_type"),
                duration_ms=action_data.get("duration_ms"),
                ip_address=str(request.client.host) if request.client else "unknown",
                user_agent=request.headers.get("user-agent"),
            )

        return {"status": "tracked", "action_type": action_type}

    except Exception as e:
        logger.exception("Failed to track action")
        return {"status": "error", "message": str(e)}


# Analytics snapshots
@router.get("/snapshots")
async def get_analytics_snapshots(
    snapshot_type: str = "hourly",
    limit: int = 24,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Get analytics snapshots for trending"""
    try:
        snapshots = db.exec(
            select(AnalyticsSnapshot)
            .where(AnalyticsSnapshot.snapshot_type == snapshot_type)
            .order_by(desc(AnalyticsSnapshot.snapshot_timestamp))
            .limit(limit)
        ).all()

        return {
            "snapshots": [
                {
                    "id": snapshot.id,
                    "timestamp": snapshot.snapshot_timestamp.isoformat(),
                    "total_users": snapshot.total_users,
                    "active_users_24h": snapshot.active_users_24h,
                    "total_uploads": snapshot.total_uploads,
                    "uploads_24h": snapshot.uploads_24h,
                    "total_checklists": snapshot.total_checklists,
                    "avg_ai_score": snapshot.avg_ai_score,
                    "ai_processing_count_24h": snapshot.ai_processing_count_24h,
                    "avg_processing_time_ms": snapshot.avg_processing_time_ms,
                    "system_health_score": snapshot.system_health_score,
                }
                for snapshot in reversed(snapshots)  # Chronological order
            ],
            "snapshot_type": snapshot_type,
            "total": len(snapshots),
        }

    except Exception as e:
        logger.exception("Failed to get analytics snapshots")
        raise HTTPException(status_code=500, detail=str(e))


# Trigger snapshot creation
@router.post("/snapshots/create")
async def create_snapshot(
    snapshot_type: str = "manual",
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_session),
):
    """Manually create analytics snapshot"""
    try:
        realtime_analytics.create_analytics_snapshot(db, snapshot_type)
        return {"status": "created", "snapshot_type": snapshot_type}

    except Exception as e:
        logger.exception("Failed to create snapshot")
        raise HTTPException(status_code=500, detail=str(e))
