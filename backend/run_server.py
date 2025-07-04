#!/usr/bin/env python3
"""
Simple server runner for ESG Checklist AI FastAPI application
"""
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn

    from app.config import get_settings

    # Get centralized settings
    settings = get_settings()

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=(settings.ENV == "development"),
        log_level="info",
    )
