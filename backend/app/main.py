from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlmodel import SQLModel
from .routers import users, checklists, reviews, submissions, notifications
from .routers.admin_users import router as admin_users_router
from .routers.admin_checklists import router as admin_checklists_router
from .database import engine, get_db_health
from dotenv import load_dotenv
from app.routers.analytics import router as analytics_router
from app.utils.audit import router as audit_router
from app.routers.export import router as export_router
import os
import time
import logging
from datetime import datetime, timezone
from app.routers.uploads import router as uploads_router


# Configure comprehensive logging with structured format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/app.log", mode="a") if os.path.exists("logs") or os.makedirs("logs", exist_ok=True) else logging.StreamHandler()
    ]
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

app.include_router(users.router)
app.include_router(checklists.router)
app.include_router(reviews.router)
app.include_router(submissions.router)
app.include_router(notifications.router)
app.include_router(analytics_router)
app.include_router(audit_router)
app.include_router(export_router)
app.include_router(uploads_router)

# Admin routers
app.include_router(admin_users_router)
app.include_router(admin_checklists_router)


# Global exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 Not Found errors"""
    logger.warning(f"404 error on {request.method} {request.url}")
    return JSONResponse(
        status_code=404,
        content={
            "error": True,
            "message": "Resource not found",
            "status_code": 404,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path)
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with detailed logging"""
    logger.error(f"HTTP {exc.status_code} error on {request.method} {request.url}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path)
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logger.error(f"Validation error on {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "Validation error",
            "details": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error on {request.method} {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path)
        }
    )


# Track application start time for uptime calculation
app_start_time = time.time()


@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint with detailed system status
    """
    try:
        # Check database health
        db_health = get_db_health()
        
        # Check AI service availability
        ai_health = "healthy"
        try:
            from app.config import settings
            if not settings.gemini_api_key and not settings.openai_api_key:
                ai_health = "warning - no AI keys configured"
        except Exception:
            ai_health = "warning - AI configuration check failed"
        
        # Check file system
        upload_path_exists = os.path.exists("uploads")
        logs_path_exists = os.path.exists("logs")
        
        # System metrics
        try:
            import psutil
            system_metrics = {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage_percent": psutil.disk_usage('.').percent
            }
        except ImportError:
            system_metrics = {"note": "psutil not available for system metrics"}
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "checks": {
                "database": "healthy" if db_health else "unhealthy",
                "api": "healthy",
                "ai_services": ai_health,
                "file_system": {
                    "uploads_directory": "healthy" if upload_path_exists else "warning",
                    "logs_directory": "healthy" if logs_path_exists else "warning"
                }
            },
            "metrics": system_metrics,
            "uptime_seconds": time.time() - app_start_time
        }
        
        # Determine overall status
        if not db_health:
            health_status["status"] = "unhealthy"
        elif "warning" in ai_health or not upload_path_exists:
            health_status["status"] = "degraded"
            
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


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
