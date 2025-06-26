from sqlmodel import create_engine, Session, text
from fastapi import HTTPException
import os
from dotenv import load_dotenv
import logging

load_dotenv()  # loads variables from .env

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Use DATABASE_URL if provided (supports SQLite, PostgreSQL, MySQL)
    logging.info("Using DATABASE_URL from environment")
else:
    # Fall back to MySQL configuration
    MYSQL_USER = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
    MYSQL_HOST = os.getenv("MYSQL_HOST")
    MYSQL_PORT = os.getenv("MYSQL_PORT")
    MYSQL_DB = os.getenv("MYSQL_DB")

    # Validate required environment variables
    required_vars = [MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB]
    if not all(required_vars):
        raise ValueError(
            "Either DATABASE_URL or all MySQL environment variables must be set: MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB"
        )

    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    logging.info(
        f"Connecting to MySQL database: {MYSQL_DB} on {MYSQL_HOST}:{MYSQL_PORT}"
    )

# Enhanced engine configuration with connection pooling
engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",  # Configurable SQL logging
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),  # Connection pool size
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),  # Max overflow connections
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,  # Recycle connections every hour
)


def get_session():
    """Database session dependency with proper error handling"""
    try:
        with Session(engine) as session:
            yield session
    except Exception as e:
        logging.error(f"Database session error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")


def get_db_health():
    """Check database connectivity for health checks"""
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")
        return False
