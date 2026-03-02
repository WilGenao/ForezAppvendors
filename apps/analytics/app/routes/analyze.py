from fastapi import APIRouter, HTTPException
from app.models.trade import AnalyzeRequest, MetricsResult
from app.models.anomaly import AnomalyReport
from app.services.metrics_calculator import calculate_all_metrics
from app.services.anomaly_detector import detect_all_anomalies
from pydantic import BaseModel

router = APIRouter()

class FullAnalysisResult(BaseModel):
    metrics: MetricsResult
    anomalies: AnomalyReport

@router.post("/", response_model=FullAnalysisResult)
async def analyze_trades(request: AnalyzeRequest):
    """Technical performance metrics only. NOT financial advice."""
    try:
        metrics = calculate_all_metrics(request.bot_id, request.trades, request.initial_balance, request.risk_free_rate)
        anomalies = detect_all_anomalies(request.bot_id, request.trades, request.initial_balance)
        return FullAnalysisResult(metrics=metrics, anomalies=anomalies)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
