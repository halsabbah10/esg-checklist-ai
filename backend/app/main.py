from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routers import users, checklists
from .database import engine
from .models import SQLModel
from dotenv import load_dotenv
from app.routers.analytics import router as analytics_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (runs once on app startup)
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(users.router)

app.include_router(checklists.router)

app.include_router(analytics_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
