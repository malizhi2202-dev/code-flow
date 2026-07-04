"""Reconcile Loop 引擎 — 后台持续监控编排实例状态，自愈/重试/漂移检测."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


async def reconcile_loop(sleep_seconds: int = 5):
    """后台 reconcile 循环（asyncio 任务）.

    FastAPI startup 事件中注册:
        asyncio.create_task(reconcile_loop())
    """
    logger.info("reconcile loop started (interval=%ds)", sleep_seconds)
    while True:
        try:
            await _reconcile_all()
        except Exception:
            logger.exception("reconcile loop iteration failed — continuing")
        await asyncio.sleep(sleep_seconds)


async def _reconcile_all():
    """遍历所有活跃编排实例，逐实例 reconcile."""
    from database import SessionLocal
    from models.orchestration import OrchestrationInstance

    db = SessionLocal()
    try:
        instances = (
            db.query(OrchestrationInstance)
            .filter(OrchestrationInstance.status.in_(["running", "degraded", "converging"]))
            .all()
        )
        for inst in instances:
            try:
                await _reconcile_instance(db, inst)
            except Exception:
                logger.exception("reconcile failed for instance %d", inst.id)
        db.commit()
    finally:
        db.close()


async def _reconcile_instance(db, inst) -> None:
    """对单个编排实例执行 observe → diff → reconcile."""
    from models.orchestration import TopologySnapshot

    snapshot = (
        db.query(TopologySnapshot)
        .filter(TopologySnapshot.instance_id == inst.id)
        .order_by(TopologySnapshot.created_at.desc())
        .first()
    )
    if not snapshot:
        return

    desired = _parse_desired_state(snapshot.yaml_raw)
    actual = await _observe_actual_state(db, inst)
    diffs = compare_states(desired, actual)

    if not diffs:
        return

    for diff in diffs:
        await _reconcile_action(db, inst, diff)


def _parse_desired_state(yaml_raw: str) -> dict:
    """解析拓扑快照中的期望状态."""
    import yaml
    try:
        doc = yaml.safe_load(yaml_raw)
        agents = doc.get("spec", {}).get("agents", [])
        return {"agents": [{"name": a["name"], "status": "running"} for a in agents]}
    except Exception:
        return {"agents": []}


async def _observe_actual_state(db, inst) -> dict:
    """查询 Agent 实际运行状态."""
    from models.agent import Agent
    agent_ids = inst.agent_ids or []
    agents = db.query(Agent).filter(Agent.id.in_(agent_ids)).all() if agent_ids else []
    return {
        "agents": [
            {"name": a.name, "status": a.status or "unknown", "id": a.id}
            for a in agents
        ]
    }


def compare_states(desired: dict, actual: dict) -> list[dict]:
    """对比期望 vs 实际状态，返回差异列表.

    Returns:
        [{"agent": str, "type": "crashed"|"status_mismatch"|"missing"|"drift", "expected": str, "actual": str}]
    """
    diffs: list[dict] = []
    desired_agents = {a["name"]: a for a in desired.get("agents", [])}
    actual_agents = {a["name"]: a for a in actual.get("agents", [])}

    for name, d in desired_agents.items():
        a = actual_agents.get(name)
        if a is None:
            diffs.append({"agent": name, "type": "missing", "expected": "running", "actual": "not_found"})
        elif a["status"] == "crashed" or a["status"] == "error":
            diffs.append({"agent": name, "type": "crashed", "expected": "running", "actual": a["status"]})
        elif a["status"] != "running" and a["status"] != "standby":
            diffs.append({"agent": name, "type": "status_mismatch", "expected": "running", "actual": a["status"]})

    # 反向检查：实际有多余的 agent（可能手动添加 → 漂移）
    for name, a in actual_agents.items():
        if name not in desired_agents:
            diffs.append({"agent": name, "type": "drift", "expected": "absent", "actual": a["status"]})

    return diffs


async def _reconcile_action(db, inst, diff: dict) -> None:
    """执行 reconcile 动作."""
    agent_name = diff["agent"]
    diff_type = diff["type"]

    if diff_type == "crashed":
        logger.warning("reconcile: agent '%s' crashed → marking degraded, auto-restart needed", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"agent:{agent_name}:restarting"
        _write_audit(db, inst, "reconcile.auto_restart", f"Agent '{agent_name}' crashed, auto-restart triggered")

    elif diff_type == "missing":
        logger.warning("reconcile: agent '%s' missing from runtime → marking degraded", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"agent:{agent_name}:missing"
        _write_audit(db, inst, "reconcile.auto_restart", f"Agent '{agent_name}' not found, attempting restart")

    elif diff_type == "status_mismatch":
        logger.info("reconcile: agent '%s' status mismatch (%s vs %s) — monitoring", agent_name, diff["expected"], diff["actual"])
        # 不立即修复，等待下一轮确认

    elif diff_type == "drift":
        logger.warning("reconcile: drift detected — agent '%s' not in desired topology", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"drift:{agent_name}"
        _write_audit(db, inst, "reconcile.drift_detected", f"Unexpected agent '{agent_name}' found, possible manual modification")


def _write_audit(db, inst, action: str, detail: str) -> None:
    """写入审计日志."""
    try:
        from services.audit_service import log_audit
        log_audit(
            user_id=inst.owner_id,
            user_name="system",
            action=action,
            target=str(inst.id),
            target_type="orchestration_instance",
            detail=detail,
            ip="127.0.0.1",
            result="success",
        )
    except Exception:
        logger.exception("audit write failed for reconcile action")
