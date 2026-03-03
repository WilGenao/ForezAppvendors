import pytest
from datetime import datetime, timedelta
from app.models.trade import Trade, TradeDirection
from app.services.metrics_calculator import calculate_all_metrics, _profit_factor, _max_drawdown, _sharpe_ratio

def make_trade(profit: float, days_ago: int = 0, lot: float = 0.1) -> Trade:
    base = datetime(2023, 1, 1) + timedelta(days=days_ago)
    return Trade(
        ticket=abs(hash(f"{profit}{days_ago}")), direction=TradeDirection.buy,
        symbol="EURUSD", lot_size=lot, open_price=1.1000,
        close_price=1.1010 if profit > 0 else 1.0990,
        profit_usd=profit, opened_at=base, closed_at=base + timedelta(hours=2),
        account_balance_before=10000, account_balance_after=10000 + profit,
    )

def test_profit_factor_basic():
    pf = _profit_factor([100.0, 200.0, 150.0], [-50.0, -80.0])
    assert pf is not None and abs(pf - (450.0 / 130.0)) < 0.001

def test_profit_factor_no_losses():
    assert _profit_factor([100, 200], []) is None

def test_max_drawdown_simple():
    dd_pct, dd_abs = _max_drawdown([10000, 11000, 9500, 10500, 9000])
    assert dd_abs is not None and abs(dd_abs - 2000.0) < 0.01

def test_sharpe_insufficient_data():
    assert _sharpe_ratio([50.0], 0.05) is None

def test_full_metrics_50_trades():
    trades = [make_trade(100 if i % 3 != 0 else -60, days_ago=i) for i in range(50)]
    result = calculate_all_metrics("bot-test", trades, initial_balance=10000.0)
    assert result.total_trades == 50
    assert result.win_rate is not None and 0.6 < result.win_rate < 0.8
    assert result.profit_factor is not None and result.profit_factor > 1.0

def test_metrics_open_trade_has_no_metrics():
    # Trade sin closed_at = abierto, no genera métricas de P&L
    trades = [Trade(ticket=1, direction=TradeDirection.buy, symbol="EURUSD", lot_size=0.1, open_price=1.1, opened_at=datetime.now())]
    result = calculate_all_metrics("bot-test", trades, initial_balance=10000.0)
    assert result.sharpe_ratio is None
    assert result.win_rate is None
    assert result.total_profit_usd == 0.0
