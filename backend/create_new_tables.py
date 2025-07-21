#!/usr/bin/env python3
"""
Create new database tables for the enhanced ESG system
"""

from sqlalchemy import create_engine
from sqlmodel import SQLModel
from app.config import get_settings
from app.models import (
    # Import all models to ensure they're registered
    User, Comment, AuditLog, SystemConfig, SubmissionAnswer, 
    Notification, UserActivity, SystemMetrics, AnalyticsSnapshot,
    RealtimeEvent, ComplianceTracking, FileUpload,
    # New models
    AuditTrail, AnalysisHistory, EmailNotificationLog, 
    SystemConfiguration, PerformanceMetrics
)

def create_new_tables():
    """Create new tables without dropping existing ones"""
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    # This will create only tables that don't exist
    SQLModel.metadata.create_all(engine)
    print("✅ New tables created successfully!")
    
    # List all tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\nTotal tables in database: {len(tables)}")
    print("Tables:", ", ".join(sorted(tables)))

if __name__ == "__main__":
    create_new_tables()