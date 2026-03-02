from fastapi import APIRouter
from app.models.trade import AnalyzeRequest
from app.models.anomaly import AnomalyReport
from app.services.anomaly_detector import detect_all_anomalies

router = APIRouter()

@router.post("/", response_model=AnomalyReport)
async def detect_anomalies(request: AnalyzeRequest):
    return detect_all_anomalies(request.bot_id, request.trades, request.initial_balance)
