"""监控 API 路由 — 实体级 + 全局汇总."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
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


# ── 实体维度消耗分拆 ──

@router.get("/entity/{entity_type}/{entity_id}/breakdown")
def api_entity_breakdown_detail(entity_type: str, entity_id: int, minutes: int = 60, request: Request = None, db: Session = Depends(get_db)):
    """单实体消耗分拆：自身 + 子工作流 + 工具，1min 桶."""
    from datetime import datetime, timedelta
    from models.metrics import SessionMetric
    from models.agent import Agent
    from models.workflow import Workflow

    since = datetime.utcnow() - timedelta(minutes=minutes)

    # 解析 owner_id（数据隔离）
    owner_id = None
    if entity_type == "agent":
        ag = db.query(Agent).filter(Agent.id == entity_id).first()
        owner_id = ag.owner_id if ag else None
    elif entity_type == "workflow":
        wf = db.query(Workflow).filter(Workflow.id == entity_id).first()
        owner_id = "admin"  # workflow 无 owner_id 字段，默认隔离到 admin
    elif entity_type == "orchestration":
        from models.orchestration import OrchestrationInstance
        orch = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == entity_id).first()
        owner_id = orch.owner_id if orch else None
    elif entity_type == "project":
        from models.project import Project as Pj
        pj = db.query(Pj).filter(Pj.id == entity_id).first()
        owner_id = pj.owner_id if pj else None

    base_filter = [
        SessionMetric.entity_type == entity_type,
        SessionMetric.entity_id == entity_id,
        SessionMetric.timestamp >= since,
    ]
    if owner_id:
        base_filter.append(SessionMetric.owner_id == owner_id)

    sessions = db.query(SessionMetric).filter(*base_filter).order_by(SessionMetric.timestamp.asc()).all()

    # 自身时序桶
    buckets: dict[int, int] = {}
    # 工具聚合
    tool_info: dict[str, dict] = {}
    total_calls = 0

    for s in sessions:
        ts_bucket = int(s.timestamp.timestamp()) // 60 * 60
        buckets[ts_bucket] = buckets.get(ts_bucket, 0) + s.total_tokens
        total_calls += 1
        if s.tool_name:
            if s.tool_name not in tool_info:
                tool_info[s.tool_name] = {"name": s.tool_name, "tokens": 0, "hits": 0}
            tool_info[s.tool_name]["tokens"] += s.total_tokens
            tool_info[s.tool_name]["hits"] += 1

    total_tokens = sum(s.total_tokens for s in sessions)

    result = {
        "entity_type": entity_type, "entity_id": entity_id, "minutes": minutes,
        "total_tokens": total_tokens, "total_calls": total_calls,
        "avg_tokens_per_min": round(total_tokens / max(minutes, 1)),
        "buckets": [{"ts": ts, "tokens": v} for ts, v in sorted(buckets.items())],
        "tools": sorted(tool_info.values(), key=lambda x: -x["tokens"]),
    }

    # 如果是 agent，加工作流分拆
    if entity_type == "agent":
        ag = db.query(Agent).filter(Agent.id == entity_id).first()
        wf_ids = (ag.workflow_ids or []) if ag else []
        if ag and ag.workflow_id and ag.workflow_id not in wf_ids:
            wf_ids.append(ag.workflow_id)
        wf_list = []
        for wf_id in wf_ids:
            wf_filters = [
                SessionMetric.entity_type == "workflow",
                SessionMetric.entity_id == wf_id,
                SessionMetric.timestamp >= since,
            ]
            if owner_id:
                wf_filters.append(SessionMetric.owner_id == owner_id)
            wf_sessions = db.query(SessionMetric).filter(*wf_filters).all()
            if wf_sessions:
                wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
                wf_total = sum(s.total_tokens for s in wf_sessions)
                wf_buckets: dict[int, int] = {}
                wf_tools: dict[str, dict] = {}
                for s in wf_sessions:
                    ts = int(s.timestamp.timestamp()) // 60 * 60
                    wf_buckets[ts] = wf_buckets.get(ts, 0) + s.total_tokens
                    if s.tool_name:
                        if s.tool_name not in wf_tools:
                            wf_tools[s.tool_name] = {"name": s.tool_name, "tokens": 0, "hits": 0}
                        wf_tools[s.tool_name]["tokens"] += s.total_tokens
                        wf_tools[s.tool_name]["hits"] += 1
                wf_list.append({
                    "entity_id": wf_id, "name": wf.name if wf else f"WF#{wf_id}",
                    "total_tokens": wf_total, "calls": len(wf_sessions),
                    "buckets": [{"ts": ts, "tokens": v} for ts, v in sorted(wf_buckets.items())],
                    "tools": sorted(wf_tools.values(), key=lambda x: -x["tokens"]),
                })
        result["workflows"] = sorted(wf_list, key=lambda x: -x["total_tokens"])

    # 如果是编排组，加子 Agent 分拆
    if entity_type == "orchestration":
        from models.orchestration import OrchestrationInstance
        orch = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == entity_id).first()
        agent_list = []
        if orch:
            for ag_id in (orch.agent_ids or []):
                ag_sessions = db.query(SessionMetric).filter(
                    SessionMetric.entity_type == "agent",
                    SessionMetric.entity_id == ag_id,
                    SessionMetric.timestamp >= since,
                    *([SessionMetric.owner_id == owner_id] if owner_id else []),
                ).all()
                if ag_sessions:
                    ag = db.query(Agent).filter(Agent.id == ag_id).first()
                    ag_total = sum(s.total_tokens for s in ag_sessions)
                    ag_buckets: dict[int, int] = {}
                    for s in ag_sessions:
                        ts = int(s.timestamp.timestamp()) // 60 * 60
                        ag_buckets[ts] = ag_buckets.get(ts, 0) + s.total_tokens
                    # Agent 的工作流 + 工具消耗
                    ag_wf_list = []
                    if ag:
                        wf_ids = (ag.workflow_ids or [])[:]
                        if ag.workflow_id and ag.workflow_id not in wf_ids:
                            wf_ids.append(ag.workflow_id)
                        for wf_id in wf_ids:
                            wf_s = db.query(SessionMetric).filter(
                                SessionMetric.entity_type == "workflow",
                                SessionMetric.entity_id == wf_id,
                                SessionMetric.timestamp >= since,
                                *([SessionMetric.owner_id == owner_id] if owner_id else []),
                            ).all()
                            if wf_s:
                                wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
                                wf_total_s = sum(s2.total_tokens for s2 in wf_s)
                                wf_b: dict[int, int] = {}
                                wf_t: dict[str, dict] = {}
                                for s2 in wf_s:
                                    ts2 = int(s2.timestamp.timestamp()) // 60 * 60
                                    wf_b[ts2] = wf_b.get(ts2, 0) + s2.total_tokens
                                    if s2.tool_name:
                                        if s2.tool_name not in wf_t:
                                            wf_t[s2.tool_name] = {"name": s2.tool_name, "tokens": 0, "hits": 0}
                                        wf_t[s2.tool_name]["tokens"] += s2.total_tokens
                                        wf_t[s2.tool_name]["hits"] += 1
                                ag_wf_list.append({
                                    "entity_id": wf_id, "name": wf.name if wf else f"WF#{wf_id}",
                                    "total_tokens": wf_total_s, "calls": len(wf_s),
                                    "buckets": [{"ts": ts2, "tokens": v2} for ts2, v2 in sorted(wf_b.items())],
                                    "tools": sorted(wf_t.values(), key=lambda x2: -x2["tokens"]),
                                })
                    agent_list.append({
                        "entity_id": ag_id, "name": ag.name if ag else f"Agent#{ag_id}",
                        "total_tokens": ag_total, "calls": len(ag_sessions),
                        "buckets": [{"ts": ts, "tokens": v} for ts, v in sorted(ag_buckets.items())],
                        "workflows": sorted(ag_wf_list, key=lambda x: -x["total_tokens"]),
                    })
        result["agents"] = sorted(agent_list, key=lambda x: -x["total_tokens"])

    # 如果是项目，复用项目级分拆逻辑
    if entity_type == "project":
        from models.project import Project as Pj
        pj = db.query(Pj).filter(Pj.id == entity_id).first()
        if pj:
            pj_sessions = db.query(SessionMetric).filter(
                SessionMetric.owner_id == pj.owner_id,
                SessionMetric.timestamp >= since,
                SessionMetric.entity_type.in_(["agent", "workflow"]),
            ).order_by(SessionMetric.timestamp.asc()).all()
            # 总体 buckets + 工具
            for s in pj_sessions:
                ts_b = int(s.timestamp.timestamp()) // 60 * 60
                buckets[ts_b] = buckets.get(ts_b, 0) + s.total_tokens
                total_calls += 1
                if s.tool_name:
                    if s.tool_name not in tool_info:
                        tool_info[s.tool_name] = {"name": s.tool_name, "tokens": 0, "hits": 0}
                    tool_info[s.tool_name]["tokens"] += s.total_tokens
                    tool_info[s.tool_name]["hits"] += 1
            result["total_tokens"] = sum(s.total_tokens for s in pj_sessions)
            result["total_calls"] = len(pj_sessions)
            result["avg_tokens_per_min"] = round(result["total_tokens"] / max(minutes, 1))
            result["buckets"] = [{"ts": ts, "tokens": v} for ts, v in sorted(buckets.items())]
            result["tools"] = sorted(tool_info.values(), key=lambda x: -x["tokens"])
            # Agent + workflow 分拆
            ag_info: dict[str, dict] = {}
            wf_info: dict[str, dict] = {}
            for s in pj_sessions:
                eid = str(s.entity_id)
                if s.entity_type == "agent":
                    if eid not in ag_info:
                        ag = db.query(Agent).filter(Agent.id == s.entity_id).first()
                        ag_info[eid] = {"entity_id": s.entity_id, "name": ag.name if ag else f"Agent#{s.entity_id}", "total_tokens": 0, "calls": 0, "buckets_map": {}}
                    ag_info[eid]["total_tokens"] += s.total_tokens
                    ag_info[eid]["calls"] += 1
                    ts2 = int(s.timestamp.timestamp()) // 60 * 60
                    ag_info[eid]["buckets_map"][ts2] = ag_info[eid]["buckets_map"].get(ts2, 0) + s.total_tokens
                elif s.entity_type == "workflow":
                    if eid not in wf_info:
                        wf = db.query(Workflow).filter(Workflow.id == s.entity_id).first()
                        wf_info[eid] = {"entity_id": s.entity_id, "name": wf.name if wf else f"WF#{s.entity_id}", "total_tokens": 0, "calls": 0, "buckets_map": {}}
                    wf_info[eid]["total_tokens"] += s.total_tokens
                    wf_info[eid]["calls"] += 1
                    ts2 = int(s.timestamp.timestamp()) // 60 * 60
                    wf_info[eid]["buckets_map"][ts2] = wf_info[eid]["buckets_map"].get(ts2, 0) + s.total_tokens
            for info in ag_info.values():
                bm = info.pop("buckets_map", {})
                info["buckets"] = [{"ts": ts, "tokens": v} for ts, v in sorted(bm.items())]
            for info in wf_info.values():
                bm = info.pop("buckets_map", {})
                info["buckets"] = [{"ts": ts, "tokens": v} for ts, v in sorted(bm.items())]
            result["agents"] = sorted(ag_info.values(), key=lambda x: -x["total_tokens"])
            result["workflows"] = sorted(wf_info.values(), key=lambda x: -x["total_tokens"])

    return result


# ── 项目级消耗分拆 ──

@router.get("/project/{project_id}/breakdown")
def api_project_breakdown(project_id: int, minutes: int = 60, request: Request = None, db: Session = Depends(get_db)):
    """项目级消耗分拆：Agent + 子 Agent + 工作流，1min 桶."""
    from datetime import datetime, timedelta
    from models.metrics import SessionMetric
    from models.project import Project

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    since = datetime.utcnow() - timedelta(minutes=minutes)
    sessions = db.query(SessionMetric).filter(
        SessionMetric.owner_id == project.owner_id,
        SessionMetric.timestamp >= since,
        SessionMetric.entity_type.in_(["agent", "workflow"]),
    ).order_by(SessionMetric.timestamp.asc()).all()

    agent_buckets: dict[str, dict] = {}
    wf_buckets: dict[str, dict] = {}
    agent_info: dict[str, dict] = {}
    wf_info: dict[str, dict] = {}

    from models.agent import Agent
    from models.workflow import Workflow

    for s in sessions:
        ts_bucket = int(s.timestamp.timestamp()) // 60 * 60
        eid = str(s.entity_id)
        if s.entity_type == "agent":
            if eid not in agent_buckets:
                agent_buckets[eid] = {}
                ag = db.query(Agent).filter(Agent.id == s.entity_id).first()
                agent_info[eid] = {"entity_id": s.entity_id, "name": ag.name if ag else f"Agent#{s.entity_id}", "model_name": ag.model_name if ag else "", "total_tokens": 0, "calls": 0}
            agent_buckets[eid][ts_bucket] = agent_buckets[eid].get(ts_bucket, 0) + s.total_tokens
            agent_info[eid]["total_tokens"] += s.total_tokens
            agent_info[eid]["calls"] += 1
        elif s.entity_type == "workflow":
            if eid not in wf_buckets:
                wf_buckets[eid] = {}
                wf = db.query(Workflow).filter(Workflow.id == s.entity_id).first()
                wf_info[eid] = {"entity_id": s.entity_id, "name": wf.name if wf else f"Workflow#{s.entity_id}", "total_tokens": 0, "calls": 0}
            wf_buckets[eid][ts_bucket] = wf_buckets[eid].get(ts_bucket, 0) + s.total_tokens
            wf_info[eid]["total_tokens"] += s.total_tokens
            wf_info[eid]["calls"] += 1

    for eid, info in agent_info.items():
        if info["calls"] > 0:
            info["avg_tokens"] = round(info["total_tokens"] / info["calls"])
        b = agent_buckets.get(eid, {})
        info["buckets"] = [{"ts": ts, "tokens": v} for ts, v in sorted(b.items())]

    for eid, info in wf_info.items():
        if info["calls"] > 0:
            info["avg_tokens"] = round(info["total_tokens"] / info["calls"])
        b = wf_buckets.get(eid, {})
        info["buckets"] = [{"ts": ts, "tokens": v} for ts, v in sorted(b.items())]
        # 工作流内工具分拆
        tool_rows = db.query(SessionMetric.tool_name, func.sum(SessionMetric.total_tokens).label('tokens'), func.count(SessionMetric.id).label('hits')).filter(
            SessionMetric.entity_type == 'workflow', SessionMetric.entity_id == int(eid),
            SessionMetric.owner_id == project.owner_id, SessionMetric.timestamp >= since,
            SessionMetric.tool_name != '',
        ).group_by(SessionMetric.tool_name).order_by(func.sum(SessionMetric.total_tokens).desc()).all()
        info["tools"] = [{"name": r.tool_name, "tokens": int(r.tokens or 0), "hits": int(r.hits or 0)} for r in tool_rows]

    total_tokens = sum(i["total_tokens"] for i in list(agent_info.values()) + list(wf_info.values()))
    total_calls = sum(i["calls"] for i in list(agent_info.values()) + list(wf_info.values()))

    return {
        "project_id": project_id, "minutes": minutes,
        "total_tokens": total_tokens, "total_calls": total_calls,
        "avg_tokens_per_min": round(total_tokens / max(minutes, 1)),
        "agents": sorted(agent_info.values(), key=lambda x: -x["total_tokens"]),
        "workflows": sorted(wf_info.values(), key=lambda x: -x["total_tokens"]),
    }


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
