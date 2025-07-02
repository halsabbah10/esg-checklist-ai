"""
Authentication router for ESG Checklist AI application.
Provides secure authentication endpoints with enhanced security features.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.schemas import UserCreate, Token, PasswordChange
import os

router = APIRouter(prefix="/auth", tags=["authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# In-memory token blacklist (use Redis in production)
token_blacklist = set()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return tokens."""
    # For demo purposes, create a simple token
    # In production, validate against database
    if form_data.username == "admin@example.com" and form_data.password == "admin123":
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_token(
            data={"sub": form_data.username, "type": "access"},
            expires_delta=access_token_expires,
        )

        return {"access_token": access_token, "token_type": "bearer"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Logout user by blacklisting token."""
    token_blacklist.add(token)
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_current_user_info(token: str = Depends(oauth2_scheme)):
    """Get current user information."""
    try:
        if token in token_blacklist:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )

        # Return mock user data for demo
        return {
            "id": 1,
            "username": "admin",
            "email": email,
            "role": "admin",
            "is_active": True,
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user."""
    # Simple validation for demo
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    return {"message": "User registered successfully (demo)"}


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange, token: str = Depends(oauth2_scheme)
):
    """Change user password."""
    # Validate new password strength
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )

    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match"
        )

    return {"message": "Password changed successfully (demo)"}


# Background task functions
def log_user_registration(email: str):
    """Log user registration event."""
    print(f"New user registered: {email}")


def send_password_reset_email(email: str, reset_token: str):
    """Send password reset email."""
    print(f"Password reset email sent to: {email}")
    print(f"Reset token: {reset_token}")
