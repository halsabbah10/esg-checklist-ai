#!/usr/bin/env python3
"""
Simple server runner for ESG Checklist AI FastAPI application
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting ESG Checklist AI server...")
    print("📋 Swagger UI will be available at: http://localhost:8000/docs")
    print("📄 ReDoc will be available at: http://localhost:8000/redoc")
    print("❤️  Health check at: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the server")
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
