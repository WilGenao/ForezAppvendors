from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TradeDirection(str, Enum):
    buy = "buy"
    sell = "sell"

class Trade(BaseModel):
    ticket: int
    direction: TradeDirection
    symbol: str
    lot_size: float = Field(..., gt=0)
    open_price: float = Field(..., gt=0)
    close_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    profit_usd: Optional[float] = None
    commission_usd: float = 0.0
    swap_usd: float = 0.0
    opened_at: datetime
    closed_at: Optional[datetime] = None
    account_balance_before: Optional[float] = None
    account_balance_after: Optional[float] = None
    magic_number: Optional[int] = None

    @property
    def net_profit(self) -> float:
        if self.profit_usd is None:
            return 0.0
        return self.profit_usd + self.commission_usd + self.swap_usd

    @property
    def is_closed(self) -> bool:
        return self.closed_at is not None and self.profit_usd is not None

class AnalyzeRequest(BaseModel):
    bot_id: str
    trades: List[Trade] = Field(..., min_items=1)
    initial_balance: float = Field(..., gt=0)
    risk_free_rate: float = Field(default=0.05, ge=0, le=1, description="Annual risk-free rate (e.g. 0.05 = 5%)")

class MetricsResult(BaseModel):
    bot_id: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: Optional[float]
    profit_factor: Optional[float]
    sharpe_ratio: Optional[float]
    sortino_ratio: Optional[float]
    max_drawdown_pct: Optional[float]
    max_drawdown_abs: Optional[float]
    total_profit_usd: float
    avg_rrr: Optional[float]
    expectancy_usd: Optional[float]
    recovery_factor: Optional[float]
    calmar_ratio: Optional[float]
    trading_days: Optional[int]
    annualized_return: Optional[float]
