from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TradeDirection(str, Enum):
    buy = "buy"
    sell = "sell"

class Trade(BaseModel):
    ticket: Optional[int] = None
    symbol: str
    direction: TradeDirection
    volume_lots: float = Field(gt=0)
    open_price: float = Field(gt=0)
    close_price: Optional[float] = None
    open_time: datetime
    close_time: Optional[datetime] = None
    profit_usd: Optional[float] = None
    commission_usd: float = 0.0
    swap_usd: float = 0.0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    magic_number: Optional[int] = None
    comment: Optional[str] = None
    account_balance_at_open: Optional[float] = None
    account_balance_at_close: Optional[float] = None

class AnalyzeRequest(BaseModel):
    bot_id: str
    risk_free_rate: float = Field(default=0.05, ge=0, le=1)
    initial_capital: Optional[float] = None

class MetricsResponse(BaseModel):
    bot_id: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: Optional[float] = None
    profit_factor: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    max_drawdown_abs: Optional[float] = None
    total_profit_usd: Optional[float] = None
    total_loss_usd: Optional[float] = None
    net_profit_usd: Optional[float] = None
    expectancy_usd: Optional[float] = None
    avg_rrr: Optional[float] = None
    recovery_factor: Optional[float] = None
    calmar_ratio: Optional[float] = None
    trade_date_start: Optional[datetime] = None
    trade_date_end: Optional[datetime] = None
    anomalies: List[dict] = []
