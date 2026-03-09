# apps/analytics/app/middleware/rate_limiter.py
"""
Rate limiter middleware para el Analytics Engine.
Protege contra abuso incluso si el token interno es comprometido.
Límite: 100 análisis por minuto por IP de origen.
"""

import time
import logging
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

# Simple in-memory rate limiter (suficiente para servicio interno de baja concurrencia)
# Para producción de alta escala: migrar a Redis
_request_counts: dict = defaultdict(list)
_lock = Lock()

RATE_LIMIT = 100        # requests
WINDOW_SECONDS = 60     # per minute


def check_rate_limit(client_ip: str) -> None:
    now = time.time()
    window_start = now - WINDOW_SECONDS

    with _lock:
        # Limpiar requests fuera de la ventana
        _request_counts[client_ip] = [
            ts for ts in _request_counts[client_ip] if ts > window_start
        ]

        count = len(_request_counts[client_ip])
        if count >= RATE_LIMIT:
            logger.warning(f"Rate limit exceeded for {client_ip}: {count} requests in {WINDOW_SECONDS}s")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {RATE_LIMIT} requests per {WINDOW_SECONDS} seconds.",
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        _request_counts[client_ip].append(now)
