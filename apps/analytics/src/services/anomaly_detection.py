"""
Anomaly Detection Service
Detects suspicious patterns in bot trade history.
Each detector returns: {type, severity, score (0-100), title, description, evidence}
"""
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class AnomalyResult:
    anomaly_type: str
    severity: str  # info | warning | critical
    score: int      # 0-100
    title: str
    description: str
    evidence: Dict[str, Any]


class AnomalyDetector:

    MIN_TRADES_REQUIRED = 100

    def detect_all(self, trades: List[Dict]) -> List[AnomalyResult]:
        results = []
        closed = [t for t in trades if t.get("close_time") and t.get("profit_usd") is not None]

        # Run all detectors
        r = self._detect_insufficient_data(closed)
        if r: results.append(r)

        r = self._detect_martingale(closed)
        if r: results.append(r)

        r = self._detect_excessive_risk(closed)
        if r: results.append(r)

        r = self._detect_manipulated_equity(closed)
        if r: results.append(r)

        r = self._detect_overfitting(closed)
        if r: results.append(r)

        return results

    def _detect_insufficient_data(self, trades: List[Dict]) -> Optional[AnomalyResult]:
        """
        Fewer than 100 closed trades = statistically insignificant.
        Any metric calculated on < 100 trades has very wide confidence intervals.
        """
        count = len(trades)
        if count >= self.MIN_TRADES_REQUIRED:
            return None

        score = max(0, 100 - int(count * 1.0))
        return AnomalyResult(
            anomaly_type="insufficient_data",
            severity="warning" if count > 30 else "critical",
            score=score,
            title=f"Insufficient Trade History ({count} trades)",
            description=(
                f"The bot has only {count} closed trades. A minimum of {self.MIN_TRADES_REQUIRED} "
                "trades is recommended for statistical significance. Performance metrics with fewer "
                "trades can be misleading and do not reliably predict future performance."
            ),
            evidence={"trade_count": count, "minimum_required": self.MIN_TRADES_REQUIRED},
        )

    def _detect_martingale(self, trades: List[Dict]) -> Optional[AnomalyResult]:
        """
        Martingale detection: position size doubles (or more) after consecutive losses.
        This is a high-risk money management strategy that can cause catastrophic losses.
        """
        if len(trades) < 10:
            return None

        # Sort by open_time
        sorted_trades = sorted(trades, key=lambda t: t.get("open_time") or "")
        martingale_sequences = []
        current_sequence = []

        for i, trade in enumerate(sorted_trades):
            profit = trade.get("profit_usd", 0) or 0
            volume = trade.get("volume_lots", 0) or 0
            if profit < 0:
                current_sequence.append(volume)
            else:
                if len(current_sequence) > 1:
                    # Check if volume doubled at any point in the sequence
                    doublings = 0
                    for j in range(1, len(current_sequence)):
                        if current_sequence[j] >= current_sequence[j-1] * 1.8:  # 80% increase threshold
                            doublings += 1
                    if doublings > 0:
                        martingale_sequences.append({"length": len(current_sequence), "doublings": doublings})
                current_sequence = []

        if not martingale_sequences:
            return None

        # Score based on frequency and severity
        total_sequences = len(martingale_sequences)
        max_length = max(s["length"] for s in martingale_sequences)
        score = min(100, 30 + total_sequences * 5 + max_length * 3)

        return AnomalyResult(
            anomaly_type="martingale_detected",
            severity="critical" if score >= 70 else "warning",
            score=score,
            title="Martingale-Like Position Sizing Detected",
            description=(
                f"Detected {total_sequences} instances where position size increased significantly "
                f"after consecutive losses (max sequence length: {max_length}). "
                "Martingale strategies carry extreme drawdown risk and can cause account wipeout."
            ),
            evidence={
                "sequences_found": total_sequences,
                "max_sequence_length": max_length,
                "sequences": martingale_sequences[:5],  # Show first 5
            },
        )

    def _detect_excessive_risk(self, trades: List[Dict]) -> Optional[AnomalyResult]:
        """
        Detects trades where the position size represents >5% of account equity.
        High risk per trade = high probability of ruin.
        """
        high_risk_trades = []
        for trade in trades:
            balance = trade.get("account_balance_at_open")
            profit = trade.get("profit_usd", 0) or 0
            loss = abs(trade.get("commission_usd", 0) or 0)

            if not balance or balance <= 0:
                continue

            # Estimate max potential loss from this trade
            max_loss = abs(min(profit, 0)) + loss
            if max_loss == 0:
                continue

            risk_pct = (max_loss / balance) * 100
            if risk_pct > 5:
                high_risk_trades.append({
                    "risk_pct": round(risk_pct, 2),
                    "balance": balance,
                    "max_loss": max_loss,
                })

        if not high_risk_trades:
            return None

        pct_high_risk = len(high_risk_trades) / len(trades) * 100
        avg_risk = np.mean([t["risk_pct"] for t in high_risk_trades])
        max_risk = max(t["risk_pct"] for t in high_risk_trades)
        score = min(100, int(pct_high_risk * 1.5 + max_risk * 2))

        return AnomalyResult(
            anomaly_type="excessive_risk_per_trade",
            severity="critical" if max_risk > 15 else "warning",
            score=score,
            title=f"Excessive Risk Per Trade ({pct_high_risk:.1f}% of trades)",
            description=(
                f"{len(high_risk_trades)} trades ({pct_high_risk:.1f}%) exceeded 5% account risk. "
                f"Average risk: {avg_risk:.1f}%, Maximum observed: {max_risk:.1f}%. "
                "Proper risk management limits risk per trade to 1-2% of account equity."
            ),
            evidence={
                "high_risk_trade_count": len(high_risk_trades),
                "pct_high_risk": round(pct_high_risk, 2),
                "avg_risk_pct": round(avg_risk, 2),
                "max_risk_pct": round(max_risk, 2),
            },
        )

    def _detect_manipulated_equity(self, trades: List[Dict]) -> Optional[AnomalyResult]:
        """
        Detects suspiciously smooth equity curves with no real drawdown.
        Legitimate trading always has losing periods. A curve that only goes up
        is statistically anomalous and may indicate manipulated/cherry-picked data.
        
        Method: Check if max drawdown < 2% AND win rate > 90% simultaneously.
        Also check if losing trades have suspiciously small losses.
        """
        if len(trades) < 30:
            return None

        profits = np.array([
            (t.get("profit_usd") or 0) + (t.get("commission_usd") or 0) + (t.get("swap_usd") or 0)
            for t in trades
        ])

        equity = np.cumsum(profits)
        running_max = np.maximum.accumulate(equity)
        drawdowns = running_max - equity
        max_dd = float(np.max(drawdowns))
        total_profit = float(np.sum(profits[profits > 0]))

        wins = int(np.sum(profits > 0))
        win_rate = wins / len(profits)

        max_dd_pct = (max_dd / (total_profit + max_dd)) * 100 if (total_profit + max_dd) > 0 else 0

        # Suspicious if: very high win rate + almost no drawdown
        is_suspicious = win_rate > 0.90 and max_dd_pct < 2.0 and len(trades) > 50

        # Also check if all losses are suspiciously tiny
        losing_trades = profits[profits < 0]
        winning_trades = profits[profits > 0]
        if len(losing_trades) > 0 and len(winning_trades) > 0:
            avg_loss = abs(float(np.mean(losing_trades)))
            avg_win = float(np.mean(winning_trades))
            loss_to_win_ratio = avg_loss / avg_win if avg_win > 0 else 0
            # Suspiciously small losses relative to wins (< 5%) may indicate hidden losers
            if loss_to_win_ratio < 0.05 and win_rate > 0.85:
                is_suspicious = True

        if not is_suspicious:
            return None

        score = min(100, int(win_rate * 60 + (2 - min(max_dd_pct, 2)) * 20))

        return AnomalyResult(
            anomaly_type="manipulated_equity_curve",
            severity="critical",
            score=score,
            title="Suspiciously Perfect Equity Curve",
            description=(
                f"Win rate of {win_rate*100:.1f}% with maximum drawdown of only {max_dd_pct:.2f}% "
                "is statistically anomalous. All legitimate trading systems experience significant "
                "drawdown periods. This may indicate cherry-picked trades or manipulated history."
            ),
            evidence={
                "win_rate": round(win_rate, 4),
                "max_drawdown_pct": round(max_dd_pct, 2),
                "trade_count": len(trades),
            },
        )

    def _detect_overfitting(self, trades: List[Dict]) -> Optional[AnomalyResult]:
        """
        Detects suspected curve-fitting/overfitting:
        Excellent performance concentrated in a very narrow date range.
        
        Method: Compare performance in best 20% of period vs worst 20%.
        If best period >> worst period by large margin, suspect overfitting.
        """
        if len(trades) < 50:
            return None

        sorted_trades = sorted(trades, key=lambda t: t.get("open_time") or "")
        n = len(sorted_trades)
        window = max(10, n // 5)

        # Calculate profit per period chunk
        chunk_profits = []
        for i in range(0, n - window, window):
            chunk = sorted_trades[i:i+window]
            chunk_profit = sum(
                (t.get("profit_usd") or 0) + (t.get("commission_usd") or 0)
                for t in chunk
            )
            chunk_profits.append(chunk_profit)

        if len(chunk_profits) < 3:
            return None

        profits_arr = np.array(chunk_profits)
        best_chunk = float(np.max(profits_arr))
        worst_chunk = float(np.min(profits_arr))
        std_chunks = float(np.std(profits_arr))
        mean_chunks = float(np.mean(profits_arr))

        # High coefficient of variation = inconsistent performance across periods
        cv = std_chunks / abs(mean_chunks) if mean_chunks != 0 else 0

        # Overfitting signal: performance in best period is > 5x average AND CV > 2
        is_suspicious = cv > 2.0 and best_chunk > abs(mean_chunks) * 5 and worst_chunk < 0

        if not is_suspicious:
            return None

        score = min(100, int(cv * 20))

        return AnomalyResult(
            anomaly_type="suspected_overfitting",
            severity="warning",
            score=score,
            title="Inconsistent Performance Across Periods",
            description=(
                f"Performance varies significantly across time periods (CV: {cv:.2f}). "
                f"Best period profit: ${best_chunk:.2f}, worst: ${worst_chunk:.2f}. "
                "High variance across periods may indicate a strategy optimized for specific "
                "market conditions that may not generalize to future conditions (overfitting)."
            ),
            evidence={
                "coefficient_of_variation": round(cv, 2),
                "best_period_profit": round(best_chunk, 2),
                "worst_period_profit": round(worst_chunk, 2),
                "periods_analyzed": len(chunk_profits),
            },
        )
