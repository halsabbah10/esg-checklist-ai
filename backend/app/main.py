import logging
import logging.config
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.routers.analytics import router as analytics_router
from app.routers.export import router as export_router
from app.routers.realtime_analytics import router as realtime_analytics_router
from app.routers.uploads import router as uploads_router
from app.utils.audit import router as audit_router

from .config import (
    get_api_prefix,
    get_cors_settings,
    get_log_config,
    get_settings,
    is_production,
    validate_required_settings,
)
from .database import get_db_health, init_database
from .routers import checklists, notifications, reviews, submissions, users
from .routers.admin_checklists import router as admin_checklists_router
from .routers.admin_users import router as admin_users_router

try:
    import psutil  # type: ignore[import-untyped]
except ImportError:
    psutil = None

# Get centralized settings
settings = get_settings()

# Validate configuration and check critical secrets at startup
validate_required_settings()

# Configure logging with centralized configuration
logging.config.dictConfig(get_log_config())
logger = logging.getLogger(__name__)


# Startup secret validation
def validate_startup_secrets():
    """Validate critical secrets at startup"""
    critical_missing = []
    warning_missing = []

    # Check critical secrets
    _check_critical_secrets(critical_missing)

    # Check optional secrets
    _check_optional_secrets(warning_missing)

    # Handle missing secrets
    _handle_missing_secrets(critical_missing, warning_missing)


def _check_critical_secrets(critical_missing: list):
    """Check critical secrets that are required in all environments"""
    if not settings.secret_key:
        critical_missing.append("SECRET_KEY")
    if not settings.database_url:
        critical_missing.append("DATABASE_URL")


def _check_optional_secrets(warning_missing: list):
    """Check optional secrets that are required in production"""
    if settings.enable_ai_features and not settings.gemini_api_key and not settings.openai_api_key:
        warning_missing.append("AI API keys (GEMINI_API_KEY or OPENAI_API_KEY)")

    if settings.enable_email_notifications:
        if not settings.smtp_password:
            warning_missing.append("SMTP_PASSWORD")
        if not settings.smtp_username:
            warning_missing.append("SMTP_USERNAME")


def _handle_missing_secrets(critical_missing: list, warning_missing: list):
    """Handle missing secrets based on environment"""
    # Handle critical missing secrets
    if critical_missing:
        error_msg = f"Critical secrets missing: {', '.join(critical_missing)}"
        logger.error(error_msg)
        if is_production():
            raise RuntimeError(error_msg)
        logger.warning(f"DEV MODE: {error_msg}")

    # Handle warning missing secrets
    if warning_missing:
        warning_msg = f"Optional secrets missing: {', '.join(warning_missing)}"
        if is_production():
            logger.error(warning_msg)
            raise RuntimeError(f"Production deployment requires all secrets: {warning_msg}")
        logger.warning(f"DEV MODE: {warning_msg}")


validate_startup_secrets()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan with centralized configuration"""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}...")
    try:
        init_database()
        logger.info("Application startup completed successfully")
    except Exception:
        logger.exception("Failed to start application")
        raise

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.app_name}...")


# Security middleware for HTTPS redirect and HSTS
async def security_headers_middleware(request: Request, call_next):
    """Add security headers including HSTS and HTTPS redirect"""

    # HTTPS redirect (except in development)
    if is_production() and request.url.scheme != "https":
        # Check if it's not a health check or other exempted endpoint
        exempted_paths = ["/health", "/metrics"]
        if request.url.path not in exempted_paths:
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(https_url), status_code=301)

    response = await call_next(request)

    # Check if this is VS Code Simple Browser
    user_agent = request.headers.get("user-agent", "").lower()
    is_vscode_browser = (
        "vscode" in user_agent
        or "vscodeBrowserReqId" in str(request.url)
        or request.headers.get("x-forwarded-for") == "vscode"
    )

    # Add security headers
    if is_production():
        # HSTS header (1 year, include subdomains)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Additional security headers (relaxed for VS Code Simple Browser)
    if not is_vscode_browser:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy - completely disabled for VS Code Simple Browser
    if not is_vscode_browser:
        if is_production():
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'"
            )
        else:
            # Development: Allow CDN resources for Swagger UI and ReDoc
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
                "https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' "
                "https://cdn.jsdelivr.net https://unpkg.com; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' https://cdn.jsdelivr.net https://unpkg.com; "
                "connect-src 'self' https://cdn.jsdelivr.net; "
                "worker-src 'self' blob:; "
                "child-src 'self'"
            )
    # For VS Code Simple Browser: No CSP at all

    return response


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

# Configure Swagger UI with VS Code Simple Browser compatibility
swagger_ui_parameters = {
    "deepLinking": True,
    "displayRequestDuration": True,
    "docExpansion": "none",
    "operationsSorter": "alpha",
    "filter": True,
    "showExtensions": True,
    "showCommonExtensions": True,
    "tryItOutEnabled": True,
    # VS Code Simple Browser specific settings
    "syntaxHighlight.theme": "agate",
    "supportedSubmitMethods": ["get", "post", "put", "delete", "patch"],
}

app = FastAPI(
    title=settings.app_name,
    description="AI-enhanced system to validate ESG checklist answers and automate reporting",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=f"{api_prefix}/docs" if settings.docs_enabled else None,
    redoc_url=f"{api_prefix}/redoc" if settings.docs_enabled else None,
    openapi_url=f"{api_prefix}/openapi.json" if settings.docs_enabled else None,
    swagger_ui_oauth2_redirect_url=f"{api_prefix}/docs/oauth2-redirect",
    swagger_ui_parameters=swagger_ui_parameters,
)

# Add security middleware
app.middleware("http")(security_headers_middleware)

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
app.include_router(realtime_analytics_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(export_router, prefix=api_prefix)
app.include_router(uploads_router, prefix=api_prefix)

# Admin routers with API versioning
app.include_router(admin_users_router, prefix=api_prefix)
app.include_router(admin_checklists_router, prefix=api_prefix)


# Global exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, _exc):
    """Handle 404 Not Found errors"""
    logger.warning(f"404 error on {request.method} {request.url}")
    return JSONResponse(
        status_code=404,
        content={
            "error": True,
            "message": "Resource not found",
            "status_code": 404,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path),
        },
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
            "path": str(request.url.path),
        },
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
            "path": str(request.url.path),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.exception(f"Unexpected error on {request.method} {request.url}: {exc!s}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path),
        },
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
        if settings.enable_ai_features:
            if not settings.gemini_api_key and not settings.openai_api_key:
                ai_health = "warning - no AI keys configured"
        else:
            ai_health = "disabled"

        # Check file system
        upload_path_exists = Path(settings.upload_path).exists()
        logs_path_exists = Path("logs").exists() if settings.log_file else True

        # System metrics
        if psutil:
            system_metrics = {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage_percent": psutil.disk_usage(".").percent,
            }
        else:
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
                    "logs_directory": "healthy" if logs_path_exists else "warning",
                },
            },
            "metrics": system_metrics,
            "uptime_seconds": time.time() - app_start_time,
        }

        # Determine overall status
        if not db_health:
            health_status["status"] = "unhealthy"
        elif "warning" in ai_health or not upload_path_exists:
            health_status["status"] = "degraded"

    except Exception:
        logger.exception("Health check failed")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": "Health check failed",
        }
    else:
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
        "message": f"{settings.app_name} API",
        "version": settings.app_version,
        "api_version": settings.api_version,
        "environment": settings.environment,
        "docs": f"{api_prefix}/docs" if settings.docs_enabled and not is_production() else None,
        "health": "/health",
        "api_prefix": api_prefix,
    }
