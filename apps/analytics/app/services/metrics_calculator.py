"""
Calculadora de métricas de trading.

Decisión de arquitectura: todo el cálculo es stateless y funcional.
No se modifica estado global. Cada función recibe los datos y devuelve el resultado.
Esto facilita testing unitario y paralelización futura con Celery.
"""

import numpy as np
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from app.models.trade import Trade, MetricsResult


def calculate_all_metrics(
    bot_id: str,
    trades: List[Trade],
    initial_balance: float,
    risk_free_rate: float = 0.05,
) -> MetricsResult:
    """
    Punto de entrada principal. Calcula todas las métricas en un solo paso.
    Solo considera trades cerrados para métricas de P&L.
    """
    closed_trades = [t for t in trades if t.is_closed]

    if not closed_trades:
        return MetricsResult(
            bot_id=bot_id, total_trades=len(trades), winning_trades=0,
            losing_trades=0, win_rate=None, profit_factor=None,
            sharpe_ratio=None, sortino_ratio=None, max_drawdown_pct=None,
            max_drawdown_abs=None, total_profit_usd=0.0, avg_rrr=None,
            expectancy_usd=None, recovery_factor=None, calmar_ratio=None,
            trading_days=None, annualized_return=None,
        )

    profits = [t.net_profit for t in closed_trades]
    winners = [p for p in profits if p > 0]
    losers  = [p for p in profits if p < 0]

    win_rate      = len(winners) / len(profits) if profits else None
    profit_factor = _profit_factor(winners, losers)
    equity_curve  = _build_equity_curve(closed_trades, initial_balance)
    max_dd_pct, max_dd_abs = _max_drawdown(equity_curve)
    sharpe        = _sharpe_ratio(profits, risk_free_rate)
    sortino       = _sortino_ratio(profits, risk_free_rate)
    avg_rrr       = _average_rrr(closed_trades)
    expectancy    = _expectancy(winners, losers, win_rate)
    total_profit  = sum(profits)
    trading_days  = _trading_days(closed_trades)
    ann_return    = _annualized_return(initial_balance, total_profit, trading_days)
    recovery_factor = _recovery_factor(total_profit, max_dd_abs)
    calmar        = _calmar_ratio(ann_return, max_dd_pct)

    return MetricsResult(
        bot_id=bot_id,
        total_trades=len(closed_trades),
        winning_trades=len(winners),
        losing_trades=len(losers),
        win_rate=round(win_rate, 4) if win_rate is not None else None,
        profit_factor=round(profit_factor, 4) if profit_factor is not None else None,
        sharpe_ratio=round(sharpe, 4) if sharpe is not None else None,
        sortino_ratio=round(sortino, 4) if sortino is not None else None,
        max_drawdown_pct=round(max_dd_pct, 4) if max_dd_pct is not None else None,
        max_drawdown_abs=round(max_dd_abs, 2) if max_dd_abs is not None else None,
        total_profit_usd=round(total_profit, 2),
        avg_rrr=round(avg_rrr, 4) if avg_rrr is not None else None,
        expectancy_usd=round(expectancy, 4) if expectancy is not None else None,
        recovery_factor=round(recovery_factor, 4) if recovery_factor is not None else None,
        calmar_ratio=round(calmar, 4) if calmar is not None else None,
        trading_days=trading_days,
        annualized_return=round(ann_return, 4) if ann_return is not None else None,
    )


def _profit_factor(winners: List[float], losers: List[float]) -> Optional[float]:
    """
    Profit Factor = Gross Profit / |Gross Loss|
    > 1.5 es aceptable. > 2.0 es bueno. > 3.0 es sospechoso.
    """
    gross_loss = abs(sum(losers))
    if gross_loss == 0:
        return None  # Nunca perdió — sospechoso (se detecta como anomalía)
    return sum(winners) / gross_loss


def _build_equity_curve(trades: List[Trade], initial_balance: float) -> List[float]:
    """
    Construye la curva de equity ordenada por fecha de cierre.
    Si account_balance_after está disponible, lo usa directamente.
    Si no, reconstruye desde initial_balance + profits acumulados.
    """
    sorted_trades = sorted(trades, key=lambda t: t.closed_at)
    
    # Preferir balance real del broker si está disponible
    if all(t.account_balance_after is not None for t in sorted_trades):
        return [initial_balance] + [t.account_balance_after for t in sorted_trades]
    
    # Fallback: reconstruir
    equity = [initial_balance]
    running_balance = initial_balance
    for trade in sorted_trades:
        running_balance += trade.net_profit
        equity.append(running_balance)
    return equity


def _max_drawdown(equity_curve: List[float]) -> Tuple[Optional[float], Optional[float]]:
    """
    Max Drawdown: mayor caída desde un pico hasta el siguiente valle.
    Devuelve (pct, abs).
    """
    if len(equity_curve) < 2:
        return None, None
    
    equity_arr = np.array(equity_curve)
    running_max = np.maximum.accumulate(equity_arr)
    drawdowns_abs = running_max - equity_arr
    drawdowns_pct = np.where(running_max > 0, drawdowns_abs / running_max, 0)
    
    max_dd_abs = float(np.max(drawdowns_abs))
    max_dd_pct = float(np.max(drawdowns_pct))
    return max_dd_pct, max_dd_abs


def _sharpe_ratio(profits: List[float], risk_free_rate: float) -> Optional[float]:
    """
    Sharpe Ratio anualizado.
    Usamos returns diarios del capital. Si no tenemos balance, usamos profits como proxy.
    Fórmula: (E[R] - Rf) / std(R) * sqrt(252)
    """
    if len(profits) < 2:
        return None
    
    profits_arr = np.array(profits)
    mean_return = np.mean(profits_arr)
    std_return  = np.std(profits_arr, ddof=1)
    
    if std_return == 0:
        return None
    
    # Ajuste: risk_free_rate diario = (1+annual_rf)^(1/252) - 1
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    
    # Annualizar con sqrt(252) — asumimos distribución diaria
    sharpe = (mean_return - daily_rf) / std_return * np.sqrt(252)
    return float(sharpe)


def _sortino_ratio(profits: List[float], risk_free_rate: float) -> Optional[float]:
    """
    Sortino Ratio: igual que Sharpe pero solo penaliza la volatilidad negativa.
    Más justo para estrategias asimétricas (tendencia, breakout).
    """
    if len(profits) < 2:
        return None
    
    profits_arr = np.array(profits)
    mean_return = np.mean(profits_arr)
    
    # Solo desviación de returns negativos (downside deviation)
    negative_returns = profits_arr[profits_arr < 0]
    if len(negative_returns) == 0:
        return None  # Nunca perdió — sospechoso
    
    downside_std = np.std(negative_returns, ddof=1)
    if downside_std == 0:
        return None
    
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    sortino = (mean_return - daily_rf) / downside_std * np.sqrt(252)
    return float(sortino)


def _average_rrr(trades: List[Trade]) -> Optional[float]:
    """
    Average Risk/Reward Ratio.
    Para trades con SL y TP definidos. Si no hay, estima desde resultado real.
    """
    rrr_values = []
    for trade in trades:
        if trade.stop_loss and trade.take_profit and trade.open_price:
            risk   = abs(trade.open_price - trade.stop_loss)
            reward = abs(trade.take_profit - trade.open_price)
            if risk > 0:
                rrr_values.append(reward / risk)
    
    if not rrr_values:
        # Fallback: usar winners/losers promedio
        winners = [t.net_profit for t in trades if t.net_profit > 0]
        losers  = [abs(t.net_profit) for t in trades if t.net_profit < 0]
        if winners and losers:
            return np.mean(winners) / np.mean(losers)
        return None
    
    return float(np.mean(rrr_values))


def _expectancy(winners: List[float], losers: List[float], win_rate: Optional[float]) -> Optional[float]:
    """
    Expectancy = (WinRate * AvgWin) - (LossRate * AvgLoss)
    Cuánto esperas ganar por dólar en riesgo por operación.
    """
    if win_rate is None or not winners or not losers:
        return None
    
    avg_win  = np.mean(winners)
    avg_loss = abs(np.mean(losers))
    loss_rate = 1 - win_rate
    return float((win_rate * avg_win) - (loss_rate * avg_loss))


def _trading_days(trades: List[Trade]) -> Optional[int]:
    if not trades:
        return None
    dates = [t.closed_at for t in trades if t.closed_at]
    if not dates:
        return None
    return (max(dates) - min(dates)).days + 1


def _annualized_return(initial_balance: float, total_profit: float, trading_days: Optional[int]) -> Optional[float]:
    if not trading_days or trading_days < 1 or initial_balance <= 0:
        return None
    total_return = total_profit / initial_balance
    years = trading_days / 365
    if years <= 0:
        return None
    return float((1 + total_return) ** (1 / years) - 1)


def _recovery_factor(total_profit: float, max_dd_abs: Optional[float]) -> Optional[float]:
    """Recovery Factor = Net Profit / Max Drawdown Abs"""
    if max_dd_abs is None or max_dd_abs == 0:
        return None
    return float(total_profit / max_dd_abs)


def _calmar_ratio(annualized_return: Optional[float], max_dd_pct: Optional[float]) -> Optional[float]:
    """Calmar Ratio = Annualized Return / Max Drawdown %"""
    if annualized_return is None or max_dd_pct is None or max_dd_pct == 0:
        return None
    return float(annualized_return / max_dd_pct)
