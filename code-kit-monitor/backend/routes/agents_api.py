"""Agent API 路由 — CRUD + 执行."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.agent import Agent
from services.encryption_service import encrypt
from services.audit_service import log_audit

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _user(request: Request) -> dict:
    return request.state.user


def _filter_owner(q, user: dict):
    if user.get("role") != "admin":
        q = q.filter(Agent.owner_id == user["id"])
    return q


@router.get("")
def api_list_agents(status: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Agent), _user(request))
    if status:
        q = q.filter(Agent.status == status)
    agents = q.order_by(Agent.updated_at.desc()).all()
    return {"agents": [a.to_dict() for a in agents], "total": len(agents)}


@router.post("")
def api_create_agent(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    api_key = payload.get("api_key", "") or "not_set"
    agent = Agent(owner_id=user["id"], name=payload["name"], description=payload.get("description", ""), runtime=payload.get("runtime", "langgraph"), model_provider=payload.get("model_provider", "openai"), model_name=payload.get("model_name", ""), model_config_json=payload.get("model_config_json", {}), api_key_encrypted=encrypt(api_key), workflow_id=payload.get("workflow_id"), token_soft_limit=payload.get("token_soft_limit", 800000), token_hard_limit=payload.get("token_hard_limit", 1000000))
    db.add(agent)
    db.commit()
    db.refresh(agent)
    log_audit(user["id"], user.get("name", user["id"]), "agent.create", agent.name, "agent", "created", request.client.host if request.client else "127.0.0.1")
    return agent.to_dict()


@router.get("/{agent_id}")
def api_get_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), _user(request))
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    d = a.to_dict()
    if a.workflow_id:
        from models.workflow import Workflow
        wf = db.query(Workflow).filter(Workflow.id == a.workflow_id).first()
        if wf:
            d["workflow_summary"] = {"name": wf.name, "node_count": len((wf.spec_json or {}).get("nodes", [])), "status": wf.status}
    return d


@router.put("/{agent_id}")
def api_update_agent(agent_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    for f in ("name", "description", "model_provider", "model_name", "model_config_json", "workflow_id", "token_soft_limit", "token_hard_limit"):
        if f in payload:
            setattr(a, f, payload[f])
    if "api_key" in payload and payload["api_key"]:
        a.api_key_encrypted = encrypt(payload["api_key"])
    db.commit()
    db.refresh(a)
    log_audit(user["id"], user.get("name", user["id"]), "agent.update", a.name, "agent", "updated", request.client.host if request.client else "127.0.0.1")
    return a.to_dict()


@router.delete("/{agent_id}")
def api_delete_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    if a.status == "running":
        raise HTTPException(status_code=400, detail="运行中 Agent 不可删除")
    db.delete(a)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "agent.delete", a.name, "agent", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted"}


@router.post("/{agent_id}/run")
def api_run_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    if a.total_tokens_used >= a.token_hard_limit:
        raise HTTPException(status_code=400, detail=f"Token 已达硬限制 ({a.token_hard_limit})")
    a.status = "running"
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "agent.run", a.name, "agent", "started", request.client.host if request.client else "127.0.0.1")
    return {"status": "running", "agent_id": a.id, "runtime": a.runtime, "model": a.model_name}


@router.post("/{agent_id}/stop")
def api_stop_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    a.status = "standby"
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "agent.stop", a.name, "agent", "stopped", request.client.host if request.client else "127.0.0.1")
    return {"status": "stopped"}
