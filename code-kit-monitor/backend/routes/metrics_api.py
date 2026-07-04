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


@router.get("/entity-breakdown")
def api_entity_breakdown(minutes: int = 1440, request: Request = None, db: Session = Depends(get_db)):
    """按实体名聚合——展示哪个工具/工作流/Agent 消耗了多少 token."""
    from models.metrics import SessionMetric
    from sqlalchemy import func
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(minutes=minutes)

    def _agg(entity_type: str) -> list[dict]:
        rows = db.query(SessionMetric.tool_name, func.sum(SessionMetric.total_tokens).label('tokens'), func.count(SessionMetric.id).label('calls'), func.sum(SessionMetric.duration_ms).label('ms')).filter(SessionMetric.entity_type == entity_type, SessionMetric.timestamp >= since, SessionMetric.tool_name != '').group_by(SessionMetric.tool_name).order_by(func.sum(SessionMetric.total_tokens).desc()).limit(20).all()
        return [{"name": r.tool_name, "tokens": int(r.tokens or 0), "calls": int(r.calls or 0), "total_ms": int(r.ms or 0)} for r in rows]

    return {
        "tools": _agg("tool"),
        "workflows": _agg("workflow"),
        "agents": _agg("agent"),
        "projects": _agg("project"),
    }


@router.post("/record")
def api_record_metric(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    owner = user["id"] if user else "system"
    record_metric(db, payload["entity_type"], payload["entity_id"], owner, payload.get("model_name", ""), payload.get("token_count", 0), payload.get("tool_hit_count", 0), payload.get("execution_time_ms", 0), payload.get("status", "success"))
    return {"status": "recorded"}


# ── Orchestration 拓扑级 Metrics ──

@router.get("/orchestration/{instance_id}")
def api_orchestration_metrics(instance_id: int, minutes: int = 60, request: Request = None, db: Session = Depends(get_db)):
    """拓扑级监控聚合：总 token、平均执行时间、成功率、时序."""
    from models.orchestration import TraceSpan, OrchestrationInstance
    from datetime import datetime, timedelta
    from sqlalchemy import func

    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")

    since = datetime.utcnow() - timedelta(minutes=minutes)
    spans = db.query(TraceSpan).filter(
        TraceSpan.instance_id == instance_id,
        TraceSpan.timestamp >= since,
    ).all()

    total_tokens = sum(s.tokens for s in spans)
    total_calls = len(spans)
    avg_duration = int(sum(s.duration_ms for s in spans) / total_calls) if total_calls else 0
    success_count = sum(1 for s in spans if s.span_type == "agent_call")
    success_rate = round(success_count / total_calls * 100, 1) if total_calls else 0

    # 5min 粒度时序
    timeline: dict[str, dict] = {}
    for s in spans:
        bucket = s.timestamp.strftime("%Y-%m-%dT%H:%M")
        if bucket not in timeline:
            timeline[bucket] = {"tokens": 0, "calls": 0}
        timeline[bucket]["tokens"] += s.tokens
        timeline[bucket]["calls"] += 1

    return {
        "instance_id": instance_id,
        "total_tokens": total_tokens,
        "total_calls": total_calls,
        "avg_duration_ms": avg_duration,
        "success_rate": success_rate,
        "timeline": {k: v for k, v in sorted(timeline.items())},
        "minutes": minutes,
    }


@router.get("/orchestration/{instance_id}/trace")
def api_orchestration_trace(instance_id: int, request: Request = None, db: Session = Depends(get_db)):
    """调用链追踪：返回所有 TraceSpan."""
    from models.orchestration import TraceSpan as TS
    spans = db.query(TS).filter(
        TS.instance_id == instance_id
    ).order_by(TS.timestamp).all()
    return [
        {
            "id": s.id, "from_agent_id": s.from_agent_id, "to_agent_id": s.to_agent_id,
            "duration_ms": s.duration_ms, "tokens": s.tokens,
            "span_type": s.span_type, "timestamp": s.timestamp.isoformat(),
        }
        for s in spans
    ]


@router.get("/orchestration/{instance_id}/trace/{span_id}")
def api_trace_span_detail(instance_id: int, span_id: int, request: Request = None, db: Session = Depends(get_db)):
    """单个 span 详情（含 input/output 摘要，不返回完整内容）."""
    from models.orchestration import TraceSpan as TS
    span = db.query(TS).filter(TS.id == span_id, TS.instance_id == instance_id).first()
    if not span:
        raise HTTPException(status_code=404, detail="span 不存在")
    return {
        "id": span.id, "from_agent_id": span.from_agent_id, "to_agent_id": span.to_agent_id,
        "duration_ms": span.duration_ms, "tokens": span.tokens,
        "input_hash": span.input_hash, "output_hash": span.output_hash,
        "span_type": span.span_type, "timestamp": span.timestamp.isoformat(),
    }


@router.get("/orchestration/queue/depth")
def api_queue_depth(request: Request = None, db: Session = Depends(get_db)):
    """调度队列深度 + 等待时间."""
    from models.orchestration import SchedulingQueue as SQ
    from datetime import datetime
    now = datetime.utcnow()
    entries = db.query(SQ).filter(SQ.status.in_(["queued", "scheduled"])).all()
    wait_times = [(now - e.enqueued_at).total_seconds() for e in entries if e.enqueued_at]
    return {
        "depth": len(entries),
        "avg_wait_seconds": round(sum(wait_times) / len(wait_times), 1) if wait_times else 0,
        "max_wait_seconds": round(max(wait_times), 1) if wait_times else 0,
    }
