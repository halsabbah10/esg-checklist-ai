#!/usr/bin/env python3
"""
Performance test for search optimization
"""

import sqlite3
import time
from pathlib import Path


def test_search_performance():
    """Test search performance before and after optimization"""
    db_path = Path("test.db")
    if not db_path.exists():
        print("Database file not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Test queries
    test_queries = [
        # File upload searches
        ("Basic file search", "SELECT * FROM fileupload ORDER BY uploaded_at DESC LIMIT 20"),
        ("Filename search", "SELECT * FROM fileupload WHERE LOWER(filename) LIKE '%esg%' LIMIT 20"),
        ("Status filter", "SELECT * FROM fileupload WHERE status = 'pending' LIMIT 20"),
        ("Composite search", "SELECT * FROM fileupload WHERE checklist_id = 1 AND user_id = 1 ORDER BY uploaded_at DESC LIMIT 20"),

        # AI results searches
        ("AI results by score", "SELECT * FROM airesult WHERE score >= 0.8 ORDER BY created_at DESC LIMIT 20"),
        ("AI model search", "SELECT * FROM airesult WHERE LOWER(ai_model_version) LIKE '%gpt%' LIMIT 20"),

        # Cross-table joins
        ("File uploads with AI results", """
            SELECT f.filename, a.score, a.ai_model_version 
            FROM fileupload f 
            JOIN airesult a ON f.id = a.file_upload_id 
            ORDER BY f.uploaded_at DESC 
            LIMIT 20
        """),
    ]

    print("🔍 Testing search performance...")
    print("=" * 60)

    total_time = 0
    for name, query in test_queries:
        start_time = time.perf_counter()
        try:
            cursor.execute(query)
            results = cursor.fetchall()
            end_time = time.perf_counter()

            query_time = (end_time - start_time) * 1000  # Convert to milliseconds
            total_time += query_time

            print(f"✓ {name}")
            print(f"  Time: {query_time:.2f}ms | Results: {len(results)}")

        except sqlite3.Error as e:
            print(f"✗ {name}: {e}")

    print("=" * 60)
    print(f"📊 Total execution time: {total_time:.2f}ms")
    print(f"📊 Average query time: {total_time/len(test_queries):.2f}ms")

    # Check if indexes exist
    print("\n🔧 Checking search indexes...")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
    indexes = cursor.fetchall()
    print(f"Found {len(indexes)} performance indexes:")
    for idx in indexes:
        print(f"  • {idx[0]}")

    conn.close()

    if total_time < 100:  # Under 100ms total
        print("\n✅ Excellent performance! Search queries are well optimized.")
    elif total_time < 500:
        print("\n🟡 Good performance. Some queries could be further optimized.")
    else:
        print("\n🔴 Performance could be improved. Consider reviewing query patterns.")

if __name__ == "__main__":
    test_search_performance()
