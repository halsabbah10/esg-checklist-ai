from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from .routers import users, checklists
from .database import engine
from .models import SQLModel
from dotenv import load_dotenv
from app.routers.analytics import router as analytics_router
import os

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (runs once on app startup)
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(
    title="ESG Checklist AI",
    description="AI-enhanced system to validate ESG checklist answers and automate reporting",
    version="1.0.0",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(checklists.router)
app.include_router(analytics_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
