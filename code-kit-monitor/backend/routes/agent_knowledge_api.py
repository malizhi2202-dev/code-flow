"""Agent 资料源 + 跨渠道记忆 API."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.knowledge_source import KnowledgeSource, SOURCE_TYPES
from models.agent_memory import AgentMemory, CHANNELS, MEMORY_TYPES
import datetime

router = APIRouter(prefix="/api/agents", tags=["agent-knowledge"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


# ═══════════════════════════════════════════
# 资料源 CRUD
# ═══════════════════════════════════════════

@router.get("/{agent_id}/knowledge-sources")
def list_sources(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """获取 Agent 的所有资料源."""
    owner_id = _uid(request)
    sources = db.query(KnowledgeSource).filter(
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).order_by(KnowledgeSource.created_at.desc()).all()
    return [s.to_dict() for s in sources]


@router.post("/{agent_id}/knowledge-sources")
def create_source(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """为 Agent 添加资料源."""
    owner_id = _uid(request)
    stype = payload.get("source_type", "http_api")
    if stype not in SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的类型: {stype}，支持: {SOURCE_TYPES}")

    ks = KnowledgeSource(
        agent_id=agent_id,
        owner_id=owner_id,
        name=payload.get("name", ""),
        source_type=stype,
        url=payload.get("url", ""),
        config_json=payload.get("config_json", {}),
        enabled=payload.get("enabled", True),
        description=payload.get("description", ""),
    )
    db.add(ks)
    db.commit()
    db.refresh(ks)
    return {"ok": True, "source": ks.to_dict()}


@router.put("/{agent_id}/knowledge-sources/{source_id}")
def update_source(agent_id: int, source_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """更新资料源配置."""
    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")

    for field in ["name", "source_type", "url", "config_json", "enabled", "description"]:
        if field in payload:
            setattr(ks, field, payload[field])
    ks.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(ks)
    return {"ok": True, "source": ks.to_dict()}


@router.delete("/{agent_id}/knowledge-sources/{source_id}")
def delete_source(agent_id: int, source_id: int, request: Request, db: Session = Depends(get_db)):
    """删除资料源."""
    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")
    db.delete(ks)
    db.commit()
    return {"ok": True}


@router.post("/{agent_id}/knowledge-sources/{source_id}/test")
def test_source(agent_id: int, source_id: int, request: Request, db: Session = Depends(get_db)):
    """测试资料源连接."""
    import urllib.request
    import json as _json

    owner_id = _uid(request)
    ks = db.query(KnowledgeSource).filter(
        KnowledgeSource.id == source_id,
        KnowledgeSource.agent_id == agent_id,
        KnowledgeSource.owner_id == owner_id,
    ).first()
    if not ks:
        raise HTTPException(status_code=404, detail="资料源不存在")

    try:
        if ks.source_type in ("http_api", "rag_api", "url_crawl"):
            req = urllib.request.Request(ks.url, method="HEAD")
            cfg = ks.config_json or {}
            if cfg.get("api_key"):
                req.add_header("Authorization", f"Bearer {cfg['api_key']}")
            resp = urllib.request.urlopen(req, timeout=10)
            ok = resp.status < 400
            detail = f"HTTP {resp.status}"
        elif ks.source_type == "redis":
            import redis
            cfg = ks.config_json or {}
            r = redis.Redis.from_url(ks.url, socket_connect_timeout=5)
            r.ping()
            ok = True
            detail = "Redis PONG"
        elif ks.source_type in ("mysql", "postgres"):
            # 只测试 URL 可达性，不实际连接数据库
            from urllib.parse import urlparse
            parsed = urlparse(ks.url)
            ok = bool(parsed.scheme and parsed.hostname)
            detail = f"URL 格式校验通过: {parsed.scheme}://{parsed.hostname}"
        else:
            ok = True
            detail = "URL 格式校验通过"

    except Exception as e:
        ok = False
        detail = str(e)[:200]

    ks.last_test_at = datetime.datetime.utcnow()
    ks.last_test_ok = ok
    db.commit()
    return {"ok": ok, "detail": detail}


# ═══════════════════════════════════════════
# 跨渠道记忆 CRUD
# ═══════════════════════════════════════════

@router.get("/{agent_id}/memory")
def list_memories(
    agent_id: int,
    request: Request,
    db: Session = Depends(get_db),
    channel: str | None = None,
    session_id: str | None = None,
    memory_type: str | None = None,
    key: str | None = None,
    limit: int = 50,
):
    """获取 Agent 的记忆列表，支持按渠道/会话/类型/key 过滤."""
    owner_id = _uid(request)
    q = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    )
    if channel:
        q = q.filter(AgentMemory.channel == channel)
    if session_id:
        q = q.filter(AgentMemory.session_id == session_id)
    if memory_type:
        q = q.filter(AgentMemory.memory_type == memory_type)
    if key:
        q = q.filter(AgentMemory.key == key)

    # 清理已过期记忆
    now = datetime.datetime.utcnow()
    expired = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.expires_at.isnot(None),
        AgentMemory.expires_at < now,
    ).all()
    for e in expired:
        db.delete(e)
    if expired:
        db.commit()

    memories = q.order_by(AgentMemory.priority.desc(), AgentMemory.updated_at.desc()).limit(limit).all()
    return [m.to_dict() for m in memories]


@router.post("/{agent_id}/memory")
def upsert_memory(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """写入或更新 Agent 记忆（按 agent_id + key 去重，upsert 模式）."""
    import json as _json

    owner_id = _uid(request)
    channel = payload.get("channel", "web")
    if channel not in CHANNELS:
        raise HTTPException(status_code=400, detail=f"不支持的渠道: {channel}，支持: {CHANNELS}")

    mtype = payload.get("memory_type", "fact")
    if mtype not in MEMORY_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的类型: {mtype}，支持: {MEMORY_TYPES}")

    key = payload.get("key", "")
    if not key:
        raise HTTPException(status_code=400, detail="key 不能为空")

    value = payload["value"] if isinstance(payload["value"], str) else _json.dumps(payload["value"], ensure_ascii=False)
    ttl = payload.get("ttl_seconds")

    # upsert: 同 agent + key 去重
    existing = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
        AgentMemory.key == key,
    ).first()

    if existing:
        existing.value = value
        existing.channel = channel
        existing.memory_type = mtype
        existing.priority = payload.get("priority", existing.priority)
        existing.ttl_seconds = ttl
        existing.expires_at = (datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)) if ttl else None
        existing.session_id = payload.get("session_id", existing.session_id)
        existing.updated_at = datetime.datetime.utcnow()
        mem = existing
    else:
        mem = AgentMemory(
            agent_id=agent_id,
            owner_id=owner_id,
            channel=channel,
            session_id=payload.get("session_id"),
            key=key,
            value=value,
            memory_type=mtype,
            priority=payload.get("priority", 5),
            ttl_seconds=ttl,
            expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)) if ttl else None,
        )
        db.add(mem)

    db.commit()
    db.refresh(mem)
    return {"ok": True, "memory": mem.to_dict()}


@router.delete("/{agent_id}/memory/{memory_id}")
def delete_memory(agent_id: int, memory_id: int, request: Request, db: Session = Depends(get_db)):
    """删除指定记忆."""
    owner_id = _uid(request)
    mem = db.query(AgentMemory).filter(
        AgentMemory.id == memory_id,
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="记忆不存在")
    db.delete(mem)
    db.commit()
    return {"ok": True}


@router.get("/{agent_id}/memory/channels")
def memory_channels(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """获取该 Agent 的跨渠道记忆统计."""
    owner_id = _uid(request)
    memories = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    ).all()
    stats = {}
    for m in memories:
        ch = m.channel
        if ch not in stats:
            stats[ch] = {"total": 0, "types": {}}
        stats[ch]["total"] += 1
        stats[ch]["types"][m.memory_type] = stats[ch]["types"].get(m.memory_type, 0) + 1
    return {"agent_id": agent_id, "channels": stats, "total": len(memories)}


@router.post("/{agent_id}/memory/search")
def search_memory(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """跨渠道语义搜索记忆（简易版：key/type 匹配 + 全文 LIKE）."""
    import json as _json

    owner_id = _uid(request)
    q_text = payload.get("query", "")
    channel = payload.get("channel")
    mtype = payload.get("memory_type")
    limit = payload.get("limit", 10)

    q = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.owner_id == owner_id,
    )
    if channel:
        q = q.filter(AgentMemory.channel == channel)
    if mtype:
        q = q.filter(AgentMemory.memory_type == mtype)
    if q_text:
        q = q.filter(
            (AgentMemory.key.contains(q_text)) | (AgentMemory.value.contains(q_text))
        )

    # 清理过期
    now = datetime.datetime.utcnow()
    db.query(AgentMemory).filter(
        AgentMemory.expires_at.isnot(None),
        AgentMemory.expires_at < now,
    ).delete()
    db.commit()

    results = q.order_by(AgentMemory.priority.desc()).limit(limit).all()
    return {
        "query": q_text,
        "results": [m.to_dict() for m in results],
        "total": len(results),
    }
