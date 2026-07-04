"""Agent 编排 API — apply/validate/CRUD/调度队列/模板."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from engine.yaml_schema import validate_yaml
from engine.scheduler import scheduler
from services.template_service import render_template, validate_params
from services.audit_service import log_audit
from models.orchestration import (
    OrchestrationInstance,
    TopologySnapshot,
    OrchestrationTemplate,
    SchedulingQueue,
)
import datetime
import yaml

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


# ── Apply / Validate ──

@router.post("/apply")
def api_apply(payload: dict, request: Request, db: Session = Depends(get_db)):
    """提交 YAML → 校验 → 创建/更新编排实例 + 拓扑快照 → 入调度队列."""
    yaml_raw = payload.get("yaml_raw", "")
    owner_id = _uid(request)

    result = validate_yaml(yaml_raw)
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("errors", [{"message": "YAML 校验失败"}]))

    doc = yaml.safe_load(yaml_raw)
    meta = doc.get("metadata", {})
    spec = doc.get("spec", {})
    name = meta.get("name", "unnamed")
    agents = spec.get("agents", [])

    strategy = spec.get("strategy", {})
    agent_ids = [a.get("spec", {}).get("workflow_id", 0) for a in agents]

    # 检查 name 是否已存在 → 更新
    existing = db.query(OrchestrationInstance).filter(
        OrchestrationInstance.owner_id == owner_id,
        OrchestrationInstance.name == name,
    ).first()

    if existing:
        existing.yaml_raw = yaml_raw
        existing.agent_ids = agent_ids
        existing.priority = strategy.get("priority", 50)
        existing.token_soft_limit = strategy.get("token_soft_limit", 800000)
        existing.token_hard_limit = strategy.get("token_hard_limit", 1000000)
        existing.max_retries = strategy.get("max_retries", 3)
        existing.retry_backoff = strategy.get("retry_backoff", "exponential")
        existing.on_failure = strategy.get("on_failure", "degrade")
        existing.status = "converging"
        existing.transition_status = "updating"
        existing.updated_at = datetime.datetime.utcnow()
        instance = existing
    else:
        instance = OrchestrationInstance(
            owner_id=owner_id,
            name=name,
            yaml_raw=yaml_raw,
            agent_ids=agent_ids,
            priority=strategy.get("priority", 50),
            token_soft_limit=strategy.get("token_soft_limit", 800000),
            token_hard_limit=strategy.get("token_hard_limit", 1000000),
            max_retries=strategy.get("max_retries", 3),
            retry_backoff=strategy.get("retry_backoff", "exponential"),
            on_failure=strategy.get("on_failure", "degrade"),
            status="pending",
        )
        db.add(instance)
        db.flush()

    # 拓扑快照
    snapshot = TopologySnapshot(
        instance_id=instance.id,
        yaml_raw=yaml_raw,
        node_count=len(agents),
        edge_count=len(spec.get("routes", [])),
    )
    db.add(snapshot)

    # 入调度队列
    queue_entry = SchedulingQueue(
        instance_id=instance.id,
        priority=strategy.get("priority", 50),
        status="queued",
        max_wait_until=datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
    )
    db.add(queue_entry)
    db.commit()
    db.refresh(instance)

    log_audit(owner_id, _user(request).get("name", ""), "orchestration.apply", str(instance.id), "orchestration", f"apply '{name}'", "127.0.0.1")

    return {"ok": True, "orchestration_id": instance.id, "status": instance.status}


@router.post("/validate")
def api_validate(payload: dict, request: Request = None):
    """YAML 校验（dry-run 不创建实例）."""
    yaml_raw = payload.get("yaml_raw", "")
    return validate_yaml(yaml_raw)


# ── CRUD ──

@router.get("")
def api_list(request: Request, db: Session = Depends(get_db)):
    """编排实例列表（按 owner 隔离）."""
    owner_id = _uid(request)
    instances = db.query(OrchestrationInstance).filter(
        OrchestrationInstance.owner_id == owner_id
    ).order_by(OrchestrationInstance.updated_at.desc()).all()
    return [
        {
            "id": i.id, "name": i.name, "status": i.status,
            "transition_status": i.transition_status,
            "agent_count": len(i.agent_ids or []),
            "priority": i.priority, "created_at": i.created_at.isoformat(),
        }
        for i in instances
    ]


@router.get("/{instance_id}")
def api_detail(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """编排实例详情 + 拓扑快照."""
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")

    snapshot = db.query(TopologySnapshot).filter(
        TopologySnapshot.instance_id == instance_id
    ).order_by(TopologySnapshot.created_at.desc()).first()

    return {
        "id": inst.id, "name": inst.name, "status": inst.status,
        "transition_status": inst.transition_status,
        "yaml_raw": inst.yaml_raw,
        "agent_ids": inst.agent_ids,
        "priority": inst.priority,
        "token_soft_limit": inst.token_soft_limit,
        "token_hard_limit": inst.token_hard_limit,
        "max_retries": inst.max_retries,
        "retry_backoff": inst.retry_backoff,
        "on_failure": inst.on_failure,
        "snapshot": {
            "node_count": snapshot.node_count if snapshot else 0,
            "edge_count": snapshot.edge_count if snapshot else 0,
            "created_at": snapshot.created_at.isoformat() if snapshot else None,
        } if snapshot else None,
        "created_at": inst.created_at.isoformat(),
        "updated_at": inst.updated_at.isoformat(),
    }


@router.delete("/{instance_id}")
def api_delete(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """删除编排实例（running 状态不可删）."""
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")
    if inst.status == "running":
        raise HTTPException(status_code=400, detail="运行中的编排实例不可删除，请先停止")

    log_audit(_uid(request), _user(request).get("name", ""), "orchestration.delete", str(instance_id), "orchestration", f"delete '{inst.name}'", "127.0.0.1")
    db.delete(inst)
    db.commit()
    return {"ok": True}


# ── Queue ──

@router.get("/queue/list")
def api_queue(request: Request, db: Session = Depends(get_db)):
    """调度队列状态."""
    entries = db.query(SchedulingQueue).filter(
        SchedulingQueue.status.in_(["queued", "scheduled", "executing"])
    ).order_by(SchedulingQueue.priority.desc(), SchedulingQueue.enqueued_at).all()
    return [
        {
            "id": e.id, "instance_id": e.instance_id,
            "priority": e.priority, "status": e.status,
            "enqueued_at": e.enqueued_at.isoformat(),
        }
        for e in entries
    ]


# ── Templates ──

@router.get("/templates")
def api_list_templates(request: Request, db: Session = Depends(get_db)):
    """模板列表（市场：published + 自己的私有模板）."""
    owner_id = _uid(request)
    templates = db.query(OrchestrationTemplate).filter(
        (OrchestrationTemplate.published == True) | (OrchestrationTemplate.owner_id == owner_id)
    ).order_by(OrchestrationTemplate.deploy_count.desc()).all()
    return [
        {
            "id": t.id, "name": t.name, "description": t.description,
            "params": t.params_schema, "published": t.published,
            "deploy_count": t.deploy_count, "owner_id": t.owner_id,
        }
        for t in templates
    ]


@router.post("/templates")
def api_create_template(payload: dict, request: Request, db: Session = Depends(get_db)):
    """保存编排模板."""
    tpl = OrchestrationTemplate(
        owner_id=_uid(request),
        name=payload.get("name", ""),
        description=payload.get("description", ""),
        yaml_raw=payload.get("yaml_raw", ""),
        params_schema=payload.get("params_schema", []),
        published=payload.get("published", False),
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    log_audit(_uid(request), _user(request).get("name", ""), "template.create", str(tpl.id), "template", f"create '{tpl.name}'", "127.0.0.1")
    return {"ok": True, "template_id": tpl.id}


@router.post("/templates/{template_id}/deploy")
def api_deploy_template(template_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """从模板渲染参数 → apply 部署."""
    tpl = db.query(OrchestrationTemplate).filter(OrchestrationTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模板不存在")

    values = payload.get("values", {})
    missing = validate_params(tpl.yaml_raw, values)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少参数: {missing}")

    rendered = render_template(tpl.yaml_raw, values)
    result = api_apply({"yaml_raw": rendered}, request, db)

    tpl.deploy_count += 1
    db.commit()

    log_audit(_uid(request), _user(request).get("name", ""), "orchestration.apply", f"tpl:{template_id}", "template", f"deploy '{tpl.name}'", "127.0.0.1")
    return result
