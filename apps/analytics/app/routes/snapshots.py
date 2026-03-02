from fastapi import APIRouter
from app.models.trade import AnalyzeRequest
from app.services.metrics_calculator import calculate_all_metrics
import asyncpg, os
from datetime import date

router = APIRouter()

@router.post("/")
async def create_snapshot(request: AnalyzeRequest):
    metrics = calculate_all_metrics(request.bot_id, request.trades, request.initial_balance)
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        await conn.execute(
            """INSERT INTO performance_snapshots (bot_id, snapshot_date, total_trades, winning_trades, losing_trades, win_rate, profit_factor, sharpe_ratio, sortino_ratio, max_drawdown_pct, max_drawdown_abs, total_profit_usd, avg_rrr, expectancy_usd, recovery_factor, calmar_ratio, period_type)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'all_time')
               ON CONFLICT (bot_id, snapshot_date, period_type) DO UPDATE SET total_trades=EXCLUDED.total_trades, calculated_at=NOW()""",
            request.bot_id, date.today(), metrics.total_trades, metrics.winning_trades, metrics.losing_trades,
            metrics.win_rate, metrics.profit_factor, metrics.sharpe_ratio, metrics.sortino_ratio,
            metrics.max_drawdown_pct, metrics.max_drawdown_abs, metrics.total_profit_usd,
            metrics.avg_rrr, metrics.expectancy_usd, metrics.recovery_factor, metrics.calmar_ratio,
        )
    finally:
        await conn.close()
    return {"status": "snapshot saved", "bot_id": request.bot_id}
