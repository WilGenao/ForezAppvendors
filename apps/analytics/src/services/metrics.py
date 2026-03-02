"""
ForexBot Analytics Engine — Metrics Calculator
All financial metrics calculated with numpy for performance.
"""
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TradeRecord:
    profit_usd: float
    commission_usd: float
    swap_usd: float
    open_time: Any
    close_time: Any
    volume_lots: float
    open_price: float
    close_price: Optional[float]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    account_balance_at_open: Optional[float]
    account_balance_at_close: Optional[float]
    symbol: str
    direction: str


class MetricsCalculator:
    def __init__(self, risk_free_rate: float = 0.05):
        self.risk_free_rate = risk_free_rate

    def calculate_all(self, trades: List[TradeRecord]) -> Dict[str, Any]:
        if not trades:
            return self._empty_metrics()

        closed = [t for t in trades if t.close_time is not None and t.profit_usd is not None]
        if not closed:
            return self._empty_metrics()

        net_profits = np.array([
            t.profit_usd + t.commission_usd + t.swap_usd
            for t in closed
        ])

        winning = net_profits[net_profits > 0]
        losing = net_profits[net_profits < 0]

        total_trades = len(closed)
        winning_trades = len(winning)
        losing_trades = len(losing)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0.0
        total_profit = float(np.sum(winning)) if len(winning) > 0 else 0.0
        total_loss = float(abs(np.sum(losing))) if len(losing) > 0 else 0.0
        net_profit = total_profit - total_loss

        profit_factor = self._profit_factor(total_profit, total_loss)
        max_dd_abs, max_dd_pct = self._max_drawdown(net_profits, closed)
        sharpe = self._sharpe_ratio(net_profits)
        sortino = self._sortino_ratio(net_profits)
        expectancy = self._expectancy(winning_trades, losing_trades, total_trades, winning, losing)
        avg_rrr = self._avg_rrr(closed)
        calmar = self._calmar_ratio(net_profit, max_dd_abs, closed)
        recovery_factor = net_profit / max_dd_abs if max_dd_abs and max_dd_abs > 0 else None

        times = sorted([t.open_time for t in closed if t.open_time])

        return {
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": round(win_rate, 4),
            "profit_factor": round(profit_factor, 4) if profit_factor and profit_factor != float("inf") else profit_factor,
            "sharpe_ratio": round(sharpe, 4) if sharpe is not None else None,
            "sortino_ratio": round(sortino, 4) if sortino is not None else None,
            "max_drawdown_abs": round(max_dd_abs, 2) if max_dd_abs else None,
            "max_drawdown_pct": round(max_dd_pct, 4) if max_dd_pct else None,
            "total_profit_usd": round(total_profit, 2),
            "total_loss_usd": round(total_loss, 2),
            "net_profit_usd": round(net_profit, 2),
            "expectancy_usd": round(expectancy, 4) if expectancy is not None else None,
            "avg_rrr": round(avg_rrr, 4) if avg_rrr else None,
            "recovery_factor": round(recovery_factor, 4) if recovery_factor else None,
            "calmar_ratio": round(calmar, 4) if calmar else None,
            "trade_date_start": times[0] if times else None,
            "trade_date_end": times[-1] if times else None,
        }

    def _profit_factor(self, gross_profit: float, gross_loss: float) -> Optional[float]:
        if gross_loss == 0:
            return None if gross_profit == 0 else float("inf")
        return gross_profit / gross_loss

    def _max_drawdown(self, net_profits: np.ndarray, trades: List[TradeRecord]) -> Tuple[float, float]:
        equity_curve = np.cumsum(net_profits)
        if len(equity_curve) == 0:
            return 0.0, 0.0
        running_max = np.maximum.accumulate(equity_curve)
        drawdowns = running_max - equity_curve
        max_dd_abs = float(np.max(drawdowns))
        initial_capital = self._infer_initial_capital(trades)
        if initial_capital and initial_capital > 0:
            peak = initial_capital + float(np.max(running_max))
            max_dd_pct = max_dd_abs / peak if peak > 0 else 0.0
        else:
            max_dd_pct = 0.0
        return max_dd_abs, max_dd_pct

    def _sharpe_ratio(self, net_profits: np.ndarray) -> Optional[float]:
        if len(net_profits) < 2:
            return None
        mean_return = np.mean(net_profits)
        std_return = np.std(net_profits, ddof=1)
        if std_return == 0:
            return None
        daily_rfr = self.risk_free_rate / 252
        return float(((mean_return - daily_rfr) / std_return) * np.sqrt(252))

    def _sortino_ratio(self, net_profits: np.ndarray) -> Optional[float]:
        if len(net_profits) < 2:
            return None
        daily_rfr = self.risk_free_rate / 252
        downside = net_profits[net_profits < daily_rfr]
        if len(downside) == 0:
            return None
        downside_std = np.sqrt(np.mean((downside - daily_rfr) ** 2))
        if downside_std == 0:
            return None
        return float(((np.mean(net_profits) - daily_rfr) / downside_std) * np.sqrt(252))

    def _expectancy(self, wins: int, losses: int, total: int, winning: np.ndarray, losing: np.ndarray) -> Optional[float]:
        if total == 0:
            return None
        win_rate = wins / total
        loss_rate = losses / total
        avg_win = float(np.mean(winning)) if len(winning) > 0 else 0.0
        avg_loss = float(abs(np.mean(losing))) if len(losing) > 0 else 0.0
        return (win_rate * avg_win) - (loss_rate * avg_loss)

    def _avg_rrr(self, trades: List[TradeRecord]) -> Optional[float]:
        rrrs = []
        for t in trades:
            if t.stop_loss and t.take_profit and t.open_price:
                risk = abs(t.open_price - t.stop_loss)
                reward = abs(t.take_profit - t.open_price)
                if risk > 0:
                    rrrs.append(reward / risk)
        return float(np.mean(rrrs)) if rrrs else None

    def _calmar_ratio(self, net_profit: float, max_dd_abs: float, trades: List[TradeRecord]) -> Optional[float]:
        if not max_dd_abs or max_dd_abs <= 0:
            return None
        times = sorted([t.open_time for t in trades if t.open_time])
        if len(times) < 2:
            return None
        try:
            delta = (times[-1] - times[0]).days
        except AttributeError:
            return None
        if delta <= 0:
            return None
        return (net_profit * (365 / delta)) / max_dd_abs

    def _infer_initial_capital(self, trades: List[TradeRecord]) -> Optional[float]:
        for t in sorted(trades, key=lambda x: x.open_time or datetime.min):
            if t.account_balance_at_open:
                return t.account_balance_at_open
        return None

    def _empty_metrics(self) -> Dict[str, Any]:
        return {k: None for k in ["total_trades", "winning_trades", "losing_trades", "win_rate",
            "profit_factor", "sharpe_ratio", "sortino_ratio", "max_drawdown_abs", "max_drawdown_pct",
            "total_profit_usd", "total_loss_usd", "net_profit_usd", "expectancy_usd", "avg_rrr",
            "recovery_factor", "calmar_ratio", "trade_date_start", "trade_date_end"]}
