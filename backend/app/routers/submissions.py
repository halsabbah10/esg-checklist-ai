from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import SubmissionAnswer, Checklist, ChecklistItem
from app.database import get_session
from app.auth import require_role
from typing import List

router = APIRouter(prefix="/submissions", tags=["submissions"])


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


# (Optional) Auditor gets their own answers
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
