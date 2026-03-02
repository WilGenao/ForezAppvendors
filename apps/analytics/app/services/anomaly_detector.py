"""
Detector de anomalías en historiales de trading.

Cada detector es una función independiente que devuelve AnomalyResult | None.
Esto permite agregar/quitar detectores sin tocar el orquestador.
"""

from typing import List, Optional, Dict
from collections import defaultdict
import numpy as np
from app.models.trade import Trade
from app.models.anomaly import AnomalyResult, AnomalyReport, AnomalySeverity


def detect_all_anomalies(bot_id: str, trades: List[Trade], initial_balance: float) -> AnomalyReport:
    closed = [t for t in trades if t.is_closed]
    anomalies: List[AnomalyResult] = []

    detectors = [
        lambda: _detect_martingale(closed),
        lambda: _detect_excessive_risk(closed, initial_balance),
        lambda: _detect_manipulated_equity(closed),
        lambda: _detect_insufficient_history(closed),
        lambda: _detect_suspicious_overfitting(closed),
        lambda: _detect_no_stop_loss(closed),
        lambda: _detect_zero_losses(closed),
    ]

    for detector in detectors:
        result = detector()
        if result is not None:
            anomalies.append(result)

    overall_risk = min(100, sum(a.score for a in anomalies))
    is_flagged = any(a.severity in (AnomalySeverity.critical, AnomalySeverity.warning) for a in anomalies)

    return AnomalyReport(
        bot_id=bot_id,
        anomalies=anomalies,
        is_flagged=is_flagged,
        overall_risk_score=overall_risk,
    )


def _detect_martingale(trades: List[Trade]) -> Optional[AnomalyResult]:
    """
    Martingala: posición siguiente > 2x la posición anterior después de pérdida.
    Detecta la versión extrema que puede destruir la cuenta.
    """
    if len(trades) < 10:
        return None

    sorted_trades = sorted(trades, key=lambda t: t.opened_at)
    martingale_incidents = 0
    max_multiplier = 0.0

    for i in range(1, len(sorted_trades)):
        prev = sorted_trades[i - 1]
        curr = sorted_trades[i]

        if prev.net_profit < 0 and curr.lot_size > prev.lot_size:
            multiplier = curr.lot_size / prev.lot_size
            if multiplier >= 2.0:
                martingale_incidents += 1
                max_multiplier = max(max_multiplier, multiplier)

    if martingale_incidents == 0:
        return None

    incident_rate = martingale_incidents / len(sorted_trades)
    score = min(100, int(incident_rate * 200))
    severity = AnomalySeverity.critical if score >= 50 else AnomalySeverity.warning

    return AnomalyResult(
        anomaly_type="martingale_detected",
        severity=severity,
        score=score,
        description=f"Martingale pattern detected: {martingale_incidents} instances of doubling position after loss (max {max_multiplier:.1f}x). This strategy can cause catastrophic account loss.",
        details={"incidents": martingale_incidents, "incident_rate": round(incident_rate, 4), "max_multiplier": round(max_multiplier, 2)},
    )


def _detect_excessive_risk(trades: List[Trade], initial_balance: float) -> Optional[AnomalyResult]:
    """
    Riesgo excesivo: operaciones que arriesgan >5% del capital en un trade.
    Usa stop_loss si disponible, si no estima por pérdida máxima histórica.
    """
    if not trades or initial_balance <= 0:
        return None

    high_risk_trades = []
    for trade in trades:
        risk_usd = None
        if trade.stop_loss and trade.open_price:
            price_risk = abs(trade.open_price - trade.stop_loss)
            # Aproximación: pip value depende del par, usamos estimación conservadora
            risk_usd = price_risk * trade.lot_size * 100000 * 0.0001
        elif trade.net_profit < 0:
            risk_usd = abs(trade.net_profit)

        if risk_usd and (risk_usd / initial_balance) > 0.05:
            high_risk_trades.append({
                "ticket": trade.ticket,
                "risk_pct": round(risk_usd / initial_balance * 100, 2),
            })

    if not high_risk_trades:
        return None

    max_risk_pct = max(t["risk_pct"] for t in high_risk_trades)
    score = min(100, int(len(high_risk_trades) / len(trades) * 100 + max_risk_pct))
    severity = AnomalySeverity.critical if max_risk_pct > 20 else AnomalySeverity.warning

    return AnomalyResult(
        anomaly_type="excessive_risk_per_trade",
        severity=severity,
        score=score,
        description=f"{len(high_risk_trades)} trades exceeded 5% account risk. Maximum single trade risk: {max_risk_pct:.1f}% of account.",
        details={"count": len(high_risk_trades), "max_risk_pct": max_risk_pct, "examples": high_risk_trades[:5]},
    )


def _detect_manipulated_equity(trades: List[Trade]) -> Optional[AnomalyResult]:
    """
    Equity manipulada: curva que sube consistentemente sin ningún drawdown real.
    Señal de cherry-picking de trades o datos fabricados.
    
    Algoritmo: si el 95% de los trades consecutivos son ganadores sin
    ninguna racha de 3+ perdedores, es sospechoso.
    """
    if len(trades) < 20:
        return None

    sorted_trades = sorted(trades, key=lambda t: t.opened_at)
    profits = [t.net_profit for t in sorted_trades]

    # Contar racha máxima de pérdidas consecutivas
    max_losing_streak = 0
    current_streak = 0
    for p in profits:
        if p < 0:
            current_streak += 1
            max_losing_streak = max(max_losing_streak, current_streak)
        else:
            current_streak = 0

    # Con 100+ trades, es estadísticamente imposible no tener racha de 3+ pérdidas
    # si el win rate es <= 90%
    win_rate = len([p for p in profits if p > 0]) / len(profits)

    suspicious = (
        len(trades) >= 50 and max_losing_streak < 3 and win_rate < 0.95
    ) or (
        len(trades) >= 20 and max_losing_streak == 0
    )

    if not suspicious:
        return None

    score = 80 if max_losing_streak == 0 else 60
    return AnomalyResult(
        anomaly_type="manipulated_equity_curve",
        severity=AnomalySeverity.critical,
        score=score,
        description=f"Equity curve shows suspicious consistency. Maximum losing streak: {max_losing_streak} with {len(trades)} trades. Statistical anomaly suggesting cherry-picked results.",
        details={"max_losing_streak": max_losing_streak, "win_rate": round(win_rate, 4), "total_trades": len(trades)},
    )


def _detect_insufficient_history(trades: List[Trade]) -> Optional[AnomalyResult]:
    """
    Historial insuficiente para ser estadísticamente significativo.
    < 100 trades = no hay suficiente base para confiar en las métricas.
    """
    if len(trades) >= 100:
        return None

    if len(trades) < 10:
        score, severity = 90, AnomalySeverity.critical
        msg = f"Only {len(trades)} trades. Minimum 100 required for statistical significance."
    else:
        score, severity = 40, AnomalySeverity.warning
        msg = f"Only {len(trades)} trades. Performance metrics have low statistical confidence below 100 trades."

    return AnomalyResult(
        anomaly_type="insufficient_trade_history",
        severity=severity,
        score=score,
        description=msg,
        details={"trade_count": len(trades), "minimum_recommended": 100},
    )


def _detect_suspicious_overfitting(trades: List[Trade]) -> Optional[AnomalyResult]:
    """
    Overfitting sospechoso: performance perfecta en rango específico de fechas.
    Señal: win_rate > 85% en un período pero < 60% fuera de él.
    """
    if len(trades) < 50:
        return None

    sorted_trades = sorted(trades, key=lambda t: t.opened_at)
    
    # Dividir en cuartos y comparar performance
    quarter_size = len(sorted_trades) // 4
    quarters = [sorted_trades[i*quarter_size:(i+1)*quarter_size] for i in range(4)]
    
    quarter_win_rates = []
    for q in quarters:
        if q:
            wr = len([t for t in q if t.net_profit > 0]) / len(q)
            quarter_win_rates.append(wr)

    if not quarter_win_rates:
        return None

    max_wr = max(quarter_win_rates)
    min_wr = min(quarter_win_rates)
    variance = max_wr - min_wr

    # Variación > 40 puntos porcentuales entre cuartos es sospechosa
    if variance < 0.4:
        return None

    score = min(100, int(variance * 150))
    return AnomalyResult(
        anomaly_type="suspicious_overfitting",
        severity=AnomalySeverity.warning,
        score=score,
        description=f"Significant performance variance across time periods suggests overfitting. Win rate ranged from {min_wr:.0%} to {max_wr:.0%} across quarters.",
        details={"quarter_win_rates": [round(wr, 4) for wr in quarter_win_rates], "variance": round(variance, 4)},
    )


def _detect_no_stop_loss(trades: List[Trade]) -> Optional[AnomalyResult]:
    """No usar stop loss es un riesgo operacional serio."""
    if not trades:
        return None
    no_sl = [t for t in trades if t.stop_loss is None]
    rate = len(no_sl) / len(trades)
    if rate < 0.8:
        return None
    return AnomalyResult(
        anomaly_type="no_stop_loss",
        severity=AnomalySeverity.warning,
        score=min(100, int(rate * 70)),
        description=f"{rate:.0%} of trades have no stop loss defined. This represents significant risk of catastrophic loss.",
        details={"rate": round(rate, 4), "count": len(no_sl)},
    )


def _detect_zero_losses(trades: List[Trade]) -> Optional[AnomalyResult]:
    """Profit factor infinito (nunca pierde) es una red flag."""
    if len(trades) < 20:
        return None
    losses = [t for t in trades if t.net_profit < 0]
    if losses:
        return None
    return AnomalyResult(
        anomaly_type="zero_losses_detected",
        severity=AnomalySeverity.critical,
        score=85,
        description=f"Bot shows zero losses across {len(trades)} trades. This is statistically improbable and may indicate fabricated history or open losing trades not yet closed.",
        details={"total_trades": len(trades), "losing_trades": 0},
    )
