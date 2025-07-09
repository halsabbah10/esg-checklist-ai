from datetime import timedelta
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)
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
from ..rate_limiting import api_write_rate_limit
from ..schemas import Token, UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserRead)
@api_write_rate_limit
def register(user: UserCreate, request: Request, db: Session = Depends(get_session)):
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
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session),
):
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

    # Set secure httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=24 * 60 * 60,  # 24 hours in seconds
        httponly=True,
        secure=True,  # Only send over HTTPS in production
        samesite="lax",  # CSRF protection
        path="/",
    )

    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_session)):
    """Logout endpoint that clears the authentication cookie"""
    # Verify user is authenticated before logout
    # Check if user is authenticated (ignore if not)
    # Logout should clear cookies regardless of authentication status

    response.delete_cookie(key="access_token", path="/", httponly=True, secure=True, samesite="lax")
    return {"message": "Successfully logged out"}


@router.get("/protected-admin")
def protected_admin_route(current_user: User = Depends(require_role("admin"))):
    return {"message": f"Hello, {current_user.username}! You are an admin."}


@router.get("/me", response_model=UserRead)
def get_current_user_info(request: Request, db: Session = Depends(get_session)):
    """Get current authenticated user information"""
    return get_current_user(request, db)


@router.get("/", response_model=List[UserRead])
def list_users(db: Session = Depends(get_session)):
    """List all users (for debugging)"""
    return db.exec(select(User)).all()
