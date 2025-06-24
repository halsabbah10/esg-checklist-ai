from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..models import User
from ..schemas import UserCreate, UserRead, Token, UserLogin
from ..database import get_session
from ..auth import hash_password, verify_password, create_access_token, require_role
from datetime import timedelta

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
def login(form: UserLogin, db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.email == form.email)).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token(
        {"sub": user.email, "role": user.role, "user_id": user.id},
        expires_delta=timedelta(hours=24),
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/protected-admin")
def protected_admin_route(current_user: User = Depends(require_role("admin"))):
    return {"message": f"Hello, {current_user.username}! You are an admin."}
