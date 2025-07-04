from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from ..database import get_session
from ..models import User
from ..schemas import Token, UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserRead)
def register(user: UserCreate, db: Session = Depends(get_session)):
    existing = db.exec(select(User).where(User.email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    user_obj = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_session)):
    # Try to find user by email first, then by username
    user = db.exec(select(User).where(User.email == form_data.username)).first()
    if not user:
        user = db.exec(select(User).where(User.username == form_data.username)).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(
        {"sub": user.email, "role": user.role, "user_id": user.id},
        expires_delta=timedelta(hours=24),
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/protected-admin")
def protected_admin_route(current_user: User = Depends(require_role("admin"))):
    return {"message": f"Hello, {current_user.username}! You are an admin."}


@router.get("/me", response_model=UserRead)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user


@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_session)):
    """List all users (for debugging)"""
    return db.exec(select(User)).all()
