from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List
from app.schemas.trade import TradeRecord
from app.services.anomaly_detector import AnomalyDetector
from app.core.config import settings

router = APIRouter()
detector = AnomalyDetector()

class AnomalyRequest(BaseModel):
    bot_id: str
    trades: List[TradeRecord]
    initial_balance: float = Field(gt=0)

@router.post("")
async def detect_anomalies(
    request: AnomalyRequest,
    x_internal_secret: str = Header(alias="x-internal-secret"),
):
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")

    anomalies = detector.detect_all(request.trades, request.initial_balance)
    return {
        "bot_id": request.bot_id,
        "anomalies_found": len(anomalies),
        "anomalies": anomalies,
        "critical_count": sum(1 for a in anomalies if a["severity"] == "critical"),
        "warning_count": sum(1 for a in anomalies if a["severity"] == "warning"),
    }