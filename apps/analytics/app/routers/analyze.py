from fastapi import APIRouter, HTTPException, Header
from app.schemas.trade import AnalyzeRequest, AnalyzeResponse
from app.services.metrics_calculator import MetricsCalculator
from app.services.anomaly_detector import AnomalyDetector
from app.core.config import settings

router = APIRouter()
calculator = MetricsCalculator(risk_free_rate=settings.RISK_FREE_RATE)
detector = AnomalyDetector()

@router.post("", response_model=AnalyzeResponse)
async def analyze_trades(
    request: AnalyzeRequest,
    x_internal_secret: str = Header(alias="x-internal-secret"),
):
    """
    Analiza el historial de trades de un bot y devuelve métricas completas.
    Solo accesible internamente desde el Core API.
    """
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")

    if len(request.trades) == 0:
        raise HTTPException(status_code=422, detail="El historial de trades no puede estar vacío")

    metrics = calculator.calculate_all(request.trades, request.initial_balance)
    anomalies = detector.detect_all(request.trades, request.initial_balance)

    is_significant = len([t for t in request.trades if t.profit_usd is not None]) >= 100
    significance_message = (
        "Historial estadísticamente significativo (≥100 trades)"
        if is_significant
        else f"Historial insuficiente ({len(request.trades)} trades). Las métricas deben interpretarse con precaución."
    )

    return AnalyzeResponse(
        bot_id=request.bot_id,
        anomalies=anomalies,
        statistical_significance=is_significant,
        significance_message=significance_message,
        **metrics,
    )