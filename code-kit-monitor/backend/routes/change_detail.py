"""GET /api/changes/<id> — 单个 change 详情."""
import os
from fastapi import APIRouter, HTTPException
from scanner import FileScanner
from parsers.section import SectionParser
from parsers.task import parse_tasks
from parsers.gate import parse_gates
from config import SPECS_DIR

router = APIRouter()
_scanner = FileScanner()


def _read_artifact(change_dir: str, name: str) -> str | None:
    for fname in os.listdir(change_dir):
        if name.lower() in fname.lower() and fname.endswith('.md'):
            return SectionParser.read_file(os.path.join(change_dir, fname))
    return None


@router.get("/api/changes/{change_id}")
async def get_change(change_id: str):
    info = _scanner.get_change(change_id)
    if not info:
        raise HTTPException(404, f"change '{change_id}' not found")
    change_dir = os.path.join(SPECS_DIR, change_id)
    # 聚合门禁状态
    gates = []
    for artifact in ['CHANGE.md', 'REQUIREMENT.md', 'DESIGN.md', 'UI-DESIGN.md', 'TASK.md', 'TEST.md', 'REVIEW.md']:
        content = _read_artifact(change_dir, artifact)
        if content:
            gates.extend(parse_gates(content))
    # 解析 task 列表
    tasks = []
    task_content = _read_artifact(change_dir, 'TASK.md')
    if task_content:
        tasks = parse_tasks(task_content)
    return {
        "id": info.id, "phase": info.phase, "progress": info.progress,
        "status": info.status, "interrupted": info.interrupted,
        "interrupted_task": info.interrupted_task,
        "artifacts": info.artifacts,
        "gates": [{"name": g['name'], "result": g.get('result', 'pending'), "votes": g['votes']} for g in gates],
        "tasks": tasks,
    }
