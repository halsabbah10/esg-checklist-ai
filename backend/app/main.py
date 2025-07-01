from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

# Import organized routers
from .routers.api import (
    users_router,
    checklists_router,
    reviews_router,
    analytics_router,
    notifications_router
)
from .routers.admin import (
    admin_users_router,
    admin_checklists_router
)
from .routers.uploads import uploads_router
from .routers.submissions import submissions_router

from .database import engine, get_db_health
from .models import SQLModel
from app.config import get_settings
from dotenv import load_dotenv
from app.utils.audit import router as audit_router
import os
import time
import logging
from datetime import datetime, timezone


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (runs once on app startup)
    logger.info("Starting up ESG Checklist AI application...")
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

    yield

    # Cleanup on shutdown
    logger.info("Shutting down ESG Checklist AI application...")


# Request logging middleware
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Duration: {process_time:.3f}s"
    )

    return response


app = FastAPI(
    title="ESG Checklist AI",
    description="AI-enhanced system to validate ESG checklist answers and automate reporting",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# Add request logging middleware
app.middleware("http")(log_requests)

# Security middleware
allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
# Add testserver for FastAPI TestClient compatibility
if "testserver" not in allowed_hosts:
    allowed_hosts.append("testserver")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(users_router)
app.include_router(checklists_router)
app.include_router(reviews_router)
app.include_router(analytics_router)
app.include_router(notifications_router)

# Include feature routers
app.include_router(submissions_router)
app.include_router(uploads_router)
app.include_router(audit_router)

# Include admin routers
app.include_router(admin_users_router)
app.include_router(admin_checklists_router)


@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    db_healthy = get_db_health()

    health_status = {
        "status": "healthy" if db_healthy else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "checks": {
            "database": "healthy" if db_healthy else "unhealthy",
            "api": "healthy",
        },
    }

    return health_status


@app.get("/metrics")
async def get_metrics():
    """Basic metrics endpoint for monitoring"""
    return {
        "uptime": time.time(),
        "requests_total": "not_implemented",
        "active_connections": "not_implemented",
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "ESG Checklist AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
