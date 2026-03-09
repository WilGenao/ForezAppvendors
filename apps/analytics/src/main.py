from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import analytics, health
from src.database import engine
from src.models import schemas

app = FastAPI(
    title="ForexBot Analytics",
    description="Analytics service for ForexBot Marketplace",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
