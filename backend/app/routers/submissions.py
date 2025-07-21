from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.auth import require_role
from app.database import get_session
from app.models import AIResult, Checklist, ChecklistItem, SubmissionAnswer

router = APIRouter(prefix="/submissions", tags=["submissions"])


# Pydantic models for request/response
class AnswerData(BaseModel):
    item_id: int
    answer: str
    score: Optional[int] = None


class SubmissionRequest(BaseModel):
    checklist_id: str
    answers: List[AnswerData]


# REST-style endpoints for frontend compatibility

# Get all submissions (admin and auditor for dashboard)
@router.get("/")
def get_all_submissions(
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),  # Allow auditors for dashboard
):
    """Get all submissions across all checklists with AI scores"""
    # Get submissions with associated AI results for scoring
    from app.models import AIResult, FileUpload
    
    # Get all submission answers
    submission_answers = db.exec(select(SubmissionAnswer)).all()
    
    # Get AI results for potential scoring correlation
    ai_results = db.exec(
        select(AIResult.user_id, AIResult.score, AIResult.created_at, AIResult.file_upload_id)
        .where(AIResult.user_id == current_user.id if current_user.role != "reviewer" else True)
    ).all()
    
    # Create AI score lookup by user
    ai_scores_by_user = {}
    for ai_result in ai_results:
        user_id = ai_result[0]
        score = ai_result[1]
        if user_id not in ai_scores_by_user or ai_result[2] > ai_scores_by_user[user_id]['created_at']:
            ai_scores_by_user[user_id] = {
                'score': score,
                'created_at': ai_result[2],
                'file_upload_id': ai_result[3]
            }
    
    # Group submissions by user and checklist
    submissions_dict = {}
    for submission in submission_answers:
        # Filter by user if auditor (not reviewer)
        if current_user.role == "auditor" and submission.user_id != current_user.id:
            continue
            
        key = (submission.user_id, submission.checklist_id)
        if key not in submissions_dict:
            # Get AI score for this user
            ai_score_data = ai_scores_by_user.get(submission.user_id)
            ai_score = ai_score_data['score'] if ai_score_data else None
            
            submissions_dict[key] = {
                "id": submission.id,  # Use first submission ID as group ID
                "checklist_id": submission.checklist_id,
                "user_id": submission.user_id,
                "status": "approved",  # Default status for dashboard compatibility
                "created_at": submission.submitted_at.isoformat(),
                "updated_at": submission.submitted_at.isoformat(),
                "submitted_at": submission.submitted_at.isoformat(),
                "filename": f"ESG_Checklist_{submission.checklist_id}_User_{submission.user_id}",
                "ai_score": ai_score,  # Include AI score if available
                "answers": []
            }
        submissions_dict[key]["answers"].append({
            "question_id": submission.question_id,
            "answer_text": submission.answer_text,
            "submitted_at": submission.submitted_at.isoformat()
        })
    
    # Return data wrapped in expected format
    return {"data": list(submissions_dict.values())}


# Create submission (POST /submissions/)
@router.post("/")
def create_submission(
    submission: SubmissionRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    """Create a new submission with answers"""
    checklist_id = int(submission.checklist_id)
    
    # Validate checklist exists
    checklist = db.get(Checklist, checklist_id)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    
    # Submit answers
    submission_objs = []
    for answer in submission.answers:
        # Map item_id to question_id for backward compatibility
        question_id = answer.item_id
        answer_text = answer.answer
        
        question = db.get(ChecklistItem, question_id)
        if not question or question.checklist_id != checklist_id:
            raise HTTPException(
                400,
                f"Question ID {question_id} does not belong to checklist {checklist_id}",
            )
        
        submission_obj = SubmissionAnswer(
            checklist_id=checklist_id,
            question_id=question_id,
            user_id=current_user.id,
            answer_text=answer_text,
        )
        db.add(submission_obj)
        submission_objs.append(submission_obj)
    
    db.commit()
    
    # Return the created submission in the expected format
    return {
        "detail": "Submission successful", 
        "id": submission_objs[0].id if submission_objs else None,
        "answers_saved": len(submission_objs),
        "checklist_id": checklist_id,
        "user_id": current_user.id
    }


# Get submissions by checklist
@router.get("/checklist/{checklist_id}")
def get_submissions_by_checklist(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    """Get all submissions for a specific checklist"""
    # Validate checklist exists
    checklist = db.get(Checklist, checklist_id)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    
    submissions = db.exec(
        select(SubmissionAnswer)
        .where(SubmissionAnswer.checklist_id == checklist_id)
    ).all()
    
    # Group submissions by user
    submissions_dict = {}
    for submission in submissions:
        user_id = submission.user_id
        if user_id not in submissions_dict:
            submissions_dict[user_id] = {
                "id": submission.id,  # Use first submission ID as group ID
                "checklist_id": submission.checklist_id,
                "user_id": submission.user_id,
                "submitted_at": submission.submitted_at.isoformat(),
                "answers": []
            }
        submissions_dict[user_id]["answers"].append({
            "question_id": submission.question_id,
            "answer_text": submission.answer_text,
            "submitted_at": submission.submitted_at.isoformat()
        })
    
    return list(submissions_dict.values())


# Get submission by ID - using specific path to avoid conflicts
@router.get("/by-id/{submission_id}")
def get_submission_by_id(
    submission_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    """Get a specific submission by ID"""
    submission = db.get(SubmissionAnswer, submission_id)
    if not submission:
        raise HTTPException(404, "Submission not found")
    
    # Check if user can access this submission (admin or owner)
    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    
    # Get all answers for the same user/checklist combination
    related_answers = db.exec(
        select(SubmissionAnswer)
        .where(SubmissionAnswer.checklist_id == submission.checklist_id)
        .where(SubmissionAnswer.user_id == submission.user_id)
    ).all()
    
    return {
        "id": submission.id,
        "checklist_id": submission.checklist_id,
        "user_id": submission.user_id,
        "submitted_at": submission.submitted_at.isoformat(),
        "answers": [
            {
                "question_id": a.question_id,
                "answer_text": a.answer_text,
                "submitted_at": a.submitted_at.isoformat()
            }
            for a in sorted(related_answers, key=lambda x: x.submitted_at)
        ]
    }


# Legacy endpoints for backward compatibility

# Submit answers for a checklist (bulk submit)
@router.post("/{checklist_id}/submit")
def submit_answers(
    checklist_id: int,
    answers: List[dict],  # Each dict: {"question_id": int, "answer_text": str}
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    # Validate checklist exists
    checklist = db.get(Checklist, checklist_id)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    # Submit answers
    submission_objs = []
    for answer in answers:
        question_id = answer["question_id"]
        answer_text = answer["answer_text"]
        question = db.get(ChecklistItem, question_id)
        if not question or question.checklist_id != checklist_id:
            raise HTTPException(
                400,
                f"Question ID {question_id} does not belong to checklist {checklist_id}",
            )
        submission = SubmissionAnswer(
            checklist_id=checklist_id,
            question_id=question_id,
            user_id=current_user.id,
            answer_text=answer_text,
        )
        db.add(submission)
        submission_objs.append(submission)
    db.commit()
    return {"detail": "Submission successful", "answers_saved": len(submission_objs)}


# Get all answers by user for a checklist
@router.get("/{checklist_id}/user/{user_id}")
def get_user_answers(
    checklist_id: int,
    user_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("admin")),
):
    answers = db.exec(
        select(SubmissionAnswer)
        .where(SubmissionAnswer.checklist_id == checklist_id)
        .where(SubmissionAnswer.user_id == user_id)
    ).all()

    # Sort by submitted_at in Python since SQLModel ordering is having issues
    sorted_answers = sorted(answers, key=lambda x: x.submitted_at)
    return [
        {
            "question_id": a.question_id,
            "answer_text": a.answer_text,
            "submitted_at": a.submitted_at,
        }
        for a in sorted_answers
    ]


# Auditor gets their own answers
@router.get("/{checklist_id}/my-answers")
def get_my_answers(
    checklist_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_role("auditor")),
):
    answers = db.exec(
        select(SubmissionAnswer)
        .where(SubmissionAnswer.checklist_id == checklist_id)
        .where(SubmissionAnswer.user_id == current_user.id)
    ).all()

    # Sort by submitted_at in Python since SQLModel ordering is having issues
    sorted_answers = sorted(answers, key=lambda x: x.submitted_at)
    return [
        {
            "question_id": a.question_id,
            "answer_text": a.answer_text,
            "submitted_at": a.submitted_at,
        }
        for a in sorted_answers
    ]