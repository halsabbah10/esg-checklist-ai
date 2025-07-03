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
from .database import engine, get_db_health, init_database
from .config import (
    get_settings, 
    validate_required_settings, 
    get_log_config, 
    get_cors_settings, 
    get_api_prefix,
    create_directories,
    is_production
)
from app.routers.analytics import router as analytics_router
from app.utils.audit import router as audit_router
from app.routers.export import router as export_router
from app.routers.uploads import router as uploads_router
import time
import logging
from datetime import datetime, timezone
import logging.config

# Get centralized settings
settings = get_settings()

# Validate configuration
validate_required_settings()

# Create necessary directories
create_directories()

# Configure logging with centralized configuration
logging.config.dictConfig(get_log_config())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with centralized configuration"""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}...")
    try:
        init_database()
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.app_name}...")


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


# Get API prefix for versioning
api_prefix = get_api_prefix()

app = FastAPI(
    title=settings.app_name,
    description="AI-enhanced system to validate ESG checklist answers and automate reporting",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=f"{api_prefix}/docs" if settings.docs_enabled and not is_production() else None,
    redoc_url=f"{api_prefix}/redoc" if settings.docs_enabled and not is_production() else None,
    openapi_url=f"{api_prefix}/openapi.json" if settings.docs_enabled else None,
)

# Add request logging middleware
app.middleware("http")(log_requests)

# Security middleware with centralized configuration
allowed_hosts_list = [x.strip() for x in settings.allowed_hosts.split(",")]
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts_list,
)

# CORS middleware with centralized configuration
cors_settings = get_cors_settings()
app.add_middleware(
    CORSMiddleware,
    **cors_settings,
)

# Include routers with API versioning
app.include_router(users.router, prefix=api_prefix)
app.include_router(checklists.router, prefix=api_prefix)
app.include_router(reviews.router, prefix=api_prefix)
app.include_router(submissions.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(export_router, prefix=api_prefix)
app.include_router(uploads_router, prefix=api_prefix)

# Admin routers with API versioning
app.include_router(admin_users_router, prefix=api_prefix)
app.include_router(admin_checklists_router, prefix=api_prefix)


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
    import os
    try:
        # Check database health
        db_health = get_db_health()
        
        # Check AI service availability
        ai_health = "healthy"
        if settings.enable_ai_features:
            if not settings.gemini_api_key and not settings.openai_api_key:
                ai_health = "warning - no AI keys configured"
        else:
            ai_health = "disabled"
        
        # Check file system
        upload_path_exists = os.path.exists(settings.upload_path)
        logs_path_exists = os.path.exists("logs") if settings.log_file else True
        
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
            "version": settings.app_version,
            "environment": settings.environment,
            "api_version": settings.api_version,
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
        "message": f"{settings.app_name} API",
        "version": settings.app_version,
        "api_version": settings.api_version,
        "environment": settings.environment,
        "docs": f"{api_prefix}/docs" if settings.docs_enabled and not is_production() else None,
        "health": "/health",
        "api_prefix": api_prefix,
    }
