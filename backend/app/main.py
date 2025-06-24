from fastapi import FastAPI
from contextlib import asynccontextmanager

from .database import engine
from .models import SQLModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (runs once on app startup)
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
