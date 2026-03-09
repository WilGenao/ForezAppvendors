# apps/analytics/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.routes import analyze, metrics, anomalies, snapshots
from app.utils.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

# FIX: Internal service token — must match INTERNAL_SERVICE_TOKEN in NestJS env
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not INTERNAL_SERVICE_TOKEN:
        logger.warning("INTERNAL_SERVICE_TOKEN not set — analytics engine is unprotected!")
    logger.info("Analytics Engine starting up")
    yield
    logger.info("Analytics Engine shutting down")


app = FastAPI(
    title="ForexBot Analytics Engine",
    description="Calculates performance metrics and detects anomalies for Forex trading bots. NOT financial advice.",
    version="1.0.0",
    lifespan=lifespan,
    # FIX: Disable docs in production — internal service should not expose Swagger publicly
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None,
)

# FIX: Restrict CORS — only NestJS API can call this service
# allow_headers was "*" before — now explicitly limited
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://api:3001", "http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Internal-Token"],
)


# FIX NEW: Internal token middleware — all routes require the shared secret
# This prevents direct access to the analytics engine bypassing NestJS auth
@app.middleware("http")
async def verify_internal_token(request: Request, call_next):
    # Skip health check — used by Docker healthcheck without token
    if request.url.path == "/health":
        return await call_next(request)

    # In development without token set, allow through (for local testing)
    if not INTERNAL_SERVICE_TOKEN:
        return await call_next(request)

    token = request.headers.get("X-Internal-Token")
    if token != INTERNAL_SERVICE_TOKEN:
        logger.warning(
            f"Unauthorized analytics access attempt from {request.client.host} path={request.url.path}"
        )
        raise HTTPException(status_code=403, detail="Forbidden")

    return await call_next(request)


app.include_router(analyze.router, prefix="/analyze", tags=["analysis"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(snapshots.router, prefix="/snapshot", tags=["snapshots"])
app.include_router(anomalies.router, prefix="/detect-anomalies", tags=["anomalies"])


@app.get("/health")
def health():
    return {"status": "ok"}
