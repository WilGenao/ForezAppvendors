"""
Unit tests for metrics calculator.
Run: pytest src/tests/test_metrics.py -v
"""
import pytest
from datetime import datetime, timedelta
from ..services.metrics import MetricsCalculator, TradeRecord


def make_trade(profit: float, days_offset: int = 0, balance: float = 10000) -> TradeRecord:
    open_time = datetime(2024, 1, 1) + timedelta(days=days_offset)
    return TradeRecord(
        profit_usd=profit,
        commission_usd=0,
        swap_usd=0,
        open_time=open_time,
        close_time=open_time + timedelta(hours=2),
        volume_lots=0.1,
        open_price=1.0800,
        close_price=1.0900 if profit > 0 else 1.0700,
        stop_loss=1.0750,
        take_profit=1.0900,
        account_balance_at_open=balance,
        account_balance_at_close=balance + profit,
        symbol="EURUSD",
        direction="buy",
    )


def test_empty_trades():
    calc = MetricsCalculator()
    result = calc.calculate_all([])
    assert result["total_trades"] is None


def test_win_rate_calculation():
    trades = [make_trade(100), make_trade(50), make_trade(-30), make_trade(70), make_trade(-20)]
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    assert result["total_trades"] == 5
    assert result["winning_trades"] == 3
    assert result["losing_trades"] == 2
    assert result["win_rate"] == pytest.approx(0.6, abs=0.001)


def test_profit_factor():
    trades = [make_trade(100), make_trade(50), make_trade(-30), make_trade(-20)]
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    # Gross profit = 150, Gross loss = 50, PF = 3.0
    assert result["profit_factor"] == pytest.approx(3.0, abs=0.01)


def test_net_profit():
    trades = [make_trade(100), make_trade(50), make_trade(-30)]
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    assert result["net_profit_usd"] == pytest.approx(120.0, abs=0.01)


def test_sharpe_ratio_positive_series():
    # Consistently profitable trades should have positive Sharpe
    trades = [make_trade(50 + i, i) for i in range(20)]
    calc = MetricsCalculator(risk_free_rate=0.0)
    result = calc.calculate_all(trades)
    assert result["sharpe_ratio"] is not None
    assert result["sharpe_ratio"] > 0


def test_max_drawdown():
    # Trades: up 100, up 50, down 80, up 30
    trades = [
        make_trade(100, 0),
        make_trade(50, 1),
        make_trade(-80, 2),
        make_trade(30, 3),
    ]
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    assert result["max_drawdown_abs"] == pytest.approx(80.0, abs=0.01)


def test_expectancy_positive():
    # 80% win rate, avg win $100, avg loss $50 -> expectancy = 0.8*100 - 0.2*50 = 70
    trades = [make_trade(100)] * 8 + [make_trade(-50)] * 2
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    assert result["expectancy_usd"] == pytest.approx(70.0, abs=1.0)


def test_single_trade():
    trades = [make_trade(100, 0)]
    calc = MetricsCalculator()
    result = calc.calculate_all(trades)
    assert result["total_trades"] == 1
    assert result["sharpe_ratio"] is None  # need >= 2 trades for Sharpe
