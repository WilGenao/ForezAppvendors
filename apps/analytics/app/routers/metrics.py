from fastapi import APIRouter, HTTPException, Header
from app.core.database import get_db
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

router = APIRouter()

@router.get("/{bot_id}")
async def get_metrics(
    bot_id: str,
    x_internal_secret: str = Header(alias="x-internal-secret"),
):
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")

    # En producción: query a performance_snapshots
    # Por ahora retorna estructura esperada
    return {
        "bot_id": bot_id,
        "message": "Query a performance_snapshots por bot_id — implementar con DB connection"
    }