"""快照服务 — 工具版本冻结与恢复."""
import json
import zlib
from sqlalchemy.orm import Session
from models.workflow import Workflow, WorkflowSnapshot
from models.tool import Tool


def create_snapshot(db: Session, workflow: Workflow) -> WorkflowSnapshot:
    tool_ids = []
    for node in (workflow.spec_json or {}).get("nodes", []):
        tid = node.get("tool_id")
        if tid:
            tool_ids.append(tid)
    tools = db.query(Tool).filter(Tool.id.in_(tool_ids)).all() if tool_ids else []
    snapshot_data = {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "tools": [t.to_dict() for t in tools],
    }
    compressed = json.dumps(snapshot_data)
    latest = db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow.id).order_by(WorkflowSnapshot.version.desc()).first()
    version = (latest.version + 1) if latest else 1
    snapshot = WorkflowSnapshot(workflow_id=workflow.id, tool_snapshots_json={"data": compressed, "tool_count": len(tools)}, version=version)
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    _cleanup_old(db, workflow.id, keep=5)
    return snapshot


def get_latest_snapshot(db: Session, workflow_id: int) -> WorkflowSnapshot | None:
    return db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow_id).order_by(WorkflowSnapshot.version.desc()).first()


def _cleanup_old(db: Session, workflow_id: int, keep: int = 5):
    old = db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow_id).order_by(WorkflowSnapshot.version.desc()).offset(keep).all()
    for s in old:
        db.delete(s)
    db.commit()
