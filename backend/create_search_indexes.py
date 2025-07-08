#!/usr/bin/env python3
"""
Create optimized database indexes for search performance
Run this script to add missing indexes for better search performance
"""

import sqlite3
from pathlib import Path


def create_search_indexes():
    """Create indexes to optimize search performance"""
    db_path = Path("test.db")
    if not db_path.exists():
        print("Database file not found. Make sure to run this from the backend directory.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Performance indexes for file uploads search
    indexes = [
        # Filename search optimization (case-insensitive)
        "CREATE INDEX IF NOT EXISTS idx_fileupload_filename_lower ON fileupload (LOWER(filename))",
        # Composite index for common search combinations
        "CREATE INDEX IF NOT EXISTS idx_fileupload_composite_search ON fileupload (checklist_id, user_id, uploaded_at DESC)",
        # Status-based searches
        "CREATE INDEX IF NOT EXISTS idx_fileupload_status ON fileupload (status)",

        # AI Results search optimization
        "CREATE INDEX IF NOT EXISTS idx_airesult_model_version_lower ON airesult (LOWER(ai_model_version))",
        "CREATE INDEX IF NOT EXISTS idx_airesult_score ON airesult (score)",
        "CREATE INDEX IF NOT EXISTS idx_airesult_created_at ON airesult (created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_airesult_processing_time ON airesult (processing_time_ms)",

        # Checklist search optimization
        "CREATE INDEX IF NOT EXISTS idx_checklist_title_lower ON checklist (LOWER(title))",
        "CREATE INDEX IF NOT EXISTS idx_checklist_active ON checklist (is_active)",

        # User search optimization
        "CREATE INDEX IF NOT EXISTS idx_user_username_lower ON user (LOWER(username))",
        "CREATE INDEX IF NOT EXISTS idx_user_email_lower ON user (LOWER(email))",

        # Submission search optimization
        "CREATE INDEX IF NOT EXISTS idx_submission_composite ON submissionanswer (checklist_id, user_id, submitted_at DESC)",

        # Cross-table join optimization
        "CREATE INDEX IF NOT EXISTS idx_airesult_file_upload_id ON airesult (file_upload_id)",
        "CREATE INDEX IF NOT EXISTS idx_fileupload_checklist_user ON fileupload (checklist_id, user_id)",
    ]

    print("Creating performance indexes...")
    for idx, sql in enumerate(indexes, 1):
        try:
            cursor.execute(sql)
            print(f"✓ Created index {idx}/{len(indexes)}")
        except sqlite3.Error as e:
            print(f"✗ Failed to create index {idx}: {e}")

    conn.commit()

    # Analyze tables for query planner optimization
    print("\nAnalyzing tables for query optimization...")
    tables = ["fileupload", "airesult", "checklist", "user", "submissionanswer"]
    for table in tables:
        try:
            cursor.execute(f"ANALYZE {table}")
            print(f"✓ Analyzed {table}")
        except sqlite3.Error as e:
            print(f"✗ Failed to analyze {table}: {e}")

    conn.commit()
    conn.close()

    print("\n✅ Database optimization complete!")
    print("Search operations should now be significantly faster.")

if __name__ == "__main__":
    create_search_indexes()
