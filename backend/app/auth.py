import logging
import warnings
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, List

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from .config import get_api_prefix, get_security_config, get_settings
from .database import get_session
from .models import User

# Suppress BCrypt version warning (known compatibility issue with passlib)
warnings.filterwarnings("ignore", message=".*bcrypt.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*trapped.*", category=UserWarning)
logging.getLogger("passlib").setLevel(logging.ERROR)

# Get centralized settings
settings = get_settings()
security_config = get_security_config()

# OAuth2 scheme with API versioning
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{get_api_prefix()}/users/login")

# Hashing with centralized configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=security_config["bcrypt_rounds"],
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token using centralized configuration"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=security_config["access_token_expire_minutes"])
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, security_config["secret_key"], algorithm=security_config["algorithm"]
    )


def get_token_from_request(request: Request) -> str:
    """Get token from httpOnly cookie first, fall back to Authorization header"""
    # First try to get token from httpOnly cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    # Fall back to Authorization header token
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]

    # No token found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No authentication token found",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(request: Request, db: Session = Depends(get_session)) -> User:
    """Get current user from JWT token (cookie or header) using centralized configuration"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Get token from cookie or header
        token = get_token_from_request(request)

        payload = jwt.decode(
            token, security_config["secret_key"], algorithms=[security_config["algorithm"]]
        )
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user


# Role constants
class UserRoles:
    AUDITOR = "auditor"
    REVIEWER = "reviewer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

    @classmethod
    def all_roles(cls):
        return [cls.AUDITOR, cls.REVIEWER, cls.ADMIN, cls.SUPER_ADMIN]

    @classmethod
    def get_role_hierarchy(cls):
        """Returns role hierarchy mapping"""
        return {
            cls.AUDITOR: [cls.AUDITOR],
            cls.REVIEWER: [cls.REVIEWER, cls.AUDITOR],
            cls.ADMIN: [cls.ADMIN, cls.REVIEWER, cls.AUDITOR],
            cls.SUPER_ADMIN: [cls.SUPER_ADMIN, cls.ADMIN, cls.REVIEWER, cls.AUDITOR],
        }


def require_role(roles: Union[str, List[str]]):
    """
    Role-based access control with hierarchy support.

    Role hierarchy:
    - super_admin: Full system access (includes all admin capabilities)
    - admin: Full control over system (manage users, checklists, settings)
    - reviewer: Review and manage submissions
    - auditor: Personal work only
    
    Args:
        roles: Single role string or list of role strings
    """
    # Convert single role to list for uniform processing
    if isinstance(roles, str):
        roles = [roles]

    def role_checker(request: Request, db: Session = Depends(get_session)):
        # Get current user using updated authentication
        current_user = get_current_user(request, db)

        # Get role hierarchy from UserRoles class
        role_hierarchy = UserRoles.get_role_hierarchy()

        # Check if user's role has the required permissions
        user_permissions = role_hierarchy.get(current_user.role, [])

        # Check if any of the required roles match user's permissions
        has_permission = any(role in user_permissions for role in roles)
        
        if not has_permission:
            role_names = "/".join(roles)
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires {role_names} role or higher.",
            )
        return current_user

    return role_checker
