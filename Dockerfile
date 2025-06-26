# Multi-stage build for better security and smaller image size
# Build stage
FROM python:3.13-alpine AS builder

# Add security labels
LABEL maintainer="ESG Checklist AI Team" \
    security.scan="enabled" \
    version="1.0.0"

# Set environment variables for build stage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    g++ \
    pkgconfig \
    mariadb-dev \
    musl-dev \
    libffi-dev

# Copy and install requirements
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Production stage
FROM python:3.13-alpine AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/app/.local/bin:$PATH"

# Set work directory
WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache \
    curl \
    mariadb-connector-c

# Create non-root user for security
RUN adduser -D -s /bin/sh app

# Copy installed packages from builder stage
COPY --from=builder /root/.local /home/app/.local

# Copy application code
COPY --chown=app:app backend/ /app/

# Create necessary directories with proper ownership
RUN mkdir -p uploads exports logs && \
    chown -R app:app /app

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
