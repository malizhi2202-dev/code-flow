"""监控 API 路由 — 实体级 + 全局汇总."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from services.metrics_service import get_metrics, get_global_metrics, record_metric

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/{entity_type}/{entity_id}")
def api_get_metrics(entity_type: str, entity_id: int, minutes: int = 60, request: Request = None, db: Session = Depends(get_db)):
    return get_metrics(db, entity_type, entity_id, minutes)


@router.get("/global")
def api_get_global_metrics(minutes: int = 60, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    if user and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="仅 admin 可查看全局监控")
    return get_global_metrics(db, minutes)


@router.get("/sessions")
def api_get_sessions(entity_type: str | None = None, limit: int = 50, request: Request = None, db: Session = Depends(get_db)):
    """获取会话级监控数据."""
    from models.metrics import SessionMetric
    q = db.query(SessionMetric)
    if entity_type:
        q = q.filter(SessionMetric.entity_type == entity_type)
    sessions = q.order_by(SessionMetric.timestamp.desc()).limit(limit).all()
    return {"sessions": [s.to_dict() for s in sessions], "total": len(sessions)}


@router.get("/live")
def api_get_live(minutes: int = 10, request: Request = None, db: Session = Depends(get_db)):
    """获取最近 N 分钟的实时监控汇总."""
    from models.metrics import SessionMetric
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(minutes=minutes)
    sessions = db.query(SessionMetric).filter(SessionMetric.timestamp >= since).all()
    by_model = {}
    by_entity = {}
    by_tool = {}
    total_tokens = 0
    for s in sessions:
        total_tokens += s.total_tokens
        by_model[s.model_name] = by_model.get(s.model_name, 0) + s.total_tokens
        by_entity[s.entity_type] = by_entity.get(s.entity_type, 0) + s.total_tokens
        if s.tool_name:
            by_tool[s.tool_name] = by_tool.get(s.tool_name, 0) + 1
    return {
        "total_sessions": len(sessions), "total_tokens": total_tokens,
        "by_model": by_model, "by_entity": by_entity, "by_tool": dict(sorted(by_tool.items(), key=lambda x: -x[1])[:10]),
        "minutes": minutes
    }


@router.post("/record")
def api_record_metric(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    owner = user["id"] if user else "system"
    record_metric(db, payload["entity_type"], payload["entity_id"], owner, payload.get("model_name", ""), payload.get("token_count", 0), payload.get("tool_hit_count", 0), payload.get("execution_time_ms", 0), payload.get("status", "success"))
    return {"status": "recorded"}
