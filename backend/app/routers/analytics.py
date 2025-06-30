from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import select
from datetime import datetime, timedelta
import pandas as pd
import logging
from functools import lru_cache
import hashlib

from app.models import FileUpload, AIResult, Checklist, User
from app.database import get_session
from app.auth import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


# Cache for expensive analytics queries (5 minute TTL)
@lru_cache(maxsize=128)
def _cached_analytics_query(query_hash: str, query_func, *args):
    """Internal caching mechanism for analytics queries"""
    return query_func(*args)


def get_cache_key(endpoint: str, **kwargs) -> str:
    """Generate cache key for analytics queries"""
    # Include timestamp rounded to 5 minutes for cache invalidation
    timestamp = int(datetime.utcnow().timestamp() // 300) * 300
    key_data = f"{endpoint}_{timestamp}_{str(sorted(kwargs.items()))}"
    return hashlib.md5(key_data.encode()).hexdigest()


# 1. Overall stats
@router.get("/overall")
def dashboard_overall(
    current_user=Depends(require_role("admin")), db=Depends(get_session)
):
    # Count queries
    total_uploads = db.exec(select(func.count()).select_from(FileUpload)).one()
    total_users = db.exec(select(func.count()).select_from(User)).one()
    total_checklists = db.exec(select(func.count()).select_from(Checklist)).one()

    # Average score
    avg_score_result = db.exec(select(func.avg(AIResult.score))).one()
    avg_ai_score = avg_score_result if avg_score_result else 0

    return {
        "total_uploads": total_uploads,
        "total_users": total_users,
        "total_checklists": total_checklists,
        "average_ai_score": round(avg_ai_score, 2) if avg_ai_score else None,
    }


# 2. Average AI Score Per Checklist
@router.get("/score-by-checklist")
def score_by_checklist(
    current_user=Depends(require_role("admin")), db=Depends(get_session)
):
    # Using SQLModel select with WHERE clause joins for compatibility
    results = db.exec(
        select(Checklist.title, func.avg(AIResult.score))
        .select_from(Checklist, FileUpload, AIResult)
        .where(Checklist.id == FileUpload.checklist_id)
        .where(FileUpload.id == AIResult.file_upload_id)
        .group_by(Checklist.title)
    ).all()

    return [
        {"checklist": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 3. Average AI Score Per User
@router.get("/score-by-user")
def score_by_user(current_user=Depends(require_role("admin")), db=Depends(get_session)):
    # Using SQLModel select with WHERE clause joins for compatibility
    results = db.exec(
        select(User.username, func.avg(AIResult.score))
        .select_from(User, FileUpload, AIResult)
        .where(User.id == FileUpload.user_id)
        .where(FileUpload.id == AIResult.file_upload_id)
        .group_by(User.username)
    ).all()

    return [
        {"user": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 4. AI Score Trend Over Time (Daily)
@router.get("/score-trend")
def score_trend(
    days: int = 30, current_user=Depends(require_role("admin")), db=Depends(get_session)
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Using SQLModel select for proper parameter binding
    results = db.exec(
        select(func.date(AIResult.created_at), func.avg(AIResult.score))
        .where(AIResult.created_at >= cutoff)
        .group_by(func.date(AIResult.created_at))
        .order_by(func.date(AIResult.created_at))
    ).all()

    return [
        {"date": str(row[0]), "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 5. AI Score Distribution (Histogram)
@router.get("/score-distribution")
def score_distribution(
    current_user=Depends(require_role("admin")), db=Depends(get_session)
):
    # Get all scores
    scores = db.exec(select(AIResult.score)).all()

    if not scores:
        return {}

    # Convert to DataFrame and create histogram
    df = pd.DataFrame(scores, columns=["score"])
    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    hist = (
        pd.cut(df["score"], bins=bins, include_lowest=True).value_counts().sort_index()
    )

    return {str(interval): int(count) for interval, count in hist.items()}


# 6. Leaderboard
@router.get("/leaderboard")
def leaderboard(
    top_n: int = 5, current_user=Depends(require_role("admin")), db=Depends(get_session)
):
    # Using SQLModel select with WHERE clause joins for compatibility
    results = db.exec(
        select(User.username, func.avg(AIResult.score))
        .select_from(User, FileUpload, AIResult)
        .where(User.id == FileUpload.user_id)
        .where(FileUpload.id == AIResult.file_upload_id)
        .group_by(User.username)
        .order_by(func.avg(AIResult.score).desc())
        .limit(top_n)
    ).all()

    return [
        {"user": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]
