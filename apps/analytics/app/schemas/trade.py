from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TradeDirection(str, Enum):
    BUY = "buy"
    SELL = "sell"

class TradeRecord(BaseModel):
    external_trade_id: Optional[str] = None
    direction: TradeDirection
    symbol: str
    lot_size: float
    open_price: float
    close_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    profit_usd: Optional[float] = None
    commission_usd: float = 0.0
    swap_usd: float = 0.0
    opened_at: datetime
    closed_at: Optional[datetime] = None
    account_balance: Optional[float] = None

class AnalyzeRequest(BaseModel):
    bot_id: str
    trades: List[TradeRecord]
    initial_balance: float = Field(gt=0, description="Balance inicial de la cuenta en USD")

class AnalyzeResponse(BaseModel):
    bot_id: str
    total_trades: int
    win_rate: float
    profit_factor: Optional[float]
    sharpe_ratio: Optional[float]
    sortino_ratio: Optional[float]
    max_drawdown_pct: Optional[float]
    max_drawdown_abs: Optional[float]
    expectancy: Optional[float]
    avg_rrr: Optional[float]
    recovery_factor: Optional[float]
    calmar_ratio: Optional[float]
    total_profit_usd: float
    anomalies: list
    statistical_significance: bool
    significance_message: str