from sqlmodel import create_engine, Session, text
from fastapi import HTTPException
import logging
from .config import get_settings, get_database_config

logger = logging.getLogger(__name__)

# Get settings instance
settings = get_settings()
db_config = get_database_config()

# Enhanced engine configuration with centralized settings
engine = create_engine(
    db_config["url"],
    echo=db_config["echo"],
    pool_size=db_config["pool_size"],
    max_overflow=db_config["max_overflow"],
    pool_pre_ping=db_config["pool_pre_ping"],
    pool_recycle=db_config["pool_recycle"],
)

logger.info(f"Database engine configured with URL: {db_config['url']}")


def get_session():
    """Database session dependency with proper error handling"""
    try:
        with Session(engine) as session:
            yield session
    except HTTPException:
        # Re-raise FastAPI HTTPExceptions (like authentication errors)
        raise
    except Exception as e:
        logger.error(f"Database session error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


def get_db_health():
    """Check database connectivity for health checks"""
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


def init_database():
    """Initialize database with proper error handling"""
    try:
        # Import models to ensure they are registered with SQLModel
        from sqlmodel import SQLModel
        from . import models  # Import models module
        
        logger.info("Creating database tables...")
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
