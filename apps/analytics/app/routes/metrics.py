from fastapi import APIRouter, HTTPException
import asyncpg, os

router = APIRouter()

@router.get("/{bot_id}")
async def get_metrics(bot_id: str):
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        row = await conn.fetchrow("SELECT * FROM performance_snapshots WHERE bot_id = $1 AND period_type = 'all_time' ORDER BY snapshot_date DESC LIMIT 1", bot_id)
        if not row:
            raise HTTPException(status_code=404, detail="No metrics found")
        return dict(row)
    finally:
        await conn.close()
