from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import sys

from app.routes import analyze, metrics, anomalies, snapshots
from app.utils.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Analytics Engine starting up")
    yield
    logger.info("Analytics Engine shutting down")

app = FastAPI(
    title="ForexBot Analytics Engine",
    description="Calculates performance metrics and detects anomalies for Forex trading bots. NOT financial advice.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Only NestJS API
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/analyze", tags=["analysis"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(snapshots.router, prefix="/snapshot", tags=["snapshots"])
app.include_router(anomalies.router, prefix="/detect-anomalies", tags=["anomalies"])

@app.get("/health")
def health(): return {"status": "ok"}
