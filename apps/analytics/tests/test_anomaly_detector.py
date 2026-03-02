import pytest
from datetime import datetime, timedelta
from app.services.anomaly_detector import AnomalyDetector
from app.schemas.trade import TradeRecord, TradeDirection


def make_trade(profit: float, lot: float = 1.0, days_offset: int = 0, balance: float = 10000.0) -> TradeRecord:
    base = datetime(2024, 1, 1)
    return TradeRecord(
        direction=TradeDirection.BUY,
        symbol="EURUSD",
        lot_size=lot,
        open_price=1.1000,
        close_price=1.1010 if profit > 0 else 1.0990,
        profit_usd=profit,
        opened_at=base + timedelta(days=days_offset),
        closed_at=base + timedelta(days=days_offset, hours=1),
        account_balance=balance,
    )


class TestAnomalyDetector:
    def setup_method(self):
        self.detector = AnomalyDetector()

    def test_insufficient_history_detected(self):
        trades = [make_trade(50 if i % 3 != 0 else -20) for i in range(30)]
        result = self.detector.detect_insufficient_history(trades)
        assert result is not None
        assert result["anomaly_type"] == "insufficient_history"
        assert result["severity"] == "critical"

    def test_sufficient_history_no_flag(self):
        trades = [make_trade(50 if i % 3 != 0 else -20) for i in range(100)]
        result = self.detector.detect_insufficient_history(trades)
        assert result is None

    def test_martingale_detected(self):
        # Patrón claro: pierde y duplica lote
        trades = [
            make_trade(-50, lot=1.0, days_offset=0),
            make_trade(-80, lot=2.0, days_offset=1),  # 2x después de pérdida
            make_trade(-120, lot=4.0, days_offset=2),  # 2x otra vez
            make_trade(300, lot=8.0, days_offset=3),
        ]
        result = self.detector.detect_extreme_martingale(trades)
        assert result is not None
        assert result["anomaly_type"] == "extreme_martingale"

    def test_no_martingale_normal_trading(self):
        # Lotes consistentes
        trades = [make_trade(50 if i % 3 != 0 else -20, lot=1.0, days_offset=i) for i in range(20)]
        result = self.detector.detect_extreme_martingale(trades)
        assert result is None

    def test_excessive_risk_detected(self):
        # Pérdidas >5% del balance
        trades = [make_trade(-600, balance=10000.0, days_offset=i) for i in range(5)]  # 6% del balance
        trades += [make_trade(50, balance=10000.0, days_offset=i+5) for i in range(15)]
        result = self.detector.detect_excessive_risk_per_trade(trades, 10000.0)
        assert result is not None
        assert result["anomaly_type"] == "excessive_risk_per_trade"

    def test_no_excessive_risk_normal(self):
        # Pérdidas <5% del balance
        trades = [make_trade(50 if i % 3 != 0 else -100, balance=10000.0, days_offset=i) for i in range(20)]
        result = self.detector.detect_excessive_risk_per_trade(trades, 10000.0)
        assert result is None