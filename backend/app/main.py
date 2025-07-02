from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

# Import auth router
from .routers.auth import router as auth_router

# Import organized routers
from .routers.api import (
    users_router,
    checklists_router,
    reviews_router,
    analytics_router,
    notifications_router,
)
from .routers.admin import admin_users_router, admin_checklists_router
from .routers.uploads import uploads_router
from .routers.submissions import submissions_router

from .database import engine, get_db_health
from .models import SQLModel
from dotenv import load_dotenv
from app.utils.audit import router as audit_router

# Import security components
from app.security.rate_limiting import RateLimitMiddleware
from app.security.headers import SecurityHeadersMiddleware
from fastapi.middleware.cors import CORSMiddleware

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

# Add security middleware stack
environment = os.getenv("ENVIRONMENT", "development")

# 1. Rate limiting (first to prevent abuse)
app.add_middleware(
    RateLimitMiddleware, default_requests_per_minute=60, enable_redis=True
)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware, environment=environment)

# 3. Enhanced CORS with security
cors_origins = (
    ["http://localhost:3000", "http://127.0.0.1:3000"]
    if environment == "development"
    else []
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
    ],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# 4. Basic host validation (fallback)
allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
if "testserver" not in allowed_hosts:
    allowed_hosts.append("testserver")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

# Include auth router
app.include_router(auth_router)

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
