import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog

# ─── Structured Logging ──────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()

# ─── Environment ─────────────────────────────────────────────────────────────
ENV = os.getenv("ENV", "development")
IS_DEV = ENV == "development"

# Internal API service (NestJS) + frontend origins
ALLOWED_ORIGINS_STR = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://api:3001",
)
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_STR.split(",")]

ALLOWED_HOSTS_STR = os.getenv(
    "ALLOWED_HOSTS",
    "localhost,analytics,127.0.0.1",
)
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_STR.split(",")]


# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("REDIS_URL", "redis://localhost:6379"),
    default_limits=["200/minute"],
)


# ─── Lifespan (startup/shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("analytics_engine_starting", env=ENV, origins=ALLOWED_ORIGINS)
    yield
    logger.info("analytics_engine_shutdown")


# ─── App Factory ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="ForexBot Analytics Engine",
    version="1.0.0",
    docs_url="/docs" if IS_DEV else None,       # disable Swagger in production
    redoc_url="/redoc" if IS_DEV else None,
    openapi_url="/openapi.json" if IS_DEV else None,
    lifespan=lifespan,
)

# ─── Middleware: Rate Limiting ────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Middleware: Trusted Hosts ────────────────────────────────────────────────
# Only allow requests from known hosts (prevents host header injection)
if not IS_DEV:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=ALLOWED_HOSTS,
    )

# ─── Middleware: CORS ─────────────────────────────────────────────────────────
# SECURITY FIX: was allow_origins=["*"] — now explicit whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,       # explicit origins only
    allow_credentials=True,
    allow_methods=["GET", "POST"],       # analytics only needs GET and POST
    allow_headers=["Content-Type", "Authorization", "X-Internal-Token"],
    max_age=86400,                       # preflight cache 24h
)

# ─── Middleware: Request ID + Logging ────────────────────────────────────────
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    import uuid
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    log = logger.bind(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else "unknown",
    )
    log.info("request_received")

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    log.info("request_completed", status_code=response.status_code)
    return response


# ─── Middleware: Internal Service Auth ────────────────────────────────────────
# Analytics should only be called by the NestJS API, not the public internet
INTERNAL_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")

@app.middleware("http")
async def internal_auth_middleware(request: Request, call_next):
    # Skip auth for health check
    if request.url.path in ["/health", "/metrics"]:
        return await call_next(request)

    token = request.headers.get("X-Internal-Token", "")
    if INTERNAL_TOKEN and token != INTERNAL_TOKEN:
        logger.warning(
            "unauthorized_internal_request",
            path=request.url.path,
            client=request.client.host if request.client else "unknown",
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Unauthorized"},
        )

    return await call_next(request)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["monitoring"])
async def health_check():
    return {"status": "ok", "service": "analytics-engine", "env": ENV}


# ─── Import Routes ────────────────────────────────────────────────────────────
# Keep your existing route imports below:
# from app.routes import analyze, metrics, snapshots, anomalies
# app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
# app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
# app.include_router(snapshots.router, prefix="/snapshots", tags=["snapshots"])
# app.include_router(anomalies.router, prefix="/anomalies", tags=["anomalies"])
