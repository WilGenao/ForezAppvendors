import pytest
import numpy as np
from datetime import datetime, timedelta
from app.services.metrics_calculator import MetricsCalculator
from app.schemas.trade import TradeRecord, TradeDirection


def make_trade(profit: float, lot: float = 1.0, days_offset: int = 0) -> TradeRecord:
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
        account_balance=10000.0,
    )


class TestMetricsCalculator:
    def setup_method(self):
        self.calc = MetricsCalculator(risk_free_rate=0.05)

    def test_win_rate_calculation(self):
        trades = [make_trade(100), make_trade(-50), make_trade(75), make_trade(-25)]
        profits = np.array([t.profit_usd for t in trades])
        result = self.calc.win_rate(profits)
        assert result == 0.5

    def test_win_rate_all_winners(self):
        profits = np.array([100.0, 50.0, 75.0])
        assert self.calc.win_rate(profits) == 1.0

    def test_profit_factor_calculation(self):
        # Ganancias: 100 + 75 = 175; Pérdidas: 50 + 25 = 75
        # PF = 175/75 ≈ 2.33
        profits = np.array([100.0, -50.0, 75.0, -25.0])
        pf = self.calc.profit_factor(profits)
        assert pf is not None
        assert abs(pf - (175 / 75)) < 0.001

    def test_profit_factor_no_losses(self):
        profits = np.array([100.0, 50.0, 75.0])
        # Sin pérdidas, PF es None (potencial manipulación)
        assert self.calc.profit_factor(profits) is None

    def test_max_drawdown_percentage(self):
        # Equity: [100, 110, 95, 105] -> peak 110, valley 95 -> DD = 15/110 ≈ 13.6%
        equity = np.array([100.0, 110.0, 95.0, 105.0])
        mdd = self.calc.max_drawdown_percentage(equity, 100.0)
        assert mdd is not None
        expected = (110.0 - 95.0) / 110.0
        assert abs(mdd - expected) < 0.001

    def test_expectancy_positive(self):
        # 60% win rate, avg win 100, avg loss 50 -> E = 0.6*100 - 0.4*50 = 40
        profits = np.array([100.0, 100.0, 100.0, -50.0, -50.0, 100.0])
        result = self.calc.expectancy(profits)
        assert result is not None
        assert result > 0

    def test_sharpe_requires_minimum_trades(self):
        profits = np.array([100.0, -50.0])  # Solo 2 trades
        result = self.calc.sharpe_ratio_annualized(profits, 10000.0)
        assert result is None  # Requiere mínimo 10 trades

    def test_sharpe_with_sufficient_trades(self):
        # 20 trades con perfil razonable
        profits = np.array([50.0, -20.0, 30.0, -10.0] * 5)
        result = self.calc.sharpe_ratio_annualized(profits, 10000.0)
        assert result is not None
        assert isinstance(result, float)

    def test_recovery_factor(self):
        profits = np.array([100.0, 50.0, -80.0, 200.0])
        equity = np.cumsum(profits) + 10000.0
        rf = self.calc.recovery_factor(profits, equity)
        assert rf is not None
        # Net profit = 270, max DD abs = 80 -> RF = 270/80 = 3.375
        assert abs(rf - (270 / 80)) < 0.01

    def test_empty_trades_returns_zeros(self):
        result = self.calc.calculate_all([], 10000.0)
        assert result["total_trades"] == 0
        assert result["win_rate"] == 0.0
        assert result["total_profit_usd"] == 0.0