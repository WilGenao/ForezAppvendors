from pydantic import BaseModel
from typing import List, Dict, Any
from enum import Enum

class AnomalySeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"

class AnomalyResult(BaseModel):
    anomaly_type: str
    severity: AnomalySeverity
    score: int  # 0-100
    description: str
    details: Dict[str, Any] = {}

class AnomalyReport(BaseModel):
    bot_id: str
    anomalies: List[AnomalyResult]
    is_flagged: bool
    overall_risk_score: int  # 0-100
