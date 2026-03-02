from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.core.config import settings
from datetime import datetime

router = APIRouter()

class SnapshotRequest(BaseModel):
    bot_id: str
    metrics: dict

@router.post("")
async def save_snapshot(
    request: SnapshotRequest,
    x_internal_secret: str = Header(alias="x-internal-secret"),
):
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")

    # Aquí se guarda el snapshot en performance_snapshots via DB
    return {"status": "snapshot_saved", "bot_id": request.bot_id, "saved_at": datetime.utcnow()}