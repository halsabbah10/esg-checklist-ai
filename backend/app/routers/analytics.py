from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlmodel import select
from datetime import datetime, timedelta
import pandas as pd

from app.models import FileUpload, AIResult, Checklist, User
from app.database import get_session
from app.auth import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"])


# 1. Overall stats
@router.get("/overall")
def dashboard_overall(
    db=Depends(get_session), current_user=Depends(require_role("admin"))
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
    db=Depends(get_session), current_user=Depends(require_role("admin"))
):
    # Using raw SQL for complex joins to avoid type issues
    query = text("""
        SELECT c.title, AVG(a.score) as avg_score
        FROM checklist c
        JOIN fileupload f ON f.checklist_id = c.id
        JOIN airesult a ON a.file_upload_id = f.id
        GROUP BY c.title
    """)

    results = db.exec(query).all()
    return [
        {"checklist": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 3. Average AI Score Per User
@router.get("/score-by-user")
def score_by_user(db=Depends(get_session), current_user=Depends(require_role("admin"))):
    query = text("""
        SELECT u.username, AVG(a.score) as avg_score
        FROM user u
        JOIN fileupload f ON f.user_id = u.id
        JOIN airesult a ON a.file_upload_id = f.id
        GROUP BY u.username
    """)

    results = db.exec(query).all()
    return [
        {"user": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 4. AI Score Trend Over Time (Daily)
@router.get("/score-trend")
def score_trend(
    days: int = 30, db=Depends(get_session), current_user=Depends(require_role("admin"))
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = text("""
        SELECT DATE(created_at) as date, AVG(score) as avg_score
        FROM airesult
        WHERE created_at >= :cutoff
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """)

    results = db.exec(query, {"cutoff": cutoff}).all()
    return [
        {"date": str(row[0]), "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]


# 5. AI Score Distribution (Histogram)
@router.get("/score-distribution")
def score_distribution(
    db=Depends(get_session), current_user=Depends(require_role("admin"))
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
    top_n: int = 5, db=Depends(get_session), current_user=Depends(require_role("admin"))
):
    query = text("""
        SELECT u.username, AVG(a.score) as avg_score
        FROM user u
        JOIN fileupload f ON f.user_id = u.id
        JOIN airesult a ON a.file_upload_id = f.id
        GROUP BY u.username
        ORDER BY avg_score DESC
        LIMIT :top_n
    """)

    results = db.exec(query, {"top_n": top_n}).all()
    return [
        {"user": row[0], "average_score": round(row[1], 2) if row[1] else None}
        for row in results
    ]
