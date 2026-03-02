# apps/analytics/src/models/schemas.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TradeDirection(str, Enum):
    buy = "buy"
    sell = "sell"


class TradeRecord(BaseModel):
    """Un trade individual de MetaTrader 4/5."""
    ticket: Optional[str] = None
    symbol: str
    direction: TradeDirection
    volume_lots: float = Field(gt=0)
    open_price: float = Field(gt=0)
    close_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    profit_usd: Optional[float] = None
    commission_usd: float = 0.0
    swap_usd: float = 0.0
    account_balance_at_open: Optional[float] = None

    @property
    def net_profit(self) -> float:
        """Profit neto incluyendo comisiones y swap."""
        if self.profit_usd is None:
            return 0.0
        return self.profit_usd + self.commission_usd + self.swap_usd

    @property
    def is_closed(self) -> bool:
        return self.close_price is not None and self.closed_at is not None


class AnalyzeRequest(BaseModel):
    bot_id: str
    job_id: str
    trades: List[TradeRecord]
    risk_free_rate: float = Field(
        default=0.05,
        description="Tasa libre de riesgo anual para Sharpe/Sortino. Default: 5% (US Treasury 2024)",
        ge=0,
        le=1,
    )
    initial_balance: Optional[float] = Field(
        default=None,
        description="Balance inicial de la cuenta. Si no se provee, se estima del primer trade.",
    )

    @validator('trades')
    def trades_must_have_closed(cls, v):
        closed = [t for t in v if t.is_closed]
        if len(closed) < 10:
            raise ValueError("Se necesitan al menos 10 trades cerrados para calcular métricas")
        return v


class PerformanceMetrics(BaseModel):
    """Resultado completo del análisis de performance."""
    # Métricas de rentabilidad ajustada por riesgo
    sharpe_ratio: Optional[float] = Field(description="Sharpe Ratio anualizado")
    sortino_ratio: Optional[float] = Field(description="Sortino Ratio anualizado")
    calmar_ratio: Optional[float] = Field(description="Calmar Ratio (return/max_drawdown)")

    # Drawdown
    max_drawdown_pct: float = Field(description="Máximo Drawdown en porcentaje")
    max_drawdown_abs: float = Field(description="Máximo Drawdown en USD absoluto")
    max_drawdown_start: Optional[datetime]
    max_drawdown_end: Optional[datetime]

    # Estadísticas de trades
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float = Field(description="Porcentaje de trades ganadores (0-100)")
    profit_factor: Optional[float] = Field(description="Ganancia bruta / pérdida bruta")
    expectancy_usd: float = Field(description="Expectativa matemática por trade en USD")
    avg_rrr: Optional[float] = Field(description="Risk/Reward Ratio promedio")
    recovery_factor: Optional[float] = Field(description="Net Profit / Max Drawdown")

    # Totales
    total_profit_usd: float
    total_loss_usd: float
    net_profit_usd: float
    best_trade_usd: float
    worst_trade_usd: float
    avg_trade_duration_hours: Optional[float]

    # Curva de equity para gráficos
    equity_curve: List[dict] = Field(description="[{date, equity, balance}]")

    # Metadata del análisis
    analyzed_at: datetime
    trades_analyzed: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]


class AnomalyType(str, Enum):
    martingale = "martingale"
    excessive_risk = "excessive_risk"
    manipulated_equity = "manipulated_equity"
    insufficient_data = "insufficient_data"
    suspected_overfitting = "suspected_overfitting"
    toxic_drawdown = "toxic_drawdown"


class AnomalySeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AnomalyResult(BaseModel):
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    score: int = Field(ge=0, le=100)
    description: str
    evidence: dict = Field(default_factory=dict)
    is_detected: bool


class DetectAnomaliesResponse(BaseModel):
    bot_id: str
    anomalies: List[AnomalyResult]
    has_critical_anomalies: bool
    overall_risk_score: int = Field(ge=0, le=100)
    recommendation: str


class SnapshotRequest(BaseModel):
    bot_id: str
    period_type: str = "daily"
    metrics: PerformanceMetrics
