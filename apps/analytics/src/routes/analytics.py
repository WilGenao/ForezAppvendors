from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from ..database import get_db
from ..schemas.trade import AnalyzeRequest, MetricsResponse
from ..services.metrics import MetricsCalculator, TradeRecord
from ..services.anomaly_detection import AnomalyDetector

router = APIRouter(tags=["Analytics"])

@router.post("/analyze", response_model=MetricsResponse)
async def analyze_bot(request: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """
    Fetch all trade history for a bot and compute full metrics + anomaly detection.
    Called by NestJS after track record upload.
    """
    result = await db.execute(
        text("""
            SELECT symbol, direction, volume_lots, open_price, close_price,
                   open_time, close_time, profit_usd, commission_usd, swap_usd,
                   stop_loss, take_profit, magic_number, comment,
                   account_balance_at_open, account_balance_at_close
            FROM trade_history
            WHERE bot_id = :bot_id
            ORDER BY open_time ASC
        """),
        {"bot_id": request.bot_id}
    )
    rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No trades found for bot {request.bot_id}")

    trades_raw = [dict(r._mapping) for r in rows]

    trade_records = [
        TradeRecord(
            profit_usd=t.get("profit_usd") or 0,
            commission_usd=t.get("commission_usd") or 0,
            swap_usd=t.get("swap_usd") or 0,
            open_time=t.get("open_time"),
            close_time=t.get("close_time"),
            volume_lots=t.get("volume_lots") or 0,
            open_price=t.get("open_price") or 0,
            close_price=t.get("close_price"),
            stop_loss=t.get("stop_loss"),
            take_profit=t.get("take_profit"),
            account_balance_at_open=t.get("account_balance_at_open"),
            account_balance_at_close=t.get("account_balance_at_close"),
            symbol=t.get("symbol") or "",
            direction=t.get("direction") or "buy",
        )
        for t in trades_raw
    ]

    calc = MetricsCalculator(risk_free_rate=request.risk_free_rate)
    metrics = calc.calculate_all(trade_records)

    detector = AnomalyDetector()
    anomalies = detector.detect_all(trades_raw)
    anomaly_list = [
        {
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "score": a.score,
            "title": a.title,
            "description": a.description,
            "evidence": a.evidence,
        }
        for a in anomalies
    ]

    # Save snapshot to DB
    await db.execute(
        text("""
            INSERT INTO performance_snapshots (
                id, bot_id, snapshot_date, total_trades, winning_trades, losing_trades,
                win_rate, profit_factor, sharpe_ratio, sortino_ratio,
                max_drawdown_pct, max_drawdown_abs, total_profit_usd, total_loss_usd,
                net_profit_usd, expectancy_usd, avg_rrr, recovery_factor, calmar_ratio,
                trade_date_start, trade_date_end, calculation_version, raw_metrics
            ) VALUES (
                gen_random_uuid(), :bot_id, CURRENT_DATE,
                :total_trades, :winning_trades, :losing_trades,
                :win_rate, :profit_factor, :sharpe_ratio, :sortino_ratio,
                :max_drawdown_pct, :max_drawdown_abs, :total_profit_usd, :total_loss_usd,
                :net_profit_usd, :expectancy_usd, :avg_rrr, :recovery_factor, :calmar_ratio,
                :trade_date_start, :trade_date_end, '1.0', :raw_metrics::jsonb
            )
            ON CONFLICT (bot_id, snapshot_date) DO UPDATE SET
                total_trades = EXCLUDED.total_trades,
                winning_trades = EXCLUDED.winning_trades,
                losing_trades = EXCLUDED.losing_trades,
                win_rate = EXCLUDED.win_rate,
                profit_factor = EXCLUDED.profit_factor,
                sharpe_ratio = EXCLUDED.sharpe_ratio,
                sortino_ratio = EXCLUDED.sortino_ratio,
                max_drawdown_pct = EXCLUDED.max_drawdown_pct,
                max_drawdown_abs = EXCLUDED.max_drawdown_abs,
                total_profit_usd = EXCLUDED.total_profit_usd,
                total_loss_usd = EXCLUDED.total_loss_usd,
                net_profit_usd = EXCLUDED.net_profit_usd,
                expectancy_usd = EXCLUDED.expectancy_usd,
                avg_rrr = EXCLUDED.avg_rrr,
                recovery_factor = EXCLUDED.recovery_factor,
                calmar_ratio = EXCLUDED.calmar_ratio,
                trade_date_start = EXCLUDED.trade_date_start,
                trade_date_end = EXCLUDED.trade_date_end,
                raw_metrics = EXCLUDED.raw_metrics
        """),
        {**metrics, "bot_id": request.bot_id, "raw_metrics": "{}"}
    )

    # Save anomalies
    if anomaly_list:
        await db.execute(text("DELETE FROM anomaly_flags WHERE bot_id = :bot_id AND is_resolved = false"), {"bot_id": request.bot_id})
        for a in anomaly_list:
            import json
            await db.execute(
                text("""
                    INSERT INTO anomaly_flags (id, bot_id, anomaly_type, severity, score, title, description, evidence)
                    VALUES (gen_random_uuid(), :bot_id, :anomaly_type, :severity::anomaly_severity, :score, :title, :description, :evidence::jsonb)
                """),
                {
                    "bot_id": request.bot_id,
                    "anomaly_type": a["anomaly_type"],
                    "severity": a["severity"],
                    "score": a["score"],
                    "title": a["title"],
                    "description": a["description"],
                    "evidence": json.dumps(a["evidence"]),
                }
            )

    # Update bot verification status
    critical_anomalies = [a for a in anomaly_list if a["severity"] == "critical"]
    await db.execute(
        text("""
            UPDATE bots SET
                is_track_record_verified = :verified,
                verification_completed_at = NOW()
            WHERE id = :bot_id
        """),
        {"bot_id": request.bot_id, "verified": len(critical_anomalies) == 0 and metrics.get("total_trades", 0) >= 100}
    )

    await db.commit()

    return MetricsResponse(bot_id=request.bot_id, anomalies=anomaly_list, **metrics)


@router.get("/metrics/{bot_id}", response_model=MetricsResponse)
async def get_metrics(bot_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM performance_snapshots WHERE bot_id = :bot_id ORDER BY snapshot_date DESC LIMIT 1"),
        {"bot_id": bot_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No metrics found for this bot")
    data = dict(row._mapping)
    anomalies_result = await db.execute(
        text("SELECT anomaly_type, severity, score, title, description FROM anomaly_flags WHERE bot_id = :bot_id AND is_resolved = false"),
        {"bot_id": bot_id}
    )
    anomalies = [dict(r._mapping) for r in anomalies_result.fetchall()]
    return MetricsResponse(bot_id=bot_id, anomalies=anomalies, **{
        k: v for k, v in data.items()
        if k not in ("id", "bot_id", "snapshot_date", "calculation_version", "raw_metrics", "created_at")
    })
