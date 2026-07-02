"""GET /api/changes — 活跃 change 列表."""
from fastapi import APIRouter
from scanner import FileScanner

router = APIRouter()
_scanner = FileScanner()


@router.get("/api/changes")
async def list_changes():
    changes = _scanner.scan(force=True)
    alerts = sum(1 for c in changes if c.status in ('interrupted', 'blocked'))
    return {
        "changes": [{
            "id": c.id, "phase": c.phase, "progress": c.progress,
            "status": c.status, "interrupted": c.interrupted,
            "interrupted_task": c.interrupted_task, "artifacts": c.artifacts,
        } for c in changes],
        "total": len(changes),
        "alerts": alerts,
    }
